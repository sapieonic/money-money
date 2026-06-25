import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { DailyExpense } from '../models/DailyExpense';
import { User } from '../models/User';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';
import { generateWeeklyAnalytics } from '../services/analytics';
import {
  sendWeeklyExpenseSummary,
  generateWeeklyExpenseEmailHTML,
  generateWeeklyExpenseEmailText,
} from '../services/email';
import { generateWeeklyInsight } from '../services/llm/weeklyInsight';
import { logger } from '../utils/telemetry';

// GET /api/daily-expenses - Get all with optional date range filtering and pagination
export const getAll = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const { startDate, endDate, category, page: pageStr, limit: limitStr } = event.queryStringParameters || {};

    // Pagination
    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(limitStr || '50', 10)));
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {
      userId: event.userId,
      isActive: true,
    };

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        (query.date as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end of day for endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (query.date as Record<string, Date>).$lte = end;
      }
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    const [items, total] = await Promise.all([
      DailyExpense.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      DailyExpense.countDocuments(query),
    ]);

    return success({
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    });
  } catch (err) {
    logger.error('Error fetching daily expenses', { error: String(err) });
    return error('Failed to fetch daily expenses');
  }
});

// GET /api/daily-expenses/summary - Get summary statistics
export const getSummary = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayExpenses, monthExpenses, categoryBreakdown] = await Promise.all([
      // Today's total
      DailyExpense.aggregate([
        {
          $match: {
            userId: event.userId,
            isActive: true,
            date: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // This month's total
      DailyExpense.aggregate([
        {
          $match: {
            userId: event.userId,
            isActive: true,
            date: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Category breakdown for current month
      DailyExpense.aggregate([
        {
          $match: {
            userId: event.userId,
            isActive: true,
            date: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return success({
      today: todayExpenses[0]?.total || 0,
      thisMonth: monthExpenses[0]?.total || 0,
      categoryBreakdown: categoryBreakdown.map((item) => ({
        category: item._id,
        total: item.total,
        count: item.count,
      })),
    });
  } catch (err) {
    logger.error('Error fetching daily expense summary', { error: String(err) });
    return error('Failed to fetch daily expense summary');
  }
});

// GET /api/daily-expenses/projection - Year-end spend projection from tracked daily spending
export const getProjection = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const now = new Date();
    // Work entirely in UTC so the $month bucketing below (which is always UTC
    // unless a timezone is given) stays consistent with currentMonth/daysElapsed
    // regardless of the host timezone. In the deployed Lambda the host is UTC
    // anyway; this also keeps local dev (e.g. serverless-offline in IST) correct.
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));

    // Sum tracked daily spend bucketed by calendar month (UTC) for the current
    // year, up to now — future-dated entries are not "spent so far" and must
    // not count toward the cumulative total or the run-rate.
    const monthlyAgg = await DailyExpense.aggregate([
      {
        $match: {
          userId: event.userId,
          isActive: true,
          date: { $gte: startOfYear, $lte: now },
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthMap = new Map<number, number>();
    monthlyAgg.forEach((m) => monthMap.set(m._id, m.total));

    const currentMonth = now.getUTCMonth() + 1;

    // Cumulative actual spend through each elapsed month (Jan..current).
    const monthly: { month: number; spend: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let m = 1; m <= currentMonth; m += 1) {
      const spend = monthMap.get(m) || 0;
      cumulative += spend;
      monthly.push({ month: m, spend, cumulative });
    }
    const spentSoFar = cumulative;

    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const daysInYear = isLeap ? 366 : 365;
    // Day-of-year, counting today as day 1, so the run-rate denominator pairs
    // with month-to-date spend that already includes today.
    const daysElapsed = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const daysRemaining = Math.max(0, daysInYear - daysElapsed);
    const dailyRunRate = daysElapsed > 0 ? spentSoFar / daysElapsed : 0;

    // Widen the low/high band by how volatile completed months have been
    // (coefficient of variation), clamped to a sensible range. Only months
    // that actually had spend count — leading months before the user started
    // tracking would otherwise skew volatility upward.
    const completed = monthly
      .filter((m) => m.month < currentMonth && m.spend > 0)
      .map((m) => m.spend);
    let cov = 0.15;
    if (completed.length >= 2) {
      const mean = completed.reduce((a, b) => a + b, 0) / completed.length;
      if (mean > 0) {
        const variance =
          completed.reduce((a, b) => a + (b - mean) ** 2, 0) / completed.length;
        cov = Math.sqrt(variance) / mean;
      }
    }
    cov = Math.min(0.3, Math.max(0.08, cov));

    const projectRemainder = (rate: number) => spentSoFar + rate * daysRemaining;

    return success({
      year,
      currentMonth,
      daysElapsed,
      daysInYear,
      daysRemaining,
      spentSoFar,
      dailyRunRate,
      monthly,
      projection: {
        low: projectRemainder(dailyRunRate * (1 - cov)),
        mid: projectRemainder(dailyRunRate),
        high: projectRemainder(dailyRunRate * (1 + cov)),
      },
    });
  } catch (err) {
    logger.error('Error building spend projection', { error: String(err) });
    return error('Failed to build spend projection');
  }
});

// POST /api/daily-expenses - Create new daily expense
export const create = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');

    if (!body.description || body.amount === undefined) {
      return badRequest('Description and amount are required');
    }

    const expense = await DailyExpense.create({
      userId: event.userId,
      amount: body.amount,
      description: body.description,
      vendor: body.vendor || '',
      category: body.category || 'other',
      date: body.date ? new Date(body.date) : new Date(),
      currency: body.currency || 'INR',
      isActive: true,
    });

    return success(expense, 201);
  } catch (err) {
    logger.error('Error creating daily expense', { error: String(err) });
    return error('Failed to create daily expense');
  }
});

// PUT /api/daily-expenses/{id} - Update daily expense
export const update = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Daily expense ID is required');
    }

    const expense = await DailyExpense.findOneAndUpdate(
      { _id: id, userId: event.userId },
      {
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.description && { description: body.description }),
        ...(body.vendor !== undefined && { vendor: body.vendor }),
        ...(body.category && { category: body.category }),
        ...(body.date && { date: new Date(body.date) }),
        ...(body.currency && { currency: body.currency }),
      },
      { new: true }
    );

    if (!expense) {
      return notFound('Daily expense not found');
    }

    return success(expense);
  } catch (err) {
    logger.error('Error updating daily expense', { error: String(err) });
    return error('Failed to update daily expense');
  }
});

// DELETE /api/daily-expenses/{id} - Soft delete daily expense
export const remove = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;

    if (!id) {
      return badRequest('Daily expense ID is required');
    }

    const expense = await DailyExpense.findOneAndUpdate(
      { _id: id, userId: event.userId },
      { isActive: false },
      { new: true }
    );

    if (!expense) {
      return notFound('Daily expense not found');
    }

    return success({ message: 'Daily expense deleted successfully' });
  } catch (err) {
    logger.error('Error deleting daily expense', { error: String(err) });
    return error('Failed to delete daily expense');
  }
});

