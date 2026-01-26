/**
 * Fallback Provider - Uses regex-based parsing when no LLM is configured
 */

import { ILLMProvider, LLMParseResult } from '../types';

export class FallbackProvider implements ILLMProvider {
  readonly name = 'fallback';

  isConfigured(): boolean {
    return true; // Always configured as fallback
  }

  async parseExpenseMessage(message: string): Promise<LLMParseResult> {
    // Match patterns like: Rs.250, Rs 250, INR 250, ₹250, Rs.2,500.00, Rupees 500
    const amountMatch = message.match(/(?:Rs\.?|INR|Rupees|₹)\s*([\d,]+(?:\.\d{2})?)/i);

    if (!amountMatch) {
      return {
        success: false,
        error: 'Could not find an amount in the message',
      };
    }

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Invalid amount parsed',
      };
    }

    // Try to extract vendor from common patterns
    let vendor = '';
    const vendorPatterns = [
      /(?:at|to|from|@)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+for|\.|$)/i,
      /(?:paid|debited|credited)\s+(?:to|from)\s+([A-Za-z0-9\s]+?)(?:\s+on|\.|$)/i,
    ];

    for (const pattern of vendorPatterns) {
      const match = message.match(pattern);
      if (match) {
        vendor = match[1].trim().substring(0, 50);
        break;
      }
    }

    // Simple category detection based on keywords
    const category = this.detectCategory(message, vendor);

    return {
      success: true,
      data: {
        amount,
        description: message.substring(0, 100).trim(),
        vendor,
        category,
        date: new Date().toISOString().split('T')[0],
        confidence: 0.5, // Lower confidence for regex-based parsing
      },
    };
  }

  private detectCategory(
    message: string,
    vendor: string
  ): 'food' | 'groceries' | 'entertainment' | 'shopping' | 'travel' | 'health' | 'personal' | 'other' {
    const text = `${message} ${vendor}`.toLowerCase();

    // Food delivery and restaurants
    if (/swiggy|zomato|dominos|pizza|restaurant|cafe|food|dining|eat/i.test(text)) {
      return 'food';
    }

    // Groceries
    if (/grocery|bigbasket|blinkit|zepto|supermarket|vegetables|milk/i.test(text)) {
      return 'groceries';
    }

    // Travel
    if (/uber|ola|rapido|cab|taxi|petrol|fuel|diesel|irctc|flight|train/i.test(text)) {
      return 'travel';
    }

    // Shopping
    if (/amazon|flipkart|myntra|ajio|shopping|mall|retail/i.test(text)) {
      return 'shopping';
    }

    // Entertainment
    if (/netflix|spotify|hotstar|prime|movie|cinema|game|bookmyshow/i.test(text)) {
      return 'entertainment';
    }

    // Health
    if (/pharmacy|medical|hospital|doctor|clinic|medicine|apollo|1mg|pharmeasy/i.test(text)) {
      return 'health';
    }

    return 'other';
  }
}
