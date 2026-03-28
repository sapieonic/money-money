/**
 * Telegram Bot API Utilities
 */

import { getLLMProvider, LLMParseResult } from './llm';
import { logger } from '../utils/telemetry';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    first_name?: string;
    username?: string;
  };
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface ParsedExpense {
  amount: number;
  description: string;
  vendor: string;
  category: 'food' | 'groceries' | 'entertainment' | 'shopping' | 'travel' | 'health' | 'personal' | 'other';
  date: string;
  confidence?: number;
}

export interface ParseExpenseResult {
  success: boolean;
  data?: ParsedExpense;
  error?: string;
}

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to send Telegram message', { error });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error sending Telegram message', { error: String(err) });
    return false;
  }
}

/**
 * Generate a random 6-digit link code
 */
export function generateLinkCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Parse expense message using LLM provider
 * Uses the configured LLM (Azure OpenAI, etc.) or falls back to regex parsing
 */
export async function parseExpenseMessage(text: string): Promise<ParseExpenseResult> {
  const provider = getLLMProvider();

  logger.info('Parsing expense message', { provider: provider.name });

  const result: LLMParseResult = await provider.parseExpenseMessage(text);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'Failed to parse message',
    };
  }

  return {
    success: true,
    data: {
      amount: result.data.amount,
      description: result.data.description,
      vendor: result.data.vendor,
      category: result.data.category,
      date: result.data.date,
      confidence: result.data.confidence,
    },
  };
}

/**
 * Check if a message is a /link command
 */
export function isLinkCommand(text: string): boolean {
  return text.trim().toLowerCase() === '/link';
}

/**
 * Check if a message is a /start command
 */
export function isStartCommand(text: string): boolean {
  return text.trim().toLowerCase().startsWith('/start');
}

/**
 * Check if a message is a /help command
 */
export function isHelpCommand(text: string): boolean {
  return text.trim().toLowerCase() === '/help';
}

/**
 * Fast heuristic to detect if a message looks like a financial question.
 * Used as a pre-filter before the LLM intent classifier to avoid
 * wasting an LLM call on obvious bank SMS forwards.
 */
export function isQueryLike(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Contains a question mark
  if (lower.includes('?')) return true;

  // Starts with common question words
  if (/^(how\s|what|when|where|which|why|is\s|are\s|do\s|does\s|can\s|tell\s|show\s)/.test(lower)) return true;

  // Contains finance-question phrases
  if (/\b(how much|savings rate|total income|total expense|net remaining|my balance|my debt|my loan|my spend|my invest|paid off|pay off)\b/.test(lower)) return true;

  return false;
}

/**
 * Get help message text
 */
export function getHelpMessage(): string {
  const provider = getLLMProvider();
  const aiPowered = provider.name !== 'fallback' ? ' (AI-powered)' : '';

  return `<b>Finance Watch Bot</b>${aiPowered}

I help you track expenses and answer questions about your finances.

<b>Commands:</b>
/link - Link your Telegram account to Finance Watch
/help - Show this help message

<b>Track expenses:</b>
Forward any bank SMS to me and I'll add it automatically.
• Rs.500 debited at Amazon
• Paid INR 250 to Swiggy
• Your a/c debited by Rs.1,200.00
${aiPowered ? `
<b>Ask me anything:</b>
• How much did I spend this week?
• What's my top expense category?
• When will my car loan be paid off?
• What's my savings rate?` : ''}`;
}