// GET /api/daily-expenses/weekly-analytics - Get current week analytics
export const getWeeklyAnalytics = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const analytics = await generateWeeklyAnalytics(event.userId!, new Date());

    return success(analytics);
  } catch (err) {
    logger.error('Error fetching weekly analytics', { error: String(err) });
    return error('Failed to fetch weekly analytics');
  }
});

// POST /api/daily-expenses/send-weekly-summary - Send weekly summary email
export const sendWeeklySummaryEmail = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    // Get user info
    const user = await User.findOne({ firebaseUid: event.userId });
    if (!user) {
      return notFound('User not found');
    }

    // Generate analytics for current week
    const analytics = await generateWeeklyAnalytics(event.userId!, new Date());

    if (analytics.transactionCount === 0) {
      return badRequest('No expenses found for this week');
    }

    // Generate AI insight and email content
    const aiInsight = await generateWeeklyInsight(analytics, user.name);
    const htmlBody = generateWeeklyExpenseEmailHTML(analytics, user.name, aiInsight);
    const textBody = generateWeeklyExpenseEmailText(analytics, user.name, aiInsight);
    const subject = `📊 Your Weekly Expense Summary (${analytics.weekStart} - ${analytics.weekEnd})`;

    // Send email
    const emailSent = await sendWeeklyExpenseSummary(
      user.email,
      subject,
      htmlBody,
      textBody
    );

    if (!emailSent) {
      return error('Failed to send email. Please check email configuration.');
    }

    return success({
      message: 'Weekly summary email sent successfully',
      sentTo: user.email,
      weekStart: analytics.weekStart,
      weekEnd: analytics.weekEnd,
    });
  } catch (err) {
    logger.error('Error sending weekly summary email', { error: String(err) });
    return error('Failed to send weekly summary email');
  }
});
