import { APIGatewayProxyResultV2 } from 'aws-lambda';

export const success = <T>(data: T, statusCode = 200): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    success: true,
    data,
  }),
});

export const error = (
  message: string,
  statusCode = 500
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    success: false,
    error: message,
  }),
});

export const notFound = (message = 'Resource not found'): APIGatewayProxyResultV2 =>
  error(message, 404);

export const badRequest = (message = 'Bad request'): APIGatewayProxyResultV2 =>
  error(message, 400);

export const unauthorized = (message = 'Unauthorized'): APIGatewayProxyResultV2 =>
  error(message, 401);
