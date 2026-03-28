/**
 * Financial Query Handler
 * Gathers user financial data based on query type and generates a natural-language answer via LLM
 */

import { QueryType } from './intentClassifier';
import { getLLMProvider } from './factory';
import { DailyExpense } from '../../models/DailyExpense';
import { Expense } from '../../models/Expense';
import { Income } from '../../models/Income';
import { Investment } from '../../models/Investment';
import { Debt } from '../../models/Debt';
import { Asset } from '../../models/Asset';
import { logger } from '../../utils/telemetry';

const QUERY_SYSTEM_PROMPT = `You are "Finance Watch", a personal finance assistant replying via Telegram.

Rules:
1. Answer the user's question using ONLY the financial data provided below — never make up numbers
2. Be concise — 2-4 sentences max, this is a Telegram message
3. Use ₹ for INR amounts with commas (₹1,500)
4. Use Telegram HTML formatting: <b>bold</b> for key numbers
5. If the data doesn't contain enough info to answer, say so honestly
6. Tone: helpful, direct, like a knowledgeable friend
7. Do NOT use markdown — only Telegram HTML tags
8. Do NOT add disclaimers about being an AI`;

interface FinancialContext {
  summary: string;
  queryType: QueryType;
}

/**
 * Gather financial data relevant to the query type
 */
