import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { User } from '../models/User';
import { success, error, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';
import { logger } from '../utils/telemetry';

export const get = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    let user = await User.findOne({ firebaseUid: event.userId });

    // Create user if doesn't exist
    if (!user) {
      user = await User.create({
        firebaseUid: event.userId,
        email: event.userInfo?.email || 'user@example.com',
        name: event.userInfo?.name || 'User',
        picture: event.userInfo?.picture,
        settings: {
          currency: 'INR',
          exchangeRates: { USD: 89 },
          theme: 'light',
        },
      });
    } else {
      // Update user info if it has changed (e.g., Google profile updated)
      const updates: Record<string, string> = {};
      if (event.userInfo?.email && user.email !== event.userInfo.email) {
        updates.email = event.userInfo.email;
      }
      if (event.userInfo?.name && user.name !== event.userInfo.name) {
        updates.name = event.userInfo.name;
      }
      if (event.userInfo?.picture && user.picture !== event.userInfo.picture) {
        updates.picture = event.userInfo.picture;
      }
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ firebaseUid: event.userId }, { $set: updates });
        Object.assign(user, updates);
      }
    }

    return success({
      ...user.settings,
      emailPreferences: user.emailPreferences || { weeklyExpenseSummary: true },
    });
  } catch (err) {
    logger.error('Error fetching settings', { error: String(err) });
    return error('Failed to fetch settings');
  }
});

export const update = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');

    const updateData: Record<string, unknown> = {};

    if (body.currency) {
      updateData['settings.currency'] = body.currency;
    }

    if (body.exchangeRates) {
      if (typeof body.exchangeRates !== 'object') {
        return badRequest('exchangeRates must be an object');
      }
      updateData['settings.exchangeRates'] = body.exchangeRates;
    }

    if (body.theme) {
      if (!['light', 'dark'].includes(body.theme)) {
        return badRequest('theme must be either "light" or "dark"');
      }
      updateData['settings.theme'] = body.theme;
    }

    if (body.email) {
      updateData.email = body.email;
    }

    if (body.name) {
      updateData.name = body.name;
    }

    // Email preferences
    if (body.emailPreferences !== undefined) {
      if (typeof body.emailPreferences === 'object') {
        if (body.emailPreferences.weeklyExpenseSummary !== undefined) {
          updateData['emailPreferences.weeklyExpenseSummary'] = Boolean(body.emailPreferences.weeklyExpenseSummary);
        }
      }
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: event.userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return success({
      ...user?.settings,
      emailPreferences: user?.emailPreferences || { weeklyExpenseSummary: true },
    });
  } catch (err) {
    logger.error('Error updating settings', { error: String(err) });
    return error('Failed to update settings');
  }
});
