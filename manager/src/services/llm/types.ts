/**
 * LLM Provider Types and Interfaces
 */

export interface ParsedExpenseResult {
  amount: number;
  description: string;
  vendor: string;
  category: 'food' | 'groceries' | 'entertainment' | 'shopping' | 'travel' | 'health' | 'personal' | 'other';
  date: string;
  confidence: number; // 0-1 confidence score
}

export interface LLMParseResult {
  success: boolean;
  data?: ParsedExpenseResult;
  error?: string;
}

export interface LLMProviderConfig {
  apiKey: string;
  endpoint?: string;
  model?: string;
  apiVersion?: string;
}

/**
 * Abstract LLM Provider interface
 * All LLM implementations must implement this interface
 */
export interface ILLMProvider {
  /**
   * Provider name for identification
   */
  readonly name: string;

  /**
   * Parse an expense message and extract structured data
   * @param message - The raw message text (e.g., bank SMS)
   * @returns Parsed expense data or error
   */
  parseExpenseMessage(message: string): Promise<LLMParseResult>;

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean;
}

/**
 * Supported LLM provider types
 */
export type LLMProviderType = 'azure-openai' | 'openai' | 'anthropic' | 'none';

/**
 * System prompt for expense parsing
 */
export const EXPENSE_PARSING_SYSTEM_PROMPT = `You are an expense parsing assistant. Your task is to extract expense information from bank SMS messages or transaction notifications.

Extract the following information:
1. amount: The transaction amount (number only, no currency symbols)
2. vendor: The merchant/vendor name if mentioned (e.g., "Amazon", "Swiggy", "Uber")
3. category: Categorize the expense into one of these categories:
   - food: Restaurants, cafes, food delivery (Swiggy, Zomato, etc.)
   - groceries: Supermarkets, grocery stores, vegetables
   - entertainment: Movies, events, streaming services, games
   - shopping: E-commerce, retail stores, clothing, electronics
   - travel: Cab services (Uber, Ola), flights, trains, fuel
   - health: Pharmacy, hospitals, doctors, gym
   - personal: Personal care, miscellaneous personal expenses
   - other: Anything that doesn't fit above categories
4. description: A brief description of the transaction (max 100 chars)

Respond ONLY with a valid JSON object in this exact format:
{
  "amount": <number>,
  "vendor": "<string>",
  "category": "<category>",
  "description": "<string>",
  "confidence": <number between 0 and 1>
}

If you cannot parse the message or no amount is found, respond with:
{
  "error": "reason for failure"
}

Examples:
Input: "Rs.500 debited from your account for Amazon Pay"
Output: {"amount": 500, "vendor": "Amazon", "category": "shopping", "description": "Amazon Pay transaction", "confidence": 0.9}

Input: "Your a/c XX1234 debited INR 250.00 at SWIGGY on 15-01-25"
Output: {"amount": 250, "vendor": "Swiggy", "category": "food", "description": "Food delivery from Swiggy", "confidence": 0.95}

Input: "UPI payment of Rs 150 to UBER INDIA received"
Output: {"amount": 150, "vendor": "Uber", "category": "travel", "description": "Uber ride payment", "confidence": 0.9}`;
