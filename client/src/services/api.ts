import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getIdToken } from './firebase';
import { createApiCallSpan, recordTelemetryError } from '../telemetry';
import { SpanStatusCode } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store spans for correlation
const requestSpans = new WeakMap<InternalAxiosRequestConfig, Span>();

// Extend config type to include metadata
interface ConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata?: { startTime: number };
}

// Request interceptor to add auth token and start span
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Start telemetry span
    const span = createApiCallSpan(
      config.method?.toUpperCase() || 'GET',
      config.url || '',
      {
        'http.base_url': API_URL,
      }
    );
    requestSpans.set(config, span);

    // Add auth token
    const token = await getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Record request start time
    (config as ConfigWithMetadata).metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and span completion
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const span = requestSpans.get(response.config);
    if (span) {
      const configWithMetadata = response.config as ConfigWithMetadata;
      const duration = Date.now() - (configWithMetadata.metadata?.startTime || Date.now());
      span.setAttribute('http.status_code', response.status);
      span.setAttribute('http.response_time_ms', duration);
      span.setAttribute('http.response_content_length', JSON.stringify(response.data).length);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      requestSpans.delete(response.config);
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.config) {
      const span = requestSpans.get(error.config);
      if (span) {
        const configWithMetadata = error.config as ConfigWithMetadata;
        const duration = Date.now() - (configWithMetadata.metadata?.startTime || Date.now());
        span.setAttribute('http.response_time_ms', duration);

        if (error.response) {
          span.setAttribute('http.status_code', error.response.status);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${error.response.status}: ${error.message}`,
          });
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message || 'Network error',
          });
        }

        span.recordException(error);
        span.end();
        requestSpans.delete(error.config);
      }
    }

    // Record error in telemetry
    if (error instanceof Error) {
      recordTelemetryError(error, { 'api.url': error.config?.url || 'unknown' });
    }

    if (error.response?.status === 401) {
      // Handle unauthorized - could redirect to login
      console.error('Unauthorized request');
    }

    return Promise.reject(error);
  }
);

export default api;
