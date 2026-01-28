/**
 * Web Vitals instrumentation for Core Web Vitals metrics
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';
import { getTracer } from './index';

function sendWebVitalMetric(metric: Metric): void {
  const tracer = getTracer();

  const span = tracer.startSpan(`web_vital.${metric.name.toLowerCase()}`, {
    attributes: {
      'web_vital.name': metric.name,
      'web_vital.value': metric.value,
      'web_vital.delta': metric.delta,
      'web_vital.id': metric.id,
      'web_vital.rating': metric.rating,
      'web_vital.navigation_type': metric.navigationType,
      'page.url': window.location.href,
      'page.path': window.location.pathname,
    },
  });

  span.end();

  console.log(`Web Vital: ${metric.name} = ${metric.value} (${metric.rating})`);
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(): void {
  // Cumulative Layout Shift
  onCLS(sendWebVitalMetric);

  // First Input Delay (deprecated, but still useful)
  onFID(sendWebVitalMetric);

  // First Contentful Paint
  onFCP(sendWebVitalMetric);

  // Largest Contentful Paint
  onLCP(sendWebVitalMetric);

  // Time to First Byte
  onTTFB(sendWebVitalMetric);

  // Interaction to Next Paint (new metric replacing FID)
  onINP(sendWebVitalMetric);

  console.log('Web Vitals monitoring initialized');
}
