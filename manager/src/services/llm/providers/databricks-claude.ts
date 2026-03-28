/**
 * Databricks Claude LLM Provider Implementation
 * Uses Databricks Model Serving endpoints with Claude models
 * API is OpenAI-compatible; Claude requires json_schema (not json_object) for structured output
 */

import {
  ILLMProvider,
  LLMParseResult,
  ParsedExpenseResult,
  ChatMessage,
  ChatCompletionOptions,
  EXPENSE_PARSING_SYSTEM_PROMPT,
} from '../types';
import { logger } from '../../../utils/telemetry';

interface DatabricksClaudeConfig {
  host: string;
  token: string;
  servingEndpoint: string;
}

interface DatabricksResponse {
  choices: {
    message: {
      role: string;
      content: string | ContentBlock[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Claude on Databricks may return content as an array of blocks (e.g. when reasoning is enabled)
interface ContentBlock {
  type: 'text' | 'reasoning';
  text?: string;
  summary?: { type: string; text: string }[];
}

const EXPENSE_JSON_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'parsed_expense',
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        vendor: { type: 'string' },
        category: {
          type: 'string',
          enum: ['food', 'groceries', 'entertainment', 'shopping', 'travel', 'health', 'personal', 'other'],
        },
        description: { type: 'string' },
        confidence: { type: 'number' },
        error: { type: 'string' },
      },
      required: ['amount', 'vendor', 'category', 'description', 'confidence'],
    },
    strict: true,
  },
};

export class DatabricksClaudeProvider implements ILLMProvider {
  readonly name = 'databricks-claude';
  private config: DatabricksClaudeConfig;

  constructor() {
    this.config = {
      host: process.env.DATABRICKS_HOST || '',
      token: process.env.DATABRICKS_TOKEN || '',
      servingEndpoint: process.env.DATABRICKS_SERVING_ENDPOINT || 'databricks-claude-sonnet-4-6',
    };
  }

  isConfigured(): boolean {
    return !!(this.config.host && this.config.token);
  }

  async chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await this.callInvocations(messages, {
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 500,
      });

      if (!response.choices || response.choices.length === 0) {
        return null;
      }

      return this.extractTextContent(response.choices[0].message.content);
    } catch (err) {
      logger.error('Databricks Claude chat completion error', { error: String(err) });
      return null;
    }
  }

  async parseExpenseMessage(message: string): Promise<LLMParseResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Databricks Claude is not configured. Please set DATABRICKS_HOST and DATABRICKS_TOKEN.',
      };
    }

    try {
      const response = await this.callInvocations([
        { role: 'system', content: EXPENSE_PARSING_SYSTEM_PROMPT },
        { role: 'user', content: message },
      ], undefined);

      if (!response.choices || response.choices.length === 0) {
        return {
          success: false,
          error: 'No response from Databricks Claude',
        };
      }

      const content = this.extractTextContent(response.choices[0].message.content);
      const parsed = this.parseJSONResponse(content);

      if ('error' in parsed && !('amount' in parsed)) {
        return { success: false, error: parsed.error };
      }

      const validationError = this.validateParsedResult(parsed as ParsedExpenseResult);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const result = parsed as ParsedExpenseResult;
      return {
        success: true,
        data: {
          amount: result.amount,
          description: result.description.substring(0, 100),
          vendor: result.vendor || '',
          category: result.category,
          date: new Date().toISOString().split('T')[0],
          confidence: result.confidence || 0.8,
        },
      };
    } catch (err) {
      logger.error('Databricks Claude parsing error', { error: String(err) });
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      };
    }
  }

  private async callInvocations(
    messages: { role: string; content: string }[],
    opts?: { temperature?: number; maxTokens?: number },
  ): Promise<DatabricksResponse> {
    const url = `${this.config.host}/serving-endpoints/${this.config.servingEndpoint}/invocations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.token}`,
      },
      body: JSON.stringify({
        messages,
        max_tokens: opts?.maxTokens ?? 500,
        temperature: opts?.temperature ?? 0.1,
        ...(opts ? {} : { response_format: EXPENSE_JSON_SCHEMA }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Databricks API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<DatabricksResponse>;
  }

  /**
   * Databricks Claude may return content as a string or an array of content blocks
   * (e.g. when extended thinking is enabled). Extract the text from either format.
   */
  private extractTextContent(content: string | ContentBlock[]): string {
    if (typeof content === 'string') {
      return content.trim();
    }

    // Content is an array of blocks — find the text block
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        return block.text.trim();
      }
    }

    throw new Error('No text content found in Databricks Claude response');
  }

  private parseJSONResponse(content: string): ParsedExpenseResult | { error: string } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: 'No JSON found in response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.error && !parsed.amount) {
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
      'travel', 'health', 'personal', 'other',
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
