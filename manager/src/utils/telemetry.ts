/**
 * OpenTelemetry Telemetry Utilities
 * Custom instrumentation for Finance Watch API
 *
 * Uses lightweight SDK approach (no ADOT layer) to stay within Lambda size limits
 */

import { trace, SpanStatusCode, SpanKind, context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMATTRS_DB_SYSTEM,
  SEMATTRS_DB_NAME,
  SEMATTRS_DB_OPERATION,
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_URL,
  SEMATTRS_HTTP_STATUS_CODE,
} from '@opentelemetry/semantic-conventions';

// Initialize OpenTelemetry SDK
let isInitialized = false;

function initTelemetry(): void {
  if (isInitialized) return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    console.log('Telemetry not initialized: OTEL_EXPORTER_OTLP_ENDPOINT not configured');
    isInitialized = true; // Mark as initialized to avoid repeated attempts
    return;
  }

  try {
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'finance-watch-api',
      [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.OTEL_RESOURCE_ATTRIBUTES?.split('=')[1] || 'dev',
      'faas.name': process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown',
      'cloud.provider': 'aws',
      'cloud.region': process.env.AWS_REGION || 'unknown',
    });

    // Parse headers from environment (format: "Authorization=Basic xxx")
    const headersStr = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
    const headers: Record<string, string> = {};
    if (headersStr) {
      headersStr.split(',').forEach((header) => {
        const [key, ...valueParts] = header.split('=');
        if (key && valueParts.length > 0) {
          headers[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    const exporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers,
    });

    const provider = new NodeTracerProvider({
      resource,
    });

    // Use BatchSpanProcessor for efficient batching
    provider.addSpanProcessor(
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 1000,
      })
    );

    provider.register();
    isInitialized = true;
    console.log('OpenTelemetry initialized for Lambda');
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
    isInitialized = true; // Mark as initialized to avoid repeated failures
  }
}

// Initialize on module load
initTelemetry();

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
 * Check if this is a cold start and create a root span for the request
 */
let isFirstInvocation = true;
export function checkColdStart(): boolean {
  const wasColdStart = isFirstInvocation;
  isFirstInvocation = false;

  // Try to add cold start attribute to current span
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('faas.cold_start', wasColdStart);
  }

  return wasColdStart;
}

/**
 * Start a new root span for a Lambda invocation
 * Use this to wrap your handler logic
 */
export function startRequestSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    {
      kind: SpanKind.SERVER,
      attributes: {
        ...attributes,
        'faas.trigger': 'http',
      },
    },
    async (span) => {
      try {
        const result = await fn();
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
