/**
 * Monthly Expense Analytics Service
 * Aggregates daily expense data for monthly Telegram digests
 */

import { DailyExpense } from '../../models/DailyExpense';
import { DailyExpenseCategory } from '../../types';

export interface MonthlyCategoryBreakdown {
  category: DailyExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyVendorBreakdown {
  vendor: string;
  total: number;
  count: number;
}

export interface MonthlyDayBreakdown {
  date: string;
  total: number;
  count: number;
}

export interface MonthComparison {
  currentMonthTotal: number;
  previousMonthTotal: number;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'same';
}

export interface MonthlyExpenseAnalytics {
  monthLabel: string;
  monthStart: string;
  monthEnd: string;
  daysInMonth: number;

  totalSpent: number;
  transactionCount: number;
  avgDailySpend: number;
  activeDays: number;

  categoryBreakdown: MonthlyCategoryBreakdown[];
  topVendors: MonthlyVendorBreakdown[];

  highestSpendingDay: MonthlyDayBreakdown | null;
  topCategory: MonthlyCategoryBreakdown | null;

  monthComparison: MonthComparison;
}

/**
 * Get the calendar-month bounds for the month containing referenceDate
 */
function getMonthBounds(date: Date): { start: Date; end: Date; daysInMonth: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysInMonth = end.getDate();
  return { start, end, daysInMonth };
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format month label, e.g. "April 2026"
 */
function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Generate monthly expense analytics for the calendar month containing referenceDate
 */
export async function generateMonthlyAnalytics(
  userId: string,
  referenceDate: Date
): Promise<MonthlyExpenseAnalytics> {
  const { start: monthStart, end: monthEnd, daysInMonth } = getMonthBounds(referenceDate);

  // Previous calendar month
  const prevMonthRef = new Date(monthStart);
  prevMonthRef.setDate(0); // last day of previous month
  const { start: prevMonthStart, end: prevMonthEnd } = getMonthBounds(prevMonthRef);

  const [currentMonthExpenses, prevMonthAgg] = await Promise.all([
    DailyExpense.find({
      userId,
      isActive: true,
      date: { $gte: monthStart, $lte: monthEnd },
    }).sort({ date: 1 }),

    DailyExpense.aggregate([
      {
        $match: {
          userId,
          isActive: true,
          date: { $gte: prevMonthStart, $lte: prevMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalSpent = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const transactionCount = currentMonthExpenses.length;
  const avgDailySpend = daysInMonth > 0 ? totalSpent / daysInMonth : 0;

  // Category breakdown
  const categoryMap = new Map<DailyExpenseCategory, { total: number; count: number }>();
  currentMonthExpenses.forEach((exp) => {
    const current = categoryMap.get(exp.category) || { total: 0, count: 0 };
    categoryMap.set(exp.category, {
      total: current.total + exp.amount,
      count: current.count + 1,
    });
  });

  const categoryBreakdown: MonthlyCategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Vendor breakdown (top 5)
  const vendorMap = new Map<string, { total: number; count: number }>();
  currentMonthExpenses.forEach((exp) => {
    const vendor = exp.vendor?.trim();
    if (vendor) {
      const current = vendorMap.get(vendor) || { total: 0, count: 0 };
      vendorMap.set(vendor, {
        total: current.total + exp.amount,
        count: current.count + 1,
      });
    }
  });

  const topVendors: MonthlyVendorBreakdown[] = Array.from(vendorMap.entries())
    .map(([vendor, data]) => ({ vendor, total: data.total, count: data.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Daily breakdown to find highest-spend day and active days
  const dailyMap = new Map<string, { total: number; count: number }>();
  currentMonthExpenses.forEach((exp) => {
    const dateKey = formatDate(new Date(exp.date));
    const current = dailyMap.get(dateKey) || { total: 0, count: 0 };
    dailyMap.set(dateKey, {
      total: current.total + exp.amount,
      count: current.count + 1,
    });
  });

  let highestSpendingDay: MonthlyDayBreakdown | null = null;
  dailyMap.forEach((data, date) => {
    if (!highestSpendingDay || data.total > highestSpendingDay.total) {
      highestSpendingDay = { date, total: data.total, count: data.count };
    }
  });

  const activeDays = dailyMap.size;
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  // Month comparison
  const previousMonthTotal = prevMonthAgg[0]?.total || 0;
  const difference = totalSpent - previousMonthTotal;
  const percentageChange = previousMonthTotal > 0
    ? ((totalSpent - previousMonthTotal) / previousMonthTotal) * 100
    : totalSpent > 0 ? 100 : 0;

  const monthComparison: MonthComparison = {
    currentMonthTotal: totalSpent,
    previousMonthTotal,
    difference,
    percentageChange,
    trend: difference > 0 ? 'up' : difference < 0 ? 'down' : 'same',
  };

  return {
    monthLabel: formatMonthLabel(monthStart),
    monthStart: formatDate(monthStart),
    monthEnd: formatDate(monthEnd),
    daysInMonth,
    totalSpent,
    transactionCount,
    avgDailySpend,
    activeDays,
    categoryBreakdown,
    topVendors,
    highestSpendingDay,
    topCategory,
    monthComparison,
  };
}
