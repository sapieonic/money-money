import * as admin from 'firebase-admin';
import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuthenticatedEvent, LambdaHandler } from '../types';
import { unauthorized } from '../utils/response';
import { setUserContext, checkColdStart, recordError, startRequestSpan, flush } from '../utils/telemetry';

let firebaseApp: admin.app.App | null = null;

const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  return firebaseApp;
};

export const withAuth = (handler: LambdaHandler) => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    // Extract route info for span name
    const method = event.requestContext?.http?.method || 'UNKNOWN';
    const path = event.requestContext?.http?.path || event.rawPath || '/unknown';
    const spanName = `${method} ${path}`;

    // Wrap the entire request in a span
    const result = await startRequestSpan(
      spanName,
      {
        'http.method': method,
        'http.route': path,
        'http.target': event.rawPath || path,
      },
      async () => {
        // Check for cold start at the beginning of each invocation
        checkColdStart();

        try {
          const authHeader = event.headers?.authorization || event.headers?.Authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorized('Missing or invalid authorization header');
          }

          const token = authHeader.split('Bearer ')[1];

          if (!token) {
            return unauthorized('Missing token');
          }

          initializeFirebase();

          const decodedToken = await admin.auth().verifyIdToken(token);
          event.userId = decodedToken.uid;
          event.userInfo = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
          };

          // Add user context to telemetry span
          setUserContext({
            userId: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
          });

          return handler(event);
        } catch (err) {
          console.error('Auth error:', err);
          if (err instanceof Error) {
            recordError(err, { 'auth.error_type': 'token_verification' });
          }
          return unauthorized('Invalid or expired token');
        }
      }
    );

    // Flush telemetry before Lambda freezes
    await flush();

    return result;
  };
};
