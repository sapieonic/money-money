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

    // Generate email content
    const htmlBody = generateWeeklyExpenseEmailHTML(analytics, user.name);
    const textBody = generateWeeklyExpenseEmailText(analytics, user.name);
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
