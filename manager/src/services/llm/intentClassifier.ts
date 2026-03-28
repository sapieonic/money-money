/**
 * Telegram Message Intent Classifier
 * Classifies free-text messages as expense entries or financial queries
 */

import { getLLMProvider } from './factory';
import { logger } from '../../utils/telemetry';

export type MessageIntent = 'expense' | 'query';

export type QueryType =
  | 'spending_summary'    // "How much did I spend this week/month?"
  | 'category_breakdown'  // "What's my top expense category?"
  | 'debt_status'         // "When will my car loan be paid off?"
  | 'savings_overview'    // "What's my savings rate?"
  | 'investment_summary'  // "How are my investments doing?"
  | 'income_summary'      // "What's my total income?"
  | 'general';            // Catch-all for other financial questions

export interface ClassificationResult {
  intent: MessageIntent;
  queryType?: QueryType;
  confidence: number;
}

const INTENT_SYSTEM_PROMPT = `You classify Telegram messages sent to a personal finance bot.

Messages are either:
1. "expense" — a bank SMS, transaction notification, or manual expense entry (contains amounts like Rs.500, INR 250, debited, credited, paid)
2. "query" — a question about the user's finances (spending, savings, debts, investments, income)

Also classify query subtype:
- spending_summary: questions about how much was spent (today, this week, this month)
- category_breakdown: questions about spending by category or top categories
- debt_status: questions about loans, EMIs, payoff dates, debt balance
- savings_overview: questions about savings rate, remaining money, net balance
- investment_summary: questions about investments, SIPs, portfolio
- income_summary: questions about income, salary, earnings
- general: other financial questions

Respond ONLY with JSON:
{"intent": "expense" or "query", "queryType": "<subtype if query, omit if expense>", "confidence": <0-1>}`;

/**
 * Classify a message using the LLM provider
 */
async function classifyWithLLM(message: string): Promise<ClassificationResult | null> {
  const provider = getLLMProvider();
  const result = await provider.chatCompletion(
    [
      { role: 'system', content: INTENT_SYSTEM_PROMPT },
      { role: 'user', content: message },
    ],
    { temperature: 0.1, maxTokens: 100 },
  );

  if (!result) {
    return null;
  }

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.intent || !['expense', 'query'].includes(parsed.intent)) {
      return null;
    }

    return {
      intent: parsed.intent,
      queryType: parsed.intent === 'query' ? (parsed.queryType || 'general') : undefined,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  } catch (err) {
    logger.error('Failed to parse intent classification', { error: String(err) });
    return null;
  }
}

/**
 * Classify a Telegram message as expense or query.
 *
 * Uses a fast heuristic first (isQueryLike), then falls back to LLM classification
 * if the heuristic is inconclusive. Defaults to "expense" if LLM is unavailable.
 */
export async function classifyIntent(
  message: string,
  isQueryHeuristic: boolean,
): Promise<ClassificationResult> {
  // If the heuristic says it's clearly not a query (e.g., contains Rs./INR patterns),
  // skip the LLM call entirely
  if (!isQueryHeuristic && hasAmountPattern(message)) {
    return { intent: 'expense', confidence: 0.9 };
  }

  // If heuristic says it looks like a query, or we're unsure, ask the LLM
  try {
    const classification = await classifyWithLLM(message);

    if (classification && classification.confidence >= 0.6) {
      return classification;
    }

    // Low confidence or LLM unavailable — fall back based on heuristic
    if (isQueryHeuristic) {
      return { intent: 'query', queryType: 'general', confidence: 0.5 };
    }

    return { intent: 'expense', confidence: 0.5 };
  } catch (err) {
    logger.error('Intent classification failed', { error: String(err) });
    // Default to expense (preserves existing behavior)
    return { intent: 'expense', confidence: 0.3 };
  }
}

/**
 * Quick check for amount patterns commonly found in bank SMS
 */
function hasAmountPattern(text: string): boolean {
  return /(?:Rs\.?|INR|Rupees|₹)\s*[\d,]+/i.test(text);
}