async function gatherContext(userId: string, queryType: QueryType): Promise<FinancialContext> {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const now = new Date();

  switch (queryType) {
    case 'spending_summary':
    case 'category_breakdown': {
      // This week + this month daily expenses
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [weekExpenses, monthExpenses] = await Promise.all([
        DailyExpense.find({ userId, isActive: true, date: { $gte: startOfWeek } }),
        DailyExpense.find({ userId, isActive: true, date: { $gte: startOfMonth } }),
      ]);

      const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);
      const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayTotal = monthExpenses
        .filter((e) => new Date(e.date) >= todayStart)
        .reduce((s, e) => s + e.amount, 0);

      // Category breakdown for month
      const catMap = new Map<string, number>();
      monthExpenses.forEach((e) => catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount));
      const categories = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([cat, total]) => `${cat}: ${fmt(total)}`)
        .join(', ');

      // Top vendors for month
      const vendorMap = new Map<string, number>();
      monthExpenses.forEach((e) => {
        if (e.vendor?.trim()) vendorMap.set(e.vendor.trim(), (vendorMap.get(e.vendor.trim()) || 0) + e.amount);
      });
      const topVendors = Array.from(vendorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([v, t]) => `${v}: ${fmt(t)}`)
        .join(', ');

      // Recurring expenses
      const recurringExpenses = await Expense.find({ userId, isActive: true });
      const recurringTotal = recurringExpenses.reduce((s, e) => s + e.amount, 0);

      return {
        queryType,
        summary: `Today: ${fmt(todayTotal)} (${monthExpenses.filter((e) => new Date(e.date) >= todayStart).length} txns)
This week: ${fmt(weekTotal)} (${weekExpenses.length} txns)
This month: ${fmt(monthTotal)} (${monthExpenses.length} txns)
Monthly recurring expenses: ${fmt(recurringTotal)} (${recurringExpenses.length} items)
Category breakdown (month): ${categories || 'none'}
Top vendors (month): ${topVendors || 'none'}`,
      };
    }

    case 'debt_status': {
      const debts = await Debt.find({ userId, isActive: true });
      if (debts.length === 0) {
        return { queryType, summary: 'No active debts found.' };
      }

      const debtLines = debts.map((d) => {
        const paidPct = d.totalAmount > 0
          ? (((d.totalAmount - d.currentBalance) / d.totalAmount) * 100).toFixed(0)
          : '0';
        return `${d.name}: balance ${fmt(d.currentBalance)} of ${fmt(d.totalAmount)} (${paidPct}% paid), EMI ${fmt(d.monthlyPayment)}, rate ${d.interestRate}% ${d.interestRateType}, status: ${d.status}`;
      });

      const totalBalance = debts.reduce((s, d) => s + d.currentBalance, 0);
      const totalEMI = debts.reduce((s, d) => s + d.monthlyPayment, 0);

      return {
        queryType,
        summary: `Active debts: ${debts.length}
Total outstanding: ${fmt(totalBalance)}
Total monthly EMI: ${fmt(totalEMI)}
${debtLines.join('\n')}`,
      };
    }

    case 'savings_overview': {
      const [incomes, expenses, investments, monthDailyAgg] = await Promise.all([
        Income.find({ userId, isActive: true }),
        Expense.find({ userId, isActive: true }),
        Investment.find({ userId, status: 'active' }),
        DailyExpense.aggregate([
          {
            $match: {
              userId,
              isActive: true,
              date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const totalInvestments = investments.reduce((s, i) => s + i.amount, 0);
      const dailyTotal = monthDailyAgg[0]?.total || 0;
      const netRemaining = totalIncome - totalExpenses - totalInvestments - dailyTotal;
      const savingsRate = totalIncome > 0 ? ((netRemaining / totalIncome) * 100).toFixed(1) : '0';

      return {
        queryType,
        summary: `Monthly income: ${fmt(totalIncome)} (${incomes.length} sources)
Recurring expenses: ${fmt(totalExpenses)}
Investments/SIPs: ${fmt(totalInvestments)}
Daily expenses this month: ${fmt(dailyTotal)}
Net remaining: ${fmt(netRemaining)}
Effective savings rate: ${savingsRate}%`,
      };
    }

    case 'investment_summary': {
      const [investments, assets] = await Promise.all([
        Investment.find({ userId, status: 'active' }),
        Asset.find({ userId, isActive: true }),
      ]);

      const sipTotal = investments.filter((i) => i.type === 'sip').reduce((s, i) => s + i.amount, 0);
      const volTotal = investments.filter((i) => i.type === 'voluntary').reduce((s, i) => s + i.amount, 0);
      const assetValue = assets.reduce((s, a) => s + a.currentValue, 0);

      const assetsByCategory = new Map<string, number>();
      assets.forEach((a) => assetsByCategory.set(a.category, (assetsByCategory.get(a.category) || 0) + a.currentValue));
      const assetBreakdown = Array.from(assetsByCategory.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => `${cat}: ${fmt(val)}`)
        .join(', ');

      return {
        queryType,
        summary: `Active investments: ${investments.length}
Monthly SIP: ${fmt(sipTotal)}
Monthly voluntary: ${fmt(volTotal)}
Total assets value: ${fmt(assetValue)} (${assets.length} assets)
Asset breakdown: ${assetBreakdown || 'none'}`,
      };
    }

    case 'income_summary': {
      const incomes = await Income.find({ userId, isActive: true });
      const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
      const totalPreTax = incomes.reduce((s, i) => s + (i.preTaxAmount || i.amount), 0);
      const totalTax = incomes.reduce((s, i) => s + (i.taxPaid || 0), 0);

      const incomeLines = incomes.map((i) => `${i.name} (${i.type}): ${fmt(i.amount)}`);

      return {
        queryType,
        summary: `Income sources: ${incomes.length}
Total post-tax: ${fmt(totalIncome)}
Total pre-tax: ${fmt(totalPreTax)}
Total tax: ${fmt(totalTax)}
Effective tax rate: ${totalPreTax > 0 ? ((totalTax / totalPreTax) * 100).toFixed(1) : '0'}%
${incomeLines.join('\n')}`,
      };
    }

    case 'general':
    default: {
      // Gather a broad snapshot for general questions
      const [incomes, expenses, dailyMonthAgg, debts] = await Promise.all([
        Income.find({ userId, isActive: true }),
        Expense.find({ userId, isActive: true }),
        DailyExpense.aggregate([
          {
            $match: {
              userId,
              isActive: true,
              date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Debt.find({ userId, isActive: true, status: 'active' }),
      ]);

      const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const dailyTotal = dailyMonthAgg[0]?.total || 0;
      const totalDebt = debts.reduce((s, d) => s + d.currentBalance, 0);

      return {
        queryType,
        summary: `Monthly income: ${fmt(totalIncome)}
Recurring expenses: ${fmt(totalExpenses)}
Daily expenses this month: ${fmt(dailyTotal)}
Active debts: ${debts.length} (total balance: ${fmt(totalDebt)})
Net remaining: ${fmt(totalIncome - totalExpenses - dailyTotal)}`,
      };
    }
  }
}

/**
 * Answer a financial query using the user's data and LLM
 */
export async function answerFinancialQuery(
  userId: string,
  userMessage: string,
  queryType: QueryType,
): Promise<string> {
  try {
    const context = await gatherContext(userId, queryType);

    const provider = getLLMProvider();
    const answer = await provider.chatCompletion(
      [
        { role: 'system', content: QUERY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `User's question: "${userMessage}"

Financial data:
${context.summary}

Answer the question based on this data.`,
        },
      ],
      { temperature: 0.4, maxTokens: 300 },
    );

    if (!answer) {
      return generateFallbackAnswer(context);
    }

    return answer;
  } catch (err) {
    logger.error('Failed to answer financial query', { error: String(err) });
    return 'Sorry, I couldn\'t process your question right now. Try again later, or forward a bank SMS to track an expense.';
  }
}

/**
 * Simple fallback when LLM is unavailable — just return the raw summary
 */
function generateFallbackAnswer(context: FinancialContext): string {
  return `<b>Here's what I found:</b>\n\n${context.summary}`;
}
