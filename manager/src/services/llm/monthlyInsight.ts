/**
 * Monthly Ledger Insight Generator
 * Uses the configured LLM provider to generate a brief summary comparing the current month's ledger with the previous month
 */

import { IMonthlyLedger } from '../../models/MonthlyLedger';
import { getLLMProvider } from './factory';
import { logger } from '../../utils/telemetry';

const MONTHLY_INSIGHT_SYSTEM_PROMPT = `You are a concise personal finance analyst named "Finance Watch". You generate a brief monthly ledger insight.

Rules:
1. Write 3-5 short bullet points (one line each)
2. Compare current month vs previous month: income change, expense change, investment change, daily spending
3. Call out notable shifts — a new expense, a dropped income source, a paused investment
4. If this is the first month (no previous data), just summarize the current month's structure
5. Use ₹ for INR amounts with commas (₹1,500)
6. Be specific with numbers and percentages
7. Tone: neutral, factual, helpful
8. Do NOT use emojis or HTML — plain text with bullet points (use • character)
9. Keep total output under 400 characters`;

interface MonthlyInsightData {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  dailyExpensesTotal: number;
  incomeCount: number;
  expenseCount: number;
  investmentCount: number;
  topExpenseCategory?: string;
  topExpenseAmount?: number;
}

function summarizeLedger(ledger: IMonthlyLedger, dailyExpensesTotal: number): MonthlyInsightData {
  const totalIncome = ledger.incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = ledger.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalInvestments = ledger.investments.reduce((sum, i) => sum + i.amount, 0);

  // Find top expense category
  const categoryTotals = new Map<string, number>();
  ledger.expenses.forEach((e) => {
    categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount);
  });
  let topExpenseCategory: string | undefined;
  let topExpenseAmount = 0;
  categoryTotals.forEach((amount, category) => {
    if (amount > topExpenseAmount) {
      topExpenseCategory = category;
      topExpenseAmount = amount;
    }
  });

  return {
    month: ledger.month,
    totalIncome,
    totalExpenses,
    totalInvestments,
    dailyExpensesTotal,
    incomeCount: ledger.incomes.length,
    expenseCount: ledger.expenses.length,
    investmentCount: ledger.investments.length,
    topExpenseCategory,
    topExpenseAmount,
  };
}

function buildUserPrompt(
  current: MonthlyInsightData,
  previous: MonthlyInsightData | null,
): string {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  let prompt = `Current month: ${current.month}
Income: ${fmt(current.totalIncome)} (${current.incomeCount} sources)
Recurring expenses: ${fmt(current.totalExpenses)} (${current.expenseCount} items)
Investments: ${fmt(current.totalInvestments)} (${current.investmentCount} items)
Daily expenses so far: ${fmt(current.dailyExpensesTotal)}
${current.topExpenseCategory ? `Top expense category: ${current.topExpenseCategory} (${fmt(current.topExpenseAmount!)})` : ''}
Net remaining: ${fmt(current.totalIncome - current.totalExpenses - current.totalInvestments - current.dailyExpensesTotal)}`;

  if (previous) {
    prompt += `

Previous month: ${previous.month}
Income: ${fmt(previous.totalIncome)} (${previous.incomeCount} sources)
Recurring expenses: ${fmt(previous.totalExpenses)} (${previous.expenseCount} items)
Investments: ${fmt(previous.totalInvestments)} (${previous.investmentCount} items)
Daily expenses: ${fmt(previous.dailyExpensesTotal)}`;
  } else {
    prompt += '\n\nNo previous month data available.';
  }

  prompt += '\n\nGenerate the monthly insight bullets.';
  return prompt;
}

function generateFallbackInsight(current: MonthlyInsightData, previous: MonthlyInsightData | null): string {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const lines: string[] = [];

  const net = current.totalIncome - current.totalExpenses - current.totalInvestments - current.dailyExpensesTotal;
  lines.push(`• Net remaining: ${fmt(net)} from ${fmt(current.totalIncome)} income`);

  if (previous) {
    const incomeDiff = current.totalIncome - previous.totalIncome;
    if (incomeDiff !== 0) {
      lines.push(`• Income ${incomeDiff > 0 ? 'up' : 'down'} ${fmt(Math.abs(incomeDiff))} vs last month`);
    }
    const expDiff = current.totalExpenses - previous.totalExpenses;
    if (expDiff !== 0) {
      lines.push(`• Recurring expenses ${expDiff > 0 ? 'up' : 'down'} ${fmt(Math.abs(expDiff))} vs last month`);
    }
  }

  if (current.topExpenseCategory) {
    lines.push(`• Top expense: ${current.topExpenseCategory} at ${fmt(current.topExpenseAmount!)}`);
  }

  return lines.join('\n');
}

/**
 * Generate AI-powered monthly ledger insight, with static fallback
 */
export async function generateMonthlyInsight(
  currentLedger: IMonthlyLedger,
  currentDailyTotal: number,
  previousLedger: IMonthlyLedger | null,
  previousDailyTotal: number,
): Promise<string> {
  const current = summarizeLedger(currentLedger, currentDailyTotal);
  const previous = previousLedger ? summarizeLedger(previousLedger, previousDailyTotal) : null;

  try {
    const provider = getLLMProvider();
    const userPrompt = buildUserPrompt(current, previous);
    const insight = await provider.chatCompletion(
      [
        { role: 'system', content: MONTHLY_INSIGHT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.5, maxTokens: 250 },
    );

    if (!insight) {
      return generateFallbackInsight(current, previous);
    }

    return insight;
  } catch (err) {
    logger.error('Failed to generate monthly insight, using fallback', { error: String(err) });
    return generateFallbackInsight(current, previous);
  }
}
