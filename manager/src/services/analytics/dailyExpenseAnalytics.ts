/**
 * Daily Expense Analytics Service
 * Gathers expense data for today and yesterday for AI-powered daily digest
 */

import { DailyExpense } from '../../models/DailyExpense';
import { DailyExpenseCategory } from '../../types';

export interface DailyExpenseDigestData {
  // Today
  date: string;
  dayName: string;
  totalSpent: number;
  transactionCount: number;
  expenses: { description: string; vendor: string; amount: number; category: string }[];
  categoryBreakdown: { category: string; total: number; count: number }[];
  topVendor: string | null;

  // Yesterday (for comparison)
  yesterday: {
    date: string;
    totalSpent: number;
    transactionCount: number;
    categoryBreakdown: { category: string; total: number; count: number }[];
  } | null;

  // Month context
  monthTotalSoFar: number;
  dayOfMonth: number;
}

/**
 * Get day name from date
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get start and end of a given day
 */
function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * Generate daily digest data for a user
 * Returns null if the user has no expenses for the given day
 */
export async function generateDailyDigestData(
  userId: string,
  referenceDate: Date = new Date()
): Promise<DailyExpenseDigestData | null> {
  const { start: todayStart, end: todayEnd } = getDayBounds(referenceDate);

  // Yesterday
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const { start: yesterdayStart, end: yesterdayEnd } = getDayBounds(yesterday);

  // Start of month for month-to-date
  const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  // Fetch today's expenses, yesterday's aggregate, and month-to-date in parallel
  const [todayExpenses, yesterdayExpenses, monthAgg] = await Promise.all([
    DailyExpense.find({
      userId,
      isActive: true,
      date: { $gte: todayStart, $lte: todayEnd },
    }).sort({ date: -1 }),

    DailyExpense.find({
      userId,
      isActive: true,
      date: { $gte: yesterdayStart, $lte: yesterdayEnd },
    }),

    DailyExpense.aggregate([
      {
        $match: {
          userId,
          isActive: true,
          date: { $gte: startOfMonth, $lte: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  // No expenses today — skip this user
  if (todayExpenses.length === 0) {
    return null;
  }

  // Today's totals
  const totalSpent = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Today's category breakdown
  const categoryMap = new Map<string, { total: number; count: number }>();
  todayExpenses.forEach((exp) => {
    const current = categoryMap.get(exp.category) || { total: 0, count: 0 };
    categoryMap.set(exp.category, {
      total: current.total + exp.amount,
      count: current.count + 1,
    });
  });

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  // Top vendor
  const vendorMap = new Map<string, number>();
  todayExpenses.forEach((exp) => {
    if (exp.vendor?.trim()) {
      const vendor = exp.vendor.trim();
      vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + exp.amount);
    }
  });

  let topVendor: string | null = null;
  let topVendorAmount = 0;
  vendorMap.forEach((amount, vendor) => {
    if (amount > topVendorAmount) {
      topVendor = vendor;
      topVendorAmount = amount;
    }
  });

  // Expenses list
  const expenses = todayExpenses.map((exp) => ({
    description: exp.description,
    vendor: exp.vendor || '',
    amount: exp.amount,
    category: exp.category as string,
  }));

  // Yesterday's data
  let yesterdayData: DailyExpenseDigestData['yesterday'] = null;
  if (yesterdayExpenses.length > 0) {
    const yesterdayTotal = yesterdayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const yCategoryMap = new Map<string, { total: number; count: number }>();
    yesterdayExpenses.forEach((exp) => {
      const current = yCategoryMap.get(exp.category) || { total: 0, count: 0 };
      yCategoryMap.set(exp.category, {
        total: current.total + exp.amount,
        count: current.count + 1,
      });
    });

    yesterdayData = {
      date: formatDate(yesterday),
      totalSpent: yesterdayTotal,
      transactionCount: yesterdayExpenses.length,
      categoryBreakdown: Array.from(yCategoryMap.entries())
        .map(([category, data]) => ({ category, total: data.total, count: data.count }))
        .sort((a, b) => b.total - a.total),
    };
  }

  return {
    date: formatDate(referenceDate),
    dayName: getDayName(referenceDate),
    totalSpent,
    transactionCount: todayExpenses.length,
    expenses,
    categoryBreakdown,
    topVendor,
    yesterday: yesterdayData,
    monthTotalSoFar: monthAgg[0]?.total || 0,
    dayOfMonth: referenceDate.getDate(),
  };
}
