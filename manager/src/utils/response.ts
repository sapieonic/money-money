import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { setResponseMetadata } from './telemetry';

export const success = <T>(data: T, statusCode = 200): APIGatewayProxyResultV2 => {
  const body = JSON.stringify({
    success: true,
    data,
  });

  // Add response metadata to telemetry
  setResponseMetadata(statusCode, body.length);

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  };
};

export const error = (
  message: string,
  statusCode = 500
): APIGatewayProxyResultV2 => {
  const body = JSON.stringify({
    success: false,
    error: message,
  });

  // Add response metadata to telemetry
  setResponseMetadata(statusCode, body.length);

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  };
};

export const notFound = (message = 'Resource not found'): APIGatewayProxyResultV2 =>
  error(message, 404);

export const badRequest = (message = 'Bad request'): APIGatewayProxyResultV2 =>
  error(message, 400);

export const unauthorized = (message = 'Unauthorized'): APIGatewayProxyResultV2 =>
  error(message, 401);
