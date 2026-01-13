import * as admin from 'firebase-admin';
import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuthenticatedEvent, LambdaHandler } from '../types';
import { unauthorized } from '../utils/response';

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

      return handler(event);
    } catch (err) {
      console.error('Auth error:', err);
      return unauthorized('Invalid or expired token');
    }
  };
};
