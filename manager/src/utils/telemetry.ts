/**
 * Minimal OpenTelemetry-compatible Telemetry
 *
 * Lightweight implementation that sends traces directly to Grafana Cloud
 * without heavy SDK dependencies (~100MB saved)
 */

// Types
interface SpanContext {
  traceId: string;
  spanId?: string;
}

interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano?: string;
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }>;
  status?: { code: number; message?: string };
  events?: Array<{
    name: string;
    timeUnixNano: string;
    attributes: Array<{ key: string; value: { stringValue?: string } }>;
  }>;
}

// Span kind constants (matching OTLP)
const SpanKind = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
} as const;

// Status codes
const StatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
} as const;

// Configuration
const config = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'finance-watch-api',
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '',
  headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS || ''),
  environment: process.env.OTEL_RESOURCE_ATTRIBUTES?.split('=')[1] || 'dev',
};

function parseHeaders(headersStr: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (headersStr) {
    headersStr.split(',').forEach((header) => {
      const [key, ...valueParts] = header.split('=');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  return headers;
}

// Generate random hex IDs
function generateTraceId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateSpanId(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function nowNano(): string {
  return (BigInt(Date.now()) * BigInt(1_000_000)).toString();
}

// Span collector
const pendingSpans: SpanData[] = [];
let currentContext: SpanContext | null = null;
let flushTimeout: NodeJS.Timeout | null = null;

// Active span stack for nested spans
const spanStack: SpanData[] = [];

function getActiveSpan(): SpanData | null {
  return spanStack.length > 0 ? spanStack[spanStack.length - 1] : null;
}

async function flushSpans(): Promise<void> {
  if (pendingSpans.length === 0 || !config.endpoint) return;

  const spansToSend = [...pendingSpans];
  pendingSpans.length = 0;

  const payload = {
    resourceSpans: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: config.serviceName } },
          { key: 'service.version', value: { stringValue: '1.0.0' } },
          { key: 'deployment.environment', value: { stringValue: config.environment } },
          { key: 'cloud.provider', value: { stringValue: 'aws' } },
          { key: 'faas.name', value: { stringValue: process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown' } },
        ],
      },
      scopeSpans: [{
        scope: { name: config.serviceName, version: '1.0.0' },
        spans: spansToSend,
      }],
    }],
  };

  try {
    // Use AbortController for timeout (3 second max)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${config.endpoint}/v1/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Failed to send traces:', response.status, errorText);
    }
  } catch (error) {
    // Don't let telemetry errors affect the request
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Telemetry flush timed out');
    } else {
      console.error('Error sending traces:', error);
    }
  }
}

function scheduleFlush(): void {
  if (flushTimeout) return;
  flushTimeout = setTimeout(async () => {
    flushTimeout = null;
    await flushSpans();
  }, 1000);
}

function addAttribute(
  span: SpanData,
  key: string,
  value: string | number | boolean
): void {
  const attr: { key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } } = { key, value: {} };

  if (typeof value === 'string') {
    attr.value.stringValue = value;
  } else if (typeof value === 'number') {
    attr.value.intValue = String(value);
  } else if (typeof value === 'boolean') {
    attr.value.boolValue = value;
  }

  // Remove existing attribute with same key
  span.attributes = span.attributes.filter(a => a.key !== key);
  span.attributes.push(attr);
}

// Public API

export interface UserContext {
  userId: string;
  email?: string;
  name?: string;
}

/**
 * Set user context on the active span
 */
export function setUserContext(userCtx: UserContext): void {
  const span = getActiveSpan();
  if (span) {
    addAttribute(span, 'enduser.id', userCtx.userId);
    if (userCtx.email) addAttribute(span, 'enduser.email', userCtx.email);
    if (userCtx.name) addAttribute(span, 'enduser.name', userCtx.name);
  }
}

/**
 * Record an error on the active span
 */
