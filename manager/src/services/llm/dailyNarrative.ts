/**
 * Daily Expense Narrative Generator
 * Uses the configured LLM provider to generate creative daily expense digests for Telegram
 */

import { DailyExpenseDigestData } from '../analytics/dailyExpenseAnalytics';
import { getLLMProvider } from './factory';
import { logger } from '../../utils/telemetry';

const DAILY_DIGEST_SYSTEM_PROMPT = `You are a witty, friendly personal finance assistant named "Finance Watch". You send daily expense digests via Telegram.

Your tone is:
- Conversational and warm (like a helpful friend)
- Mildly humorous — use light humor, wordplay, or relatable observations
- Encouraging, never judgmental about spending
- Concise — this is a Telegram message, not an essay

Rules:
1. Start with a greeting using the user's name and a brief comment about their day
2. Summarize today's spending with key highlights (top category, notable purchases)
3. Compare with yesterday — mention if spending went up/down and by how much. If yesterday had no expenses, mention it was a no-spend day
4. Include month-to-date context briefly
5. End with a single practical, actionable finance tip under the heading "💡 Tip of the Day:"
6. Use Telegram HTML formatting: <b>bold</b>, <i>italic</i> for emphasis
7. Use ₹ for INR amounts (e.g., ₹500). Format large amounts with commas (₹1,500)
8. Keep the TOTAL message under 800 characters
9. Do NOT use markdown — only Telegram HTML tags
10. Do NOT use code blocks or bullet points with dashes. Use simple line breaks`;

/**
 * Build the user prompt from digest data
 */
function buildUserPrompt(data: DailyExpenseDigestData, userName: string): string {
  const expenseList = data.expenses
    .map((e) => `- ${e.description}${e.vendor ? ` at ${e.vendor}` : ''}: ₹${e.amount} (${e.category})`)
    .join('\n');

  const categories = data.categoryBreakdown
    .map((c) => `${c.category}: ₹${c.total} (${c.count} txn)`)
    .join(', ');

  let yesterdaySection: string;
  if (data.yesterday) {
    const yCategories = data.yesterday.categoryBreakdown
      .map((c) => `${c.category}: ₹${c.total}`)
      .join(', ');
    const diff = data.totalSpent - data.yesterday.totalSpent;
    const direction = diff > 0 ? 'more' : diff < 0 ? 'less' : 'same as';
    yesterdaySection = `Yesterday (${data.yesterday.date}): ₹${data.yesterday.totalSpent} across ${data.yesterday.transactionCount} transactions. Categories: ${yCategories}. Today is ₹${Math.abs(diff)} ${direction} than yesterday.`;
  } else {
    yesterdaySection = 'Yesterday: No expenses recorded (it was a no-spend day!)';
  }

  return `User: ${userName}
Date: ${data.dayName}, ${data.date}

Today's Expenses (${data.transactionCount} transactions, total ₹${data.totalSpent}):
${expenseList}

Categories: ${categories}
${data.topVendor ? `Top vendor: ${data.topVendor}` : ''}

${yesterdaySection}

Month-to-date: ₹${data.monthTotalSoFar} (Day ${data.dayOfMonth} of the month)

Generate the daily digest message now.`;
}


/**
 * Generate a simple template-based fallback message when LLM is unavailable
 */
function generateFallbackMessage(data: DailyExpenseDigestData, userName: string): string {
  const topCategory = data.categoryBreakdown[0];

  let comparison = '';
  if (data.yesterday) {
    const diff = data.totalSpent - data.yesterday.totalSpent;
    if (diff > 0) {
      comparison = `📈 That's <b>₹${formatAmount(Math.abs(diff))} more</b> than yesterday's ₹${formatAmount(data.yesterday.totalSpent)}.`;
    } else if (diff < 0) {
      comparison = `📉 That's <b>₹${formatAmount(Math.abs(diff))} less</b> than yesterday's ₹${formatAmount(data.yesterday.totalSpent)}.`;
    } else {
      comparison = `↔️ Same as yesterday's spending.`;
    }
  } else {
    comparison = `Yesterday was a no-spend day!`;
  }

  return `Hey ${userName}! 👋

<b>📊 Daily Expense Digest — ${data.dayName}</b>

You spent <b>₹${formatAmount(data.totalSpent)}</b> across ${data.transactionCount} transaction${data.transactionCount !== 1 ? 's' : ''} today.
${topCategory ? `Top category: <b>${topCategory.category}</b> (₹${formatAmount(topCategory.total)})` : ''}
${data.topVendor ? `Top vendor: <b>${data.topVendor}</b>` : ''}

${comparison}

Month so far: <b>₹${formatAmount(data.monthTotalSoFar)}</b> (Day ${data.dayOfMonth})

💡 <b>Tip of the Day:</b> Track every expense, no matter how small. Small leaks sink big ships!`;
}

/**
 * Format amount with commas for INR
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN');
}

/**
 * Generate a creative daily narrative using AI, with template fallback
 */
export async function generateDailyNarrative(
  data: DailyExpenseDigestData,
  userName: string
): Promise<string> {
  try {
    const provider = getLLMProvider();
    const userPrompt = buildUserPrompt(data, userName);
    const narrative = await provider.chatCompletion(
      [
        { role: 'system', content: DAILY_DIGEST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.8, maxTokens: 600 },
    );

    if (!narrative) {
      return generateFallbackMessage(data, userName);
    }

    return narrative;
  } catch (err) {
    logger.error('Failed to generate AI narrative, using fallback', { error: String(err) });
    return generateFallbackMessage(data, userName);
  }
}
