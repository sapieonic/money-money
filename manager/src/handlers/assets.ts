import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { Asset } from '../models/Asset';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';
import { logger } from '../utils/telemetry';

export const getAll = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const includeSold = event.queryStringParameters?.includeSold === 'true';

    const query: Record<string, unknown> = { userId: event.userId };

    if (!includeSold) {
      query.isSold = false;
    }

    const assets = await Asset.find(query).sort({ currentValueINR: -1 });

    return success(assets);
  } catch (err) {
    logger.error('Error fetching assets', { error: String(err) });
    return error('Failed to fetch assets');
  }
});

export const create = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');

    if (!body.name || body.currentValueINR === undefined) {
      return badRequest('Name and currentValueINR are required');
    }

    const asset = await Asset.create({
      userId: event.userId,
      name: body.name,
      category: body.category || 'other',
      quantity: body.quantity || 0,
      currentValueINR: body.currentValueINR,
      currentValueUSD: body.currentValueUSD || 0,
      currency: body.currency || 'INR',
      platform: body.platform || '',
      valueHistory: [
        {
          date: new Date(),
          valueINR: body.currentValueINR,
          valueUSD: body.currentValueUSD || 0,
        },
      ],
      isSold: false,
    });

    return success(asset, 201);
  } catch (err) {
    logger.error('Error creating asset', { error: String(err) });
    return error('Failed to create asset');
  }
});

export const update = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Asset ID is required');
    }

    const asset = await Asset.findOneAndUpdate(
      { _id: id, userId: event.userId },
      {
        ...(body.name && { name: body.name }),
        ...(body.category && { category: body.category }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.currency && { currency: body.currency }),
        ...(body.platform && { platform: body.platform }),
      },
      { new: true }
    );

    if (!asset) {
      return notFound('Asset not found');
    }

    return success(asset);
  } catch (err) {
    logger.error('Error updating asset', { error: String(err) });
    return error('Failed to update asset');
  }
});

export const updateValue = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Asset ID is required');
    }

    if (body.currentValueINR === undefined) {
      return badRequest('currentValueINR is required');
    }

    const asset = await Asset.findOne({ _id: id, userId: event.userId });

    if (!asset) {
      return notFound('Asset not found');
    }

    // Add to value history
    asset.valueHistory.push({
      date: new Date(),
      valueINR: body.currentValueINR,
      valueUSD: body.currentValueUSD || 0,
    });

    // Keep only last 100 history entries
    if (asset.valueHistory.length > 100) {
      asset.valueHistory = asset.valueHistory.slice(-100);
    }

    asset.currentValueINR = body.currentValueINR;
    asset.currentValueUSD = body.currentValueUSD || asset.currentValueUSD;

    await asset.save();

    return success(asset);
  } catch (err) {
    logger.error('Error updating asset value', { error: String(err) });
    return error('Failed to update asset value');
  }
});

export const remove = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const hardDelete = event.queryStringParameters?.hard === 'true';

    if (!id) {
      return badRequest('Asset ID is required');
    }

    if (hardDelete) {
      const result = await Asset.findOneAndDelete({ _id: id, userId: event.userId });

      if (!result) {
        return notFound('Asset not found');
      }
    } else {
      const asset = await Asset.findOneAndUpdate(
        { _id: id, userId: event.userId },
        { isSold: true },
        { new: true }
      );

      if (!asset) {
        return notFound('Asset not found');
      }
    }

    return success({ message: 'Asset deleted successfully' });
  } catch (err) {
    logger.error('Error deleting asset', { error: String(err) });
    return error('Failed to delete asset');
  }
});
