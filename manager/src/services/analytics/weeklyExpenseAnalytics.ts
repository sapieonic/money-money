/**
 * Weekly Expense Analytics Service
 * Aggregates daily expense data for weekly email summaries
 */

import { DailyExpense } from '../../models/DailyExpense';
import { DailyExpenseCategory } from '../../types';

export interface CategoryBreakdown {
  category: DailyExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface VendorBreakdown {
  vendor: string;
  total: number;
  count: number;
}

export interface DailyBreakdown {
  date: string;
  dayName: string;
  total: number;
  count: number;
}

export interface WeekComparison {
  currentWeekTotal: number;
  previousWeekTotal: number;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'same';
}

export interface WeeklyExpenseAnalytics {
  // Period info
  weekStart: string;
  weekEnd: string;

  // Totals
  totalSpent: number;
  transactionCount: number;
  avgDailySpend: number;

  // Breakdowns
  categoryBreakdown: CategoryBreakdown[];
  topVendors: VendorBreakdown[];
  dailyBreakdown: DailyBreakdown[];

  // Insights
  highestSpendingDay: DailyBreakdown | null;
  lowestSpendingDay: DailyBreakdown | null;
  topCategory: CategoryBreakdown | null;

  // Comparison with previous week
  weekComparison: WeekComparison;
}

/**
 * Get the start and end dates of a week
 * Week starts on Monday
 */
function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
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
 * Generate weekly expense analytics for a user
 */
export async function generateWeeklyAnalytics(
  userId: string,
  referenceDate: Date = new Date()
): Promise<WeeklyExpenseAnalytics> {
  // Get current week bounds
  const { start: weekStart, end: weekEnd } = getWeekBounds(referenceDate);

  // Get previous week bounds for comparison
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  prevWeekEnd.setHours(23, 59, 59, 999);
  const prevWeekStart = new Date(prevWeekEnd);
  prevWeekStart.setDate(prevWeekStart.getDate() - 6);
  prevWeekStart.setHours(0, 0, 0, 0);

  // Fetch current week expenses
  const currentWeekExpenses = await DailyExpense.find({
    userId,
    isActive: true,
    date: { $gte: weekStart, $lte: weekEnd },
  }).sort({ date: 1 });

  // Fetch previous week total for comparison
  const prevWeekAgg = await DailyExpense.aggregate([
    {
      $match: {
        userId,
        isActive: true,
        date: { $gte: prevWeekStart, $lte: prevWeekEnd },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Calculate totals
  const totalSpent = currentWeekExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const transactionCount = currentWeekExpenses.length;
  const avgDailySpend = transactionCount > 0 ? totalSpent / 7 : 0;

  // Category breakdown
  const categoryMap = new Map<DailyExpenseCategory, { total: number; count: number }>();
  currentWeekExpenses.forEach((exp) => {
    const current = categoryMap.get(exp.category) || { total: 0, count: 0 };
    categoryMap.set(exp.category, {
      total: current.total + exp.amount,
      count: current.count + 1,
    });
  });

  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Vendor breakdown (top 5)
  const vendorMap = new Map<string, { total: number; count: number }>();
  currentWeekExpenses.forEach((exp) => {
    if (exp.vendor) {
      const vendor = exp.vendor.trim();
      if (vendor) {
        const current = vendorMap.get(vendor) || { total: 0, count: 0 };
        vendorMap.set(vendor, {
          total: current.total + exp.amount,
          count: current.count + 1,
        });
      }
    }
  });

  const topVendors: VendorBreakdown[] = Array.from(vendorMap.entries())
    .map(([vendor, data]) => ({
      vendor,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Daily breakdown
  const dailyMap = new Map<string, { total: number; count: number; date: Date }>();

  // Initialize all 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateKey = formatDate(d);
    dailyMap.set(dateKey, { total: 0, count: 0, date: d });
  }

  // Populate with actual expenses
  currentWeekExpenses.forEach((exp) => {
    const dateKey = formatDate(new Date(exp.date));
    const current = dailyMap.get(dateKey);
    if (current) {
      dailyMap.set(dateKey, {
        total: current.total + exp.amount,
        count: current.count + 1,
        date: current.date,
      });
    }
  });

  const dailyBreakdown: DailyBreakdown[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      dayName: getDayName(data.date),
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find highest and lowest spending days (excluding zero-spend days for lowest)
  const daysWithSpending = dailyBreakdown.filter((d) => d.total > 0);
  const highestSpendingDay = daysWithSpending.length > 0
    ? daysWithSpending.reduce((max, d) => (d.total > max.total ? d : max))
    : null;
  const lowestSpendingDay = daysWithSpending.length > 0
    ? daysWithSpending.reduce((min, d) => (d.total < min.total ? d : min))
    : null;

  // Top category
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  // Week comparison
  const previousWeekTotal = prevWeekAgg[0]?.total || 0;
  const difference = totalSpent - previousWeekTotal;
  const percentageChange = previousWeekTotal > 0
    ? ((totalSpent - previousWeekTotal) / previousWeekTotal) * 100
    : totalSpent > 0 ? 100 : 0;

  const weekComparison: WeekComparison = {
    currentWeekTotal: totalSpent,
    previousWeekTotal,
    difference,
    percentageChange,
    trend: difference > 0 ? 'up' : difference < 0 ? 'down' : 'same',
  };

  return {
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    totalSpent,
    transactionCount,
    avgDailySpend,
    categoryBreakdown,
    topVendors,
    dailyBreakdown,
    highestSpendingDay,
    lowestSpendingDay,
    topCategory,
    weekComparison,
  };
}
