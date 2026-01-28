/**
 * OpenTelemetry Browser Instrumentation for Finance Watch
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

// Configuration from environment
const OTLP_ENDPOINT = import.meta.env.VITE_OTLP_ENDPOINT || '';
const OTLP_HEADERS = import.meta.env.VITE_OTLP_HEADERS || '';
const SERVICE_NAME = 'finance-watch-web';
const SERVICE_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

let isInitialized = false;
let currentUserId: string | null = null;
let currentUserEmail: string | null = null;

/**
 * Initialize OpenTelemetry for the browser
 */
export function initTelemetry(): void {
  if (isInitialized) {
    console.log('Telemetry already initialized');
    return;
  }

  if (!OTLP_ENDPOINT) {
    console.log('Telemetry not initialized: no OTLP endpoint configured');
    return;
  }

  try {
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
      [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE,
      'browser.user_agent': navigator.userAgent,
      'browser.language': navigator.language,
    });

    const exporter = new OTLPTraceExporter({
      url: `${OTLP_ENDPOINT}/v1/traces`,
      headers: OTLP_HEADERS ? JSON.parse(OTLP_HEADERS) : {},
    });

    const provider = new WebTracerProvider({
      resource,
    });

    provider.addSpanProcessor(
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 500,
      })
    );

    provider.register({
      contextManager: new ZoneContextManager(),
    });

    // Register auto-instrumentations
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [
            new RegExp(import.meta.env.VITE_API_URL || 'localhost'),
          ],
          clearTimingResources: true,
          applyCustomAttributesOnSpan: (span: Span) => {
            // Add user context to spans
            if (currentUserId) {
              span.setAttribute('enduser.id', currentUserId);
            }
            if (currentUserEmail) {
              span.setAttribute('enduser.email', currentUserEmail);
            }
          },
        }),
        new DocumentLoadInstrumentation(),
        new UserInteractionInstrumentation({
          eventNames: ['click', 'submit'],
        }),
      ],
    });

    isInitialized = true;
    console.log('OpenTelemetry initialized for browser');
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
  }
}

/**
 * Set the current user context for telemetry
 */
export function setTelemetryUser(
  userId: string | null,
  email: string | null,
  name?: string | null
): void {
  currentUserId = userId;
  currentUserEmail = email;

  const span = trace.getActiveSpan();
  if (span && userId) {
    span.setAttribute('enduser.id', userId);
    if (email) span.setAttribute('enduser.email', email);
    if (name) span.setAttribute('enduser.name', name);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearTelemetryUser(): void {
  currentUserId = null;
  currentUserEmail = null;
}

/**
 * Get tracer instance for custom spans
 */
export function getTracer() {
  return trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
}

/**
 * Track a page view
 */
export function trackPageView(pageName: string, path: string): void {
  const tracer = getTracer();
  const span = tracer.startSpan('page_view', {
    attributes: {
      'page.name': pageName,
      'page.path': path,
      'page.url': window.location.href,
      ...(currentUserId && { 'enduser.id': currentUserId }),
    },
  });
  span.end();
}

/**
 * Track user interactions
 */
export function trackUserInteraction(
  action: string,
  target: string,
  additionalAttributes?: Record<string, string | number | boolean>
): void {
  const tracer = getTracer();
  const span = tracer.startSpan('user_interaction', {
    attributes: {
      'interaction.action': action,
      'interaction.target': target,
      ...(currentUserId && { 'enduser.id': currentUserId }),
      ...additionalAttributes,
    },
  });
  span.end();
}

/**
 * Create a custom span for API calls (for manual instrumentation)
 */
export function createApiCallSpan(
  method: string,
  url: string,
  additionalAttributes?: Record<string, string | number>
): Span {
  const tracer = getTracer();
  return tracer.startSpan(`api.${method.toLowerCase()}`, {
    attributes: {
      'http.method': method,
      'http.url': url,
      ...(currentUserId && { 'enduser.id': currentUserId }),
      ...additionalAttributes,
    },
  });
}

/**
 * Record error in telemetry
 */
export function recordTelemetryError(
  error: Error,
  context?: Record<string, string>
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
  }
}
