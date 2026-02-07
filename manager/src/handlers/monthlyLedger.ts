import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { MonthlyLedger } from '../models/MonthlyLedger';
import { Income } from '../models/Income';
import { Expense } from '../models/Expense';
import { Investment } from '../models/Investment';
import { DailyExpense } from '../models/DailyExpense';
import { success, error, badRequest, notFound } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';
import { logger } from '../utils/telemetry';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export const getOrCreate = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const userId = event.userId;
    const month = event.queryStringParameters?.month;

    if (!month || !MONTH_REGEX.test(month)) {
      return badRequest('Valid month parameter is required (YYYY-MM)');
    }

    let ledger = await MonthlyLedger.findOne({ userId, month });

    if (!ledger) {
      const [incomes, expenses, investments] = await Promise.all([
        Income.find({ userId, isActive: true }),
        Expense.find({ userId, isActive: true }),
        Investment.find({ userId, status: 'active' }),
      ]);

      ledger = await MonthlyLedger.create({
        userId,
        month,
        status: 'draft',
        incomes: incomes.map((inc) => ({
          sourceId: inc._id,
          name: inc.name,
          amount: inc.amount,
          preTaxAmount: inc.preTaxAmount,
          postTaxAmount: inc.postTaxAmount,
          taxPaid: inc.taxPaid,
          currency: inc.currency,
          type: inc.type,
          units: inc.units,
          unitPrice: inc.unitPrice,
          vestPeriod: inc.vestPeriod,
        })),
        expenses: expenses.map((exp) => ({
          sourceId: exp._id,
          name: exp.name,
          amount: exp.amount,
          currency: exp.currency,
          category: exp.category,
          isRecurring: exp.isRecurring,
        })),
        investments: investments.map((inv) => ({
          sourceId: inv._id,
          name: inv.name,
          type: inv.type,
          amount: inv.amount,
          currency: inv.currency,
          platform: inv.platform,
          category: inv.category,
          status: inv.status,
        })),
      });
    }

    // Aggregate daily expenses for the month
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const startOfNextMonth = new Date(year, monthNum, 1);

    const dailyExpensesResult = await DailyExpense.aggregate([
      {
        $match: {
          userId,
          isActive: true,
          date: { $gte: startOfMonth, $lt: startOfNextMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const dailyExpensesTotal = dailyExpensesResult[0]?.total || 0;

    return success({ ledger, dailyExpensesTotal });
  } catch (err) {
    logger.error('Error fetching/creating monthly ledger', { error: String(err) });
    return error('Failed to fetch monthly ledger');
  }
});

export const addItem = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const userId = event.userId;
    const month = event.pathParameters?.month;
    const body = JSON.parse(event.body || '{}');

    if (!month || !MONTH_REGEX.test(month)) {
      return badRequest('Valid month parameter is required (YYYY-MM)');
    }

    const { section, ...itemData } = body;

    if (!section || !['incomes', 'expenses', 'investments'].includes(section)) {
      return badRequest('Valid section is required (incomes, expenses, investments)');
    }

    if (!itemData.name || itemData.amount === undefined) {
      return badRequest('Name and amount are required');
    }

    const ledger = await MonthlyLedger.findOneAndUpdate(
      { userId, month },
      { $push: { [section]: { ...itemData, sourceId: null } } },
      { new: true }
    );

    if (!ledger) {
      return notFound('Monthly ledger not found');
    }

    return success(ledger, 201);
  } catch (err) {
    logger.error('Error adding ledger item', { error: String(err) });
    return error('Failed to add ledger item');
  }
});

export const updateItem = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const userId = event.userId;
    const month = event.pathParameters?.month;
    const itemId = event.pathParameters?.itemId;
    const body = JSON.parse(event.body || '{}');

    if (!month || !MONTH_REGEX.test(month)) {
      return badRequest('Valid month parameter is required (YYYY-MM)');
    }

    if (!itemId) {
      return badRequest('Item ID is required');
    }

    const { section, ...fieldUpdates } = body;

    if (!section || !['incomes', 'expenses', 'investments'].includes(section)) {
      return badRequest('Valid section is required (incomes, expenses, investments)');
    }

    // Build the $set object with positional operator
    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fieldUpdates)) {
      setFields[`${section}.$[elem].${key}`] = value;
    }

    const ledger = await MonthlyLedger.findOneAndUpdate(
      { userId, month },
      { $set: setFields },
      {
        new: true,
        arrayFilters: [{ 'elem._id': itemId }],
      }
    );

    if (!ledger) {
      return notFound('Monthly ledger not found');
    }

    return success(ledger);
  } catch (err) {
    logger.error('Error updating ledger item', { error: String(err) });
    return error('Failed to update ledger item');
  }
});

export const removeItem = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const userId = event.userId;
    const month = event.pathParameters?.month;
    const itemId = event.pathParameters?.itemId;
    const section = event.queryStringParameters?.section;

    if (!month || !MONTH_REGEX.test(month)) {
      return badRequest('Valid month parameter is required (YYYY-MM)');
    }

    if (!itemId) {
      return badRequest('Item ID is required');
    }

    if (!section || !['incomes', 'expenses', 'investments'].includes(section)) {
      return badRequest('Valid section query parameter is required (incomes, expenses, investments)');
    }

    const ledger = await MonthlyLedger.findOneAndUpdate(
      { userId, month },
      { $pull: { [section]: { _id: itemId } } },
      { new: true }
    );

    if (!ledger) {
      return notFound('Monthly ledger not found');
    }

    return success(ledger);
  } catch (err) {
    logger.error('Error removing ledger item', { error: String(err) });
    return error('Failed to remove ledger item');
  }
});
