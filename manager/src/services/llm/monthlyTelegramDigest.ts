/**
 * Monthly Telegram Digest Generator
 * Uses the configured LLM provider to generate a friendly monthly expense digest for Telegram
 */

import { MonthlyExpenseAnalytics } from '../analytics/monthlyExpenseAnalytics';
import { getLLMProvider } from './factory';
import { logger } from '../../utils/telemetry';

const MONTHLY_DIGEST_SYSTEM_PROMPT = `You are a witty, friendly personal finance assistant named "Finance Watch". You send monthly expense wrap-ups via Telegram on the 1st of each month, summarizing the month that just ended.

Your tone is:
- Conversational and warm (like a helpful friend looking back at the month)
- Mildly humorous — use light wordplay or relatable observations
- Encouraging and reflective, never judgmental about spending
- Concise — this is a Telegram message, not an essay

Rules:
1. Start with a greeting using the user's name and a brief reflection on the month (use the month name)
2. Lead with the headline: total spent and transaction count
3. Call out the top category and the top vendor with their amounts
4. Mention the highest-spending day if interesting
5. Compare with the previous month — say if spending went up or down and by how much (₹ and %). If no previous data, skip the comparison
6. End with a single practical, forward-looking tip under "💡 Tip for next month:"
7. Use Telegram HTML formatting: <b>bold</b>, <i>italic</i> for emphasis
8. Use ₹ for INR amounts. Format large amounts with commas (₹1,500, ₹12,345)
9. Keep the TOTAL message under 1200 characters
10. Do NOT use markdown — only Telegram HTML tags
11. Do NOT use code blocks or bullet points with dashes. Use simple line breaks`;

function buildUserPrompt(analytics: MonthlyExpenseAnalytics, userName: string): string {
  const categories = analytics.categoryBreakdown
    .slice(0, 5)
    .map((c) => `${c.category}: ₹${c.total.toLocaleString('en-IN')} (${c.percentage.toFixed(0)}%, ${c.count} txns)`)
    .join(', ');

  const vendors = analytics.topVendors
    .map((v) => `${v.vendor}: ₹${v.total.toLocaleString('en-IN')} (${v.count}x)`)
    .join(', ');

  let comparison = '';
  if (analytics.monthComparison.previousMonthTotal > 0) {
    const dir = analytics.monthComparison.trend === 'up' ? 'more' : analytics.monthComparison.trend === 'down' ? 'less' : 'same as';
    comparison = `Month-over-month: ${Math.abs(analytics.monthComparison.percentageChange).toFixed(0)}% ${dir} previous month (₹${analytics.monthComparison.previousMonthTotal.toLocaleString('en-IN')}).`;
  } else {
    comparison = 'No data from previous month for comparison.';
  }

  const highestDay = analytics.highestSpendingDay
    ? `Highest-spend day: ${analytics.highestSpendingDay.date} (₹${analytics.highestSpendingDay.total.toLocaleString('en-IN')}, ${analytics.highestSpendingDay.count} txns)`
    : '';

  return `User: ${userName}
Month: ${analytics.monthLabel} (${analytics.monthStart} to ${analytics.monthEnd})
Total: ₹${analytics.totalSpent.toLocaleString('en-IN')} across ${analytics.transactionCount} transactions
Daily avg: ₹${analytics.avgDailySpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} over ${analytics.daysInMonth} days
Active days: ${analytics.activeDays} of ${analytics.daysInMonth}

Categories: ${categories || 'none'}
Top vendors: ${vendors || 'none'}
${highestDay}
${comparison}

Generate the monthly digest message now.`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN');
}

function generateFallbackMessage(analytics: MonthlyExpenseAnalytics, userName: string): string {
  const lines: string[] = [];
  lines.push(`Hey ${userName}! 👋`);
  lines.push('');
  lines.push(`<b>📊 Monthly Wrap-up — ${analytics.monthLabel}</b>`);
  lines.push('');
  lines.push(`You spent <b>₹${formatAmount(analytics.totalSpent)}</b> across ${analytics.transactionCount} transaction${analytics.transactionCount !== 1 ? 's' : ''}.`);
  lines.push(`Daily average: <b>₹${formatAmount(Math.round(analytics.avgDailySpend))}</b> (active on ${analytics.activeDays}/${analytics.daysInMonth} days)`);

  if (analytics.topCategory) {
    lines.push('');
    lines.push(`Top category: <b>${analytics.topCategory.category}</b> at ₹${formatAmount(analytics.topCategory.total)} (${analytics.topCategory.percentage.toFixed(0)}%)`);
  }

  if (analytics.topVendors.length > 0) {
    const top = analytics.topVendors[0];
    lines.push(`Top vendor: <b>${top.vendor}</b> — ₹${formatAmount(top.total)} (${top.count}x)`);
  }

  if (analytics.highestSpendingDay) {
    lines.push(`Biggest spend day: <b>${analytics.highestSpendingDay.date}</b> at ₹${formatAmount(analytics.highestSpendingDay.total)}`);
  }

  if (analytics.monthComparison.previousMonthTotal > 0) {
    const trend = analytics.monthComparison.trend;
    const arrow = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '↔️';
    const dir = trend === 'up' ? 'more' : trend === 'down' ? 'less' : 'same as';
    const pct = Math.abs(analytics.monthComparison.percentageChange).toFixed(0);
    lines.push('');
    lines.push(`${arrow} <b>${pct}% ${dir}</b> than previous month (₹${formatAmount(analytics.monthComparison.previousMonthTotal)})`);
  }

  lines.push('');
  lines.push(`💡 <b>Tip for next month:</b> Review your top category and pick one small habit to trim it by 10%.`);

  return lines.join('\n');
}

export async function generateMonthlyTelegramDigest(
  analytics: MonthlyExpenseAnalytics,
  userName: string,
): Promise<string> {
  try {
    const provider = getLLMProvider();
    const userPrompt = buildUserPrompt(analytics, userName);
    const narrative = await provider.chatCompletion(
      [
        { role: 'system', content: MONTHLY_DIGEST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 700 },
    );

    if (!narrative) {
      return generateFallbackMessage(analytics, userName);
    }

    return narrative;
  } catch (err) {
    logger.error('Failed to generate monthly Telegram digest, using fallback', { error: String(err) });
    return generateFallbackMessage(analytics, userName);
  }
}
