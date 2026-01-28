/**
 * Azure OpenAI LLM Provider Implementation
 */

import {
  ILLMProvider,
  LLMParseResult,
  ParsedExpenseResult,
  EXPENSE_PARSING_SYSTEM_PROMPT,
} from '../types';
import { logger } from '../../../utils/telemetry';

interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AzureOpenAIResponse {
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AzureOpenAIProvider implements ILLMProvider {
  readonly name = 'azure-openai';
  private config: AzureOpenAIConfig;

  constructor() {
    this.config = {
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    };
  }

  isConfigured(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.endpoint &&
      this.config.deployment
    );
  }

  async parseExpenseMessage(message: string): Promise<LLMParseResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Azure OpenAI is not configured. Please set required environment variables.',
      };
    }

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: EXPENSE_PARSING_SYSTEM_PROMPT },
        { role: 'user', content: message },
      ];

      const response = await this.callChatCompletion(messages);

      if (!response.choices || response.choices.length === 0) {
        return {
          success: false,
          error: 'No response from Azure OpenAI',
        };
      }

      const content = response.choices[0].message.content.trim();

      // Parse the JSON response
      const parsed = this.parseJSONResponse(content);

      if ('error' in parsed) {
        return {
          success: false,
          error: parsed.error,
        };
      }

      // Validate the parsed result
      const validationError = this.validateParsedResult(parsed);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      return {
        success: true,
        data: {
          amount: parsed.amount,
          description: parsed.description.substring(0, 100),
          vendor: parsed.vendor || '',
          category: parsed.category,
          date: new Date().toISOString().split('T')[0],
          confidence: parsed.confidence || 0.8,
        },
      };
    } catch (err) {
      logger.error('Azure OpenAI parsing error', { error: String(err) });
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      };
    }
  }

  private async callChatCompletion(messages: ChatMessage[]): Promise<AzureOpenAIResponse> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deployment}/chat/completions?api-version=${this.config.apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        messages,
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<AzureOpenAIResponse>;
  }

  private parseJSONResponse(content: string): ParsedExpenseResult | { error: string } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: 'No JSON found in response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Check if it's an error response
      if (parsed.error) {
        return { error: parsed.error };
      }

      return parsed;
    } catch (err) {
      logger.error('JSON parsing error', { error: String(err), content });
      return { error: 'Failed to parse LLM response as JSON' };
    }
  }

  private validateParsedResult(result: ParsedExpenseResult): string | null {
    if (typeof result.amount !== 'number' || result.amount <= 0) {
      return 'Invalid or missing amount';
    }

    const validCategories = [
      'food', 'groceries', 'entertainment', 'shopping',
      'travel', 'health', 'personal', 'other'
    ];

    if (!validCategories.includes(result.category)) {
      return `Invalid category: ${result.category}`;
    }

    if (!result.description || typeof result.description !== 'string') {
      return 'Missing description';
    }

    return null;
  }
}
