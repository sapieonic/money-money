import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { DailyExpense } from '../models/DailyExpense';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';

// GET /api/daily-expenses - Get all with optional date range filtering
export const getAll = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const { startDate, endDate, category } = event.queryStringParameters || {};

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

    const expenses = await DailyExpense.find(query).sort({ date: -1, createdAt: -1 });

    return success(expenses);
  } catch (err) {
    console.error('Error fetching daily expenses:', err);
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
    console.error('Error fetching daily expense summary:', err);
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
    console.error('Error creating daily expense:', err);
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
    console.error('Error updating daily expense:', err);
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
    console.error('Error deleting daily expense:', err);
    return error('Failed to delete daily expense');
  }
});
