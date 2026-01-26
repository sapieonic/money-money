/**
 * Telegram Bot API Utilities
 */

import { getLLMProvider, LLMParseResult } from './llm';

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
    console.error('TELEGRAM_BOT_TOKEN not configured');
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
      console.error('Failed to send Telegram message:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error sending Telegram message:', err);
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

  console.log(`Parsing expense message with provider: ${provider.name}`);

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
 * Get help message text
 */
export function getHelpMessage(): string {
  const provider = getLLMProvider();
  const aiPowered = provider.name !== 'fallback' ? ' (AI-powered)' : '';

  return `<b>Finance Watch Bot</b>${aiPowered}

I help you track your daily expenses by parsing your forwarded bank SMS messages.

<b>Commands:</b>
/link - Link your Telegram account to Finance Watch
/help - Show this help message

<b>How to use:</b>
1. First, link your account using /link
2. Enter the code in Settings → Telegram Integration
3. Forward any bank SMS to me
4. I'll automatically add it as an expense!

<b>Example messages I can parse:</b>
• Rs.500 debited at Amazon
• Paid INR 250 to Swiggy
• Your a/c debited by Rs.1,200.00`;
}