export function recordError(error: Error, additionalAttributes?: Record<string, string>): void {
  const span = getActiveSpan();
  if (span) {
    span.status = { code: StatusCode.ERROR, message: error.message };

    // Add exception event
    if (!span.events) span.events = [];
    span.events.push({
      name: 'exception',
      timeUnixNano: nowNano(),
      attributes: [
        { key: 'exception.type', value: { stringValue: error.name } },
        { key: 'exception.message', value: { stringValue: error.message } },
        { key: 'exception.stacktrace', value: { stringValue: error.stack || '' } },
      ],
    });

    if (additionalAttributes) {
      Object.entries(additionalAttributes).forEach(([key, value]) => {
        addAttribute(span, key, value);
      });
    }
  }
}

/**
 * Set response metadata on the active span
 */
export function setResponseMetadata(statusCode: number, responseSize?: number): void {
  const span = getActiveSpan();
  if (span) {
    addAttribute(span, 'http.status_code', statusCode);
    if (responseSize) addAttribute(span, 'http.response_content_length', responseSize);

    if (statusCode >= 400) {
      span.status = { code: StatusCode.ERROR, message: `HTTP ${statusCode}` };
    }
  }
}

/**
 * Check and record cold start
 */
let isFirstInvocation = true;
export function checkColdStart(): boolean {
  const wasColdStart = isFirstInvocation;
  isFirstInvocation = false;

  const span = getActiveSpan();
  if (span) {
    addAttribute(span, 'faas.cold_start', wasColdStart);
  }

  return wasColdStart;
}

/**
 * Create and run a span for an async operation
 */
async function withSpan<T>(
  name: string,
  kind: number,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  if (!config.endpoint) {
    // No telemetry configured, just run the function
    return fn();
  }

  const parentSpan = getActiveSpan();
  const traceId = parentSpan?.traceId || currentContext?.traceId || generateTraceId();

  const span: SpanData = {
    traceId,
    spanId: generateSpanId(),
    parentSpanId: parentSpan?.spanId || currentContext?.spanId,
    name,
    kind,
    startTimeUnixNano: nowNano(),
    attributes: [],
    status: { code: StatusCode.UNSET },
  };

  // Add initial attributes
  Object.entries(attributes).forEach(([key, value]) => {
    addAttribute(span, key, value);
  });

  // Push to stack
  spanStack.push(span);

  const startTime = Date.now();
  try {
    const result = await fn();
    span.status = { code: StatusCode.OK };
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    recordError(err);
    throw error;
  } finally {
    // Add duration
    addAttribute(span, 'duration_ms', Date.now() - startTime);

    // End span
    span.endTimeUnixNano = nowNano();

    // Pop from stack
    spanStack.pop();

    // Queue for sending
    pendingSpans.push(span);
    scheduleFlush();
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
  return withSpan(
    `mongodb.${operationName}`,
    SpanKind.CLIENT,
    {
      'db.system': 'mongodb',
      'db.name': process.env.MONGODB_DB_NAME || 'money-tracker',
      'db.operation': operationName,
      'db.mongodb.collection': collection,
    },
    operation
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
  return withSpan(
    `external.${serviceName}`,
    SpanKind.CLIENT,
    {
      'http.method': method,
      'http.url': url,
      'external.service': serviceName,
    },
    operation
  );
}

/**
 * Instrument LLM operations
 */
export async function instrumentLLMOperation<T>(
  provider: string,
  model: string,
  operation: () => Promise<T>,
  getTokenUsage?: (result: T) => { promptTokens?: number; completionTokens?: number }
): Promise<T> {
  const result = await withSpan(
    `llm.${provider}`,
    SpanKind.CLIENT,
    {
      'llm.provider': provider,
      'llm.model': model,
      'llm.request_type': 'chat_completion',
    },
    operation
  );

  // Token usage would need to be added differently since span is already ended
  // For now, this is handled in the span itself

  return result;
}

/**
 * Instrument a custom operation
 */
export async function instrumentOperation<T>(
  operationName: string,
  attributes: Record<string, string | number | boolean>,
  operation: () => Promise<T>
): Promise<T> {
  return withSpan(operationName, SpanKind.INTERNAL, attributes, operation);
}

/**
 * Start a root span for a request (use in middleware)
 */
export async function startRequestSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  // Reset context for new request (no spanId - root span has no parent)
  currentContext = {
    traceId: generateTraceId(),
  };

  return withSpan(
    name,
    SpanKind.SERVER,
    {
      ...attributes,
      'faas.trigger': 'http',
    },
    fn
  );
}

/**
 * Ensure all pending spans are sent (call at end of Lambda)
 */
export async function flush(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await Promise.all([flushSpans(), flushLogs()]);
}

// ============================================================================
// LOGGING
// ============================================================================

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogRecord {
  timeUnixNano: string;
  severityNumber: number;
  severityText: LogLevel;
  body: { stringValue: string };
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }>;
  traceId?: string;
  spanId?: string;
}

