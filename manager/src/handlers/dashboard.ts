import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { Income, IIncome } from '../models/Income';
import { Expense } from '../models/Expense';
import { DailyExpense } from '../models/DailyExpense';
import { Investment } from '../models/Investment';
import { Asset } from '../models/Asset';
import { MonthlyLedger } from '../models/MonthlyLedger';
import { Snapshot } from '../models/Snapshot';
import { User } from '../models/User';
import { success, error } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent, DashboardSummary } from '../types';
import { logger } from '../utils/telemetry';

export const get = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const userId = event.userId;

    // Calculate date ranges for daily expenses
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Check for monthly ledger for current month
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Fetch all active data in parallel
    const [incomes, expenses, investments, assets, user, ledger, dailyExpensesTodayResult, dailyExpensesMonthResult] = await Promise.all([
      Income.find({ userId, isActive: true }),
      Expense.find({ userId, isActive: true }),
      Investment.find({ userId, status: 'active' }),
      Asset.find({ userId, isSold: false }),
      User.findOne({ firebaseUid: userId }),
      MonthlyLedger.findOne({ userId, month: currentMonth }),
      DailyExpense.aggregate([
        { $match: { userId, isActive: true, date: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      DailyExpense.aggregate([
        { $match: { userId, isActive: true, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Get exchange rate from user settings
    const exchangeRate = user?.settings?.exchangeRates?.USD || 89;

    // Helper to get income in INR (RSU may be stored in USD)
    const getIncomeINR = (inc: { type: string; currency: string; amount: number }) => {
      if (inc.type === 'rsu_vesting' && inc.currency === 'USD') {
        return inc.amount * exchangeRate;
      }
      return inc.amount;
    };

    // Use ledger data for current month if available, otherwise use templates
    const effectiveIncomes = ledger ? ledger.incomes : incomes;
    const effectiveExpenses = ledger ? ledger.expenses : expenses;
    const effectiveInvestments = ledger ? ledger.investments : investments;

    // Calculate totals
    const totalIncome = effectiveIncomes.reduce((sum: number, inc: any) => sum + getIncomeINR(inc), 0);
    const totalExpenses = effectiveExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const totalSIPs = effectiveInvestments
      .filter((inv: any) => inv.type === 'sip')
      .reduce((sum: number, inv: any) => sum + inv.amount, 0);
    const totalVoluntaryInvestments = effectiveInvestments
      .filter((inv: any) => inv.type === 'voluntary')
      .reduce((sum: number, inv: any) => sum + inv.amount, 0);

    const totalAssetValueINR = assets.reduce((sum, asset) => sum + asset.currentValueINR, 0);
    const totalAssetValueUSD = assets.reduce((sum, asset) => sum + (asset.currentValueUSD || 0), 0);

    const dailyExpensesToday = dailyExpensesTodayResult[0]?.total || 0;
    const dailyExpensesThisMonth = dailyExpensesMonthResult[0]?.total || 0;

    const remaining = totalIncome - totalExpenses - totalSIPs - totalVoluntaryInvestments - dailyExpensesThisMonth;

    const summary: DashboardSummary = {
      totalIncome,
      totalExpenses,
      totalSIPs,
      totalVoluntaryInvestments,
      remaining,
      totalAssetValueINR,
      totalAssetValueUSD,
      dailyExpensesToday,
      dailyExpensesThisMonth,
    };

    // Return summary along with detailed data (use ledger data when available)
    return success({
      summary,
      incomes: effectiveIncomes,
      expenses: effectiveExpenses,
      investments: effectiveInvestments,
      assets,
    });
  } catch (err) {
    logger.error('Error fetching dashboard', { error: String(err) });
    return error('Failed to fetch dashboard data');
  }
});

export const getSnapshots = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const limit = parseInt(event.queryStringParameters?.limit || '12', 10);

    const snapshots = await Snapshot.find({ userId: event.userId })
      .sort({ month: -1 })
      .limit(limit);

    return success(snapshots);
  } catch (err) {
    logger.error('Error fetching snapshots', { error: String(err) });
    return error('Failed to fetch snapshots');
  }
});

// Helper function to create monthly snapshot (can be called by a scheduled Lambda)
export const createSnapshot = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const userId = event.userId;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Fetch all data
    const [incomes, expenses, investments, assets, user] = await Promise.all([
      Income.find({ userId, isActive: true }),
      Expense.find({ userId, isActive: true }),
      Investment.find({ userId, status: 'active' }),
      Asset.find({ userId, isSold: false }),
      User.findOne({ firebaseUid: userId }),
    ]);

    // Get exchange rate from user settings
    const exchangeRate = user?.settings?.exchangeRates?.USD || 89;

    // Helper to get income in INR (RSU may be stored in USD)
    const getIncomeINR = (inc: IIncome) => {
      if (inc.type === 'rsu_vesting' && inc.currency === 'USD') {
        return inc.amount * exchangeRate;
      }
      return inc.amount;
    };

    const totalIncome = incomes.reduce((sum, inc) => sum + getIncomeINR(inc), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalSIPs = investments
      .filter((inv) => inv.type === 'sip')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalVoluntaryInvestments = investments
      .filter((inv) => inv.type === 'voluntary')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const remaining = totalIncome - totalExpenses - totalSIPs - totalVoluntaryInvestments;
    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.currentValueINR, 0);

    const snapshot = await Snapshot.findOneAndUpdate(
      { userId, month },
      {
        totalIncome,
        totalExpenses,
        totalSIPs,
        totalVoluntaryInvestments,
        remaining,
        totalAssetValue,
      },
      { upsert: true, new: true }
    );

    return success(snapshot, 201);
  } catch (err) {
    logger.error('Error creating snapshot', { error: String(err) });
    return error('Failed to create snapshot');
  }
});
