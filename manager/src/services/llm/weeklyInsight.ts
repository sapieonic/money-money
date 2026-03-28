/**
 * Weekly Expense Insight Generator
 * Uses the configured LLM provider to generate a personalized insight paragraph for weekly email summaries
 */

import { WeeklyExpenseAnalytics } from '../analytics/weeklyExpenseAnalytics';
import { getLLMProvider } from './factory';
import { logger } from '../../utils/telemetry';

const WEEKLY_INSIGHT_SYSTEM_PROMPT = `You are a concise personal finance analyst named "Finance Watch". You write a short insight paragraph for a weekly expense email.

Rules:
1. Write exactly ONE paragraph (2-4 sentences max)
2. Highlight the most actionable or interesting pattern from the data
3. Be specific — reference actual categories, vendors, amounts, and percentages
4. If spending went up, suggest where the user could cut back (be specific, not generic)
5. If spending went down, acknowledge it positively
6. If one category dominates (>50%), call it out
7. If a single vendor appears 3+ times, mention the frequency
8. Tone: friendly, direct, not preachy
9. Use ₹ for INR amounts with commas (₹1,500)
10. Do NOT use emojis, HTML, or markdown — plain text only`;

/**
 * Build a structured user prompt from analytics data
 */
function buildUserPrompt(analytics: WeeklyExpenseAnalytics, userName: string): string {
  const categories = analytics.categoryBreakdown
    .map((c) => `${c.category}: ₹${c.total.toLocaleString('en-IN')} (${c.percentage.toFixed(0)}%, ${c.count} txns)`)
    .join(', ');

  const vendors = analytics.topVendors
    .map((v) => `${v.vendor}: ₹${v.total.toLocaleString('en-IN')} (${v.count}x)`)
    .join(', ');

  const dailySummary = analytics.dailyBreakdown
    .map((d) => `${d.dayName.substring(0, 3)}: ₹${d.total.toLocaleString('en-IN')}`)
    .join(', ');

  let comparison = '';
  if (analytics.weekComparison.previousWeekTotal > 0) {
    const dir = analytics.weekComparison.trend === 'up' ? 'more' : analytics.weekComparison.trend === 'down' ? 'less' : 'same as';
    comparison = `Week-over-week: ${Math.abs(analytics.weekComparison.percentageChange).toFixed(0)}% ${dir} last week (₹${analytics.weekComparison.previousWeekTotal.toLocaleString('en-IN')}).`;
  } else {
    comparison = 'No data from previous week for comparison.';
  }

  return `User: ${userName}
Week: ${analytics.weekStart} to ${analytics.weekEnd}
Total: ₹${analytics.totalSpent.toLocaleString('en-IN')} across ${analytics.transactionCount} transactions
Daily avg: ₹${analytics.avgDailySpend.toLocaleString('en-IN')}

Categories: ${categories}
Top vendors: ${vendors || 'none'}
Daily: ${dailySummary}
${analytics.highestSpendingDay ? `Highest day: ${analytics.highestSpendingDay.dayName} (₹${analytics.highestSpendingDay.total.toLocaleString('en-IN')})` : ''}
${comparison}

Write a single insight paragraph.`;
}

/**
 * Generate a fallback insight when LLM is unavailable
 */
function generateFallbackInsight(analytics: WeeklyExpenseAnalytics): string {
  const top = analytics.topCategory;
  if (!top) return '';

  let insight = `${top.category.charAt(0).toUpperCase() + top.category.slice(1)} was your top spending category at ${top.percentage.toFixed(0)}% of total expenses.`;

  if (analytics.weekComparison.previousWeekTotal > 0 && analytics.weekComparison.trend !== 'same') {
    const dir = analytics.weekComparison.trend === 'up' ? 'up' : 'down';
    insight += ` Overall spending was ${dir} ${Math.abs(analytics.weekComparison.percentageChange).toFixed(0)}% compared to last week.`;
  }

  return insight;
}

/**
 * Generate an AI-powered weekly insight, with static fallback
 */
export async function generateWeeklyInsight(
  analytics: WeeklyExpenseAnalytics,
  userName: string,
): Promise<string> {
  try {
    const provider = getLLMProvider();
    const userPrompt = buildUserPrompt(analytics, userName);
    const insight = await provider.chatCompletion(
      [
        { role: 'system', content: WEEKLY_INSIGHT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.6, maxTokens: 200 },
    );

    if (!insight) {
      return generateFallbackInsight(analytics);
    }

    return insight;
  } catch (err) {
    logger.error('Failed to generate weekly insight, using fallback', { error: String(err) });
    return generateFallbackInsight(analytics);
  }
}
