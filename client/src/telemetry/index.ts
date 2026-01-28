/**
 * Grafana Faro Telemetry for Finance Watch
 *
 * Uses Grafana Faro for frontend observability including:
 * - Real user monitoring (RUM)
 * - Performance metrics (Web Vitals)
 * - Error tracking
 * - Distributed tracing
 * - User session tracking
 */

import {
  initializeFaro,
  getWebInstrumentations,
  LogLevel,
  type Faro,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

// Configuration from environment
const FARO_COLLECTOR_URL = import.meta.env.VITE_FARO_COLLECTOR_URL || '';
const SERVICE_NAME = 'finance-watch-web';
const SERVICE_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const API_URL = import.meta.env.VITE_API_URL || '';

let faro: Faro | null = null;

/**
 * Initialize Grafana Faro for the browser
 */
export function initTelemetry(): Faro | null {
  if (faro) {
    console.log('Faro already initialized');
    return faro;
  }

  if (!FARO_COLLECTOR_URL) {
    console.log('Faro not initialized: no collector URL configured');
    return null;
  }

  try {
    faro = initializeFaro({
      url: FARO_COLLECTOR_URL,
      app: {
        name: SERVICE_NAME,
        version: SERVICE_VERSION,
        environment: import.meta.env.MODE,
      },
      instrumentations: [
        // Web instrumentations (console, errors, web-vitals, session)
        ...getWebInstrumentations({
          captureConsole: true,
          captureConsoleDisabledLevels: [], // Capture all levels
        }),
        // Tracing instrumentation for distributed tracing
        new TracingInstrumentation({
          instrumentationOptions: {
            // Propagate trace headers to API calls
            propagateTraceHeaderCorsUrls: API_URL
              ? [new RegExp(API_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))]
              : [/localhost/],
          },
        }),
      ],
      // Session tracking
      sessionTracking: {
        enabled: true,
        persistent: true,
      },
    });

    console.log('Grafana Faro initialized');
    return faro;
  } catch (error) {
    console.error('Failed to initialize Faro:', error);
    return null;
  }
}

/**
 * Get the Faro instance
 */
export function getFaro(): Faro | null {
  return faro;
}

/**
 * Set the current user context for telemetry
 */
export function setTelemetryUser(
  userId: string | null,
  email: string | null,
  name?: string | null
): void {
  if (!faro || !userId) return;

  faro.api.setUser({
    id: userId,
    email: email || undefined,
    username: name || undefined,
    attributes: {
      provider: 'firebase',
    },
  });
}

/**
 * Clear user context (on logout)
 */
export function clearTelemetryUser(): void {
  if (!faro) return;
  faro.api.resetUser();
}

/**
 * Track a page view
 */
export function trackPageView(pageName: string, path: string): void {
  if (!faro) return;

  faro.api.pushEvent('page_view', {
    page_name: pageName,
    page_path: path,
    page_url: window.location.href,
  });
}

/**
 * Track user interactions
 */
export function trackUserInteraction(
  action: string,
  target: string,
  additionalAttributes?: Record<string, string | number | boolean>
): void {
  if (!faro) return;

  faro.api.pushEvent('user_interaction', {
    action,
    target,
    ...additionalAttributes,
  });
}

/**
 * Push a custom event
 */
export function pushEvent(
  name: string,
  attributes?: Record<string, string>
): void {
  if (!faro) return;
  faro.api.pushEvent(name, attributes);
}

/**
 * Push a log message
 */
export function pushLog(
  message: string,
  level: LogLevel = LogLevel.INFO,
  context?: Record<string, string>
): void {
  if (!faro) return;
  faro.api.pushLog([message], { level, context });
}

// Re-export LogLevel for convenience
export { LogLevel };

/**
 * Record error in telemetry
 */
export function recordTelemetryError(
  error: Error,
  context?: Record<string, string>
): void {
  if (!faro) return;
  faro.api.pushError(error, { context });
}

/**
 * Get OpenTelemetry tracer for custom spans (if tracing is enabled)
 */
export function getTracer() {
  return faro?.api.getOTEL()?.trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
}
