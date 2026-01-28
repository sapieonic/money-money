/**
 * OpenTelemetry Telemetry Utilities
 * Custom instrumentation for Finance Watch API
 */

import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import {
  SEMATTRS_DB_SYSTEM,
  SEMATTRS_DB_NAME,
  SEMATTRS_DB_OPERATION,
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_URL,
  SEMATTRS_HTTP_STATUS_CODE,
} from '@opentelemetry/semantic-conventions';

const tracer = trace.getTracer('finance-watch-api', '1.0.0');

export interface UserContext {
  userId: string;
  email?: string;
  name?: string;
}

/**
 * Add user context attributes to the current span
 */
export function setUserContext(userCtx: UserContext): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('enduser.id', userCtx.userId);
    if (userCtx.email) {
      span.setAttribute('enduser.email', userCtx.email);
    }
    if (userCtx.name) {
      span.setAttribute('enduser.name', userCtx.name);
    }
  }
}

/**
 * Record an error with stack trace on the current span
 */
export function recordError(
  error: Error,
  additionalAttributes?: Record<string, string>
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    if (additionalAttributes) {
      Object.entries(additionalAttributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
  }
}

/**
 * Instrument a database operation
 */
export async function instrumentDatabaseOperation<T>(
  operationName: string,
  collection: string,
  operation: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `mongodb.${operationName}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        [SEMATTRS_DB_SYSTEM]: 'mongodb',
        [SEMATTRS_DB_NAME]: process.env.MONGODB_DB_NAME || 'money-tracker',
        [SEMATTRS_DB_OPERATION]: operationName,
        'db.mongodb.collection': collection,
      },
    },
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await operation();
        span.setAttribute('db.operation.duration_ms', Date.now() - startTime);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Instrument an external HTTP API call
 */
export async function instrumentExternalCall<T>(
  serviceName: string,
  url: string,
  method: string,
  operation: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `external.${serviceName}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        [SEMATTRS_HTTP_METHOD]: method,
        [SEMATTRS_HTTP_URL]: url,
        'external.service': serviceName,
      },
    },
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await operation();
        span.setAttribute('http.response_time_ms', Date.now() - startTime);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Instrument LLM operations with token tracking
 */
export async function instrumentLLMOperation<T>(
  provider: string,
  model: string,
  operation: () => Promise<T>,
  getTokenUsage?: (result: T) => {
    promptTokens?: number;
    completionTokens?: number;
  }
): Promise<T> {
  return tracer.startActiveSpan(
    `llm.${provider}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'llm.provider': provider,
        'llm.model': model,
        'llm.request_type': 'chat_completion',
      },
    },
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await operation();
        span.setAttribute('llm.response_time_ms', Date.now() - startTime);

        if (getTokenUsage) {
          const usage = getTokenUsage(result);
          if (usage.promptTokens)
            span.setAttribute('llm.prompt_tokens', usage.promptTokens);
          if (usage.completionTokens)
            span.setAttribute('llm.completion_tokens', usage.completionTokens);
          if (usage.promptTokens && usage.completionTokens) {
            span.setAttribute(
              'llm.total_tokens',
              usage.promptTokens + usage.completionTokens
            );
          }
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Create a custom span for business operations
 */
export async function instrumentOperation<T>(
  operationName: string,
  attributes: Record<string, string | number | boolean>,
  operation: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    operationName,
    {
      kind: SpanKind.INTERNAL,
      attributes,
    },
    async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Add response metadata to the current span
 */
export function setResponseMetadata(
  statusCode: number,
  responseSize?: number
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, statusCode);
    if (responseSize) {
      span.setAttribute('http.response_content_length', responseSize);
    }

    if (statusCode >= 400 && statusCode < 500) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `Client error: ${statusCode}`,
      });
    } else if (statusCode >= 500) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `Server error: ${statusCode}`,
      });
    }
  }
}

/**
 * Check if this is a cold start
 */
let isFirstInvocation = true;
export function checkColdStart(): boolean {
  const span = trace.getActiveSpan();
  const wasColdStart = isFirstInvocation;

  if (span) {
    span.setAttribute('faas.cold_start', wasColdStart);
  }

  isFirstInvocation = false;
  return wasColdStart;
}