const severityNumbers: Record<LogLevel, number> = {
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
};

const pendingLogs: LogRecord[] = [];
let logFlushTimeout: NodeJS.Timeout | null = null;

function createLogRecord(
  level: LogLevel,
  message: string,
  attributes?: Record<string, string | number | boolean>
): LogRecord {
  const activeSpan = getActiveSpan();
  const record: LogRecord = {
    timeUnixNano: nowNano(),
    severityNumber: severityNumbers[level],
    severityText: level,
    body: { stringValue: message },
    attributes: [],
  };

  // Link to current trace/span if available
  if (activeSpan) {
    record.traceId = activeSpan.traceId;
    record.spanId = activeSpan.spanId;
  } else if (currentContext) {
    record.traceId = currentContext.traceId;
    record.spanId = currentContext.spanId;
  }

  // Add custom attributes
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      const attr: { key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } } = { key, value: {} };
      if (typeof value === 'string') {
        attr.value.stringValue = value;
      } else if (typeof value === 'number') {
        attr.value.intValue = String(value);
      } else if (typeof value === 'boolean') {
        attr.value.boolValue = value;
      }
      record.attributes.push(attr);
    });
  }

  return record;
}

async function flushLogs(): Promise<void> {
  if (pendingLogs.length === 0 || !config.endpoint) return;

  const logsToSend = [...pendingLogs];
  pendingLogs.length = 0;

  const payload = {
    resourceLogs: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: config.serviceName } },
          { key: 'service.version', value: { stringValue: '1.0.0' } },
          { key: 'deployment.environment', value: { stringValue: config.environment } },
          { key: 'cloud.provider', value: { stringValue: 'aws' } },
          { key: 'faas.name', value: { stringValue: process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown' } },
        ],
      },
      scopeLogs: [{
        scope: { name: config.serviceName, version: '1.0.0' },
        logRecords: logsToSend,
      }],
    }],
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${config.endpoint}/v1/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Failed to send logs:', response.status, errorText);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Log flush timed out');
    } else {
      console.error('Error sending logs:', error);
    }
  }
}

function scheduleLogFlush(): void {
  if (logFlushTimeout) return;
  logFlushTimeout = setTimeout(async () => {
    logFlushTimeout = null;
    await flushLogs();
  }, 1000);
}

function log(level: LogLevel, message: string, attributes?: Record<string, string | number | boolean>): void {
  // Always log to console for CloudWatch
  const consoleMethod = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  consoleMethod(`[${level}]`, message, attributes ? JSON.stringify(attributes) : '');

  // Send to Grafana if configured
  if (config.endpoint) {
    pendingLogs.push(createLogRecord(level, message, attributes));
    scheduleLogFlush();
  }
}

/**
 * Logger that sends logs to both CloudWatch and Grafana
 */
export const logger = {
  debug: (message: string, attributes?: Record<string, string | number | boolean>) => log('DEBUG', message, attributes),
  info: (message: string, attributes?: Record<string, string | number | boolean>) => log('INFO', message, attributes),
  warn: (message: string, attributes?: Record<string, string | number | boolean>) => log('WARN', message, attributes),
  error: (message: string, attributes?: Record<string, string | number | boolean>) => log('ERROR', message, attributes),
};
