/**
 * Expense Reminder Message Generator
 * Uses the configured LLM provider to generate friendly reminder messages for upcoming recurring expenses
 */

import { getLLMProvider } from './factory';
import { logger } from '../../utils/telemetry';

export interface ExpenseReminderData {
  userName: string;
  tomorrowDate: string;
  dayName: string;
  expenses: Array<{
    name: string;
    amount: number;
    category: string;
  }>;
  totalAmount: number;
}

const EXPENSE_REMINDER_SYSTEM_PROMPT = `You are a helpful, friendly personal finance assistant named "Finance Watch". You send expense reminders via Telegram.

Your tone is:
- Friendly and helpful (like a supportive friend)
- Encouraging, never nagging or judgmental
- Concise and clear — this is a Telegram message

Rules:
1. Start with a friendly greeting using the user's name
2. Clearly state that expenses are due tomorrow with the date and day name
3. Group expenses by category for easy reading
4. Show total amount prominently
5. End with a helpful tip or encouraging note under "💡 Tip:"
6. Use Telegram HTML formatting: <b>bold</b>, <i>italic</i> for emphasis
7. Use ₹ for INR amounts (e.g., ₹500). Format large amounts with commas (₹1,500)
8. Keep the TOTAL message under 1000 characters
9. Use emoji sparingly — just for subject line (💰) and tip (💡)
10. Do NOT use markdown — only Telegram HTML tags
11. Do NOT use code blocks or dashes for bullets`;

/**
 * Build the user prompt from reminder data
 */
function buildUserPrompt(data: ExpenseReminderData): string {
  const expensesByCategory = new Map<string, { total: number; expenses: typeof data.expenses }>();

  data.expenses.forEach((expense) => {
    if (!expensesByCategory.has(expense.category)) {
      expensesByCategory.set(expense.category, { total: 0, expenses: [] });
    }
    const categoryData = expensesByCategory.get(expense.category)!;
    categoryData.total += expense.amount;
    categoryData.expenses.push(expense);
  });

  const categorySummary = Array.from(expensesByCategory.entries())
    .map(([category, data]) => `${category}: ₹${formatAmount(data.total)} (${data.expenses.length} expense${data.expenses.length > 1 ? 's' : ''})`)
    .join(', ');

  const expenseList = data.expenses
    .map((e) => `- ${e.name}: ₹${formatAmount(e.amount)} (${e.category})`)
    .join('\n');

  return `User: ${data.userName}
Tomorrow: ${data.dayName}, ${data.tomorrowDate}

Expenses Due Tomorrow (${data.expenses.length} total):
${expenseList}

Category Summary: ${categorySummary}
Total Amount: ₹${formatAmount(data.totalAmount)}

Generate a friendly reminder message now.`;
}

/**
 * Generate a simple template-based fallback message when LLM is unavailable
 */
function generateFallbackMessage(data: ExpenseReminderData): string {
  const expensesByCategory = new Map<string, { total: number; expenses: typeof data.expenses }>();

  data.expenses.forEach((expense) => {
    if (!expensesByCategory.has(expense.category)) {
      expensesByCategory.set(expense.category, { total: 0, expenses: [] });
    }
    const categoryData = expensesByCategory.get(expense.category)!;
    categoryData.total += expense.amount;
    categoryData.expenses.push(expense);
  });

  const categoryEmojis: { [key: string]: string } = {
    housing: '🏠',
    transport: '🚗',
    utilities: '🔌',
    subscriptions: '📱',
    loan: '💳',
    other: '📋',
  };

  let categoriesSection = '';
  Array.from(expensesByCategory.entries()).forEach(([category, categoryData]) => {
    const emoji = categoryEmojis[category] || '📋';
    categoriesSection += `\n${emoji} <b>${capitalize(category)}</b>\n`;
    categoryData.expenses.forEach((expense) => {
      categoriesSection += `• ${expense.name}: ₹${formatAmount(expense.amount)}\n`;
    });
  });

  return `Hey ${data.userName}! 👋

💰 <b>Expenses Due Tomorrow (${data.dayName}, ${data.tomorrowDate})</b>

You have <b>${data.expenses.length} recurring expense${data.expenses.length > 1 ? 's' : ''}</b> due:
${categoriesSection}
<b>Total: ₹${formatAmount(data.totalAmount)}</b>

💡 <b>Tip:</b> Set up auto-pay for recurring bills to never miss a deadline!`;
}

/**
 * Format amount with commas for INR
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN');
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate an expense reminder message using AI, with template fallback
 */
export async function generateExpenseReminderMessage(data: ExpenseReminderData): Promise<string> {
  try {
    const provider = getLLMProvider();
    const userPrompt = buildUserPrompt(data);
    const message = await provider.chatCompletion(
      [
        { role: 'system', content: EXPENSE_REMINDER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 500 },
    );

    if (!message) {
      return generateFallbackMessage(data);
    }

    return message;
  } catch (err) {
    logger.error('Failed to generate AI reminder message, using fallback', { error: String(err) });
    return generateFallbackMessage(data);
  }
}
