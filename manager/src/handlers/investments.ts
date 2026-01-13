import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { Investment } from '../models/Investment';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';

export const getAll = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const type = event.queryStringParameters?.type;

    const query: Record<string, unknown> = {
      userId: event.userId,
      status: { $ne: 'stopped' },
    };

    if (type && (type === 'sip' || type === 'voluntary')) {
      query.type = type;
    }

    const investments = await Investment.find(query).sort({ createdAt: -1 });

    return success(investments);
  } catch (err) {
    console.error('Error fetching investments:', err);
    return error('Failed to fetch investments');
  }
});

export const create = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');

    if (!body.name || body.amount === undefined || !body.type) {
      return badRequest('Name, amount, and type are required');
    }

    if (!['sip', 'voluntary'].includes(body.type)) {
      return badRequest('Type must be either "sip" or "voluntary"');
    }

    const investment = await Investment.create({
      userId: event.userId,
      name: body.name,
      type: body.type,
      amount: body.amount,
      currency: body.currency || 'INR',
      platform: body.platform || '',
      category: body.category || 'mutual_fund',
      status: 'active',
    });

    return success(investment, 201);
  } catch (err) {
    console.error('Error creating investment:', err);
    return error('Failed to create investment');
  }
});

export const update = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Investment ID is required');
    }

    const investment = await Investment.findOneAndUpdate(
      { _id: id, userId: event.userId },
      {
        ...(body.name && { name: body.name }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.currency && { currency: body.currency }),
        ...(body.platform && { platform: body.platform }),
        ...(body.category && { category: body.category }),
      },
      { new: true }
    );

    if (!investment) {
      return notFound('Investment not found');
    }

    return success(investment);
  } catch (err) {
    console.error('Error updating investment:', err);
    return error('Failed to update investment');
  }
});

export const toggleStatus = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Investment ID is required');
    }

    if (!body.status || !['active', 'paused', 'stopped'].includes(body.status)) {
      return badRequest('Valid status is required (active, paused, or stopped)');
    }

    const investment = await Investment.findOneAndUpdate(
      { _id: id, userId: event.userId },
      { status: body.status },
      { new: true }
    );

    if (!investment) {
      return notFound('Investment not found');
    }

    return success(investment);
  } catch (err) {
    console.error('Error toggling investment status:', err);
    return error('Failed to update investment status');
  }
});

export const remove = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;

    if (!id) {
      return badRequest('Investment ID is required');
    }

    const investment = await Investment.findOneAndUpdate(
      { _id: id, userId: event.userId },
      { status: 'stopped' },
      { new: true }
    );

    if (!investment) {
      return notFound('Investment not found');
    }

    return success({ message: 'Investment deleted successfully' });
  } catch (err) {
    console.error('Error deleting investment:', err);
    return error('Failed to delete investment');
  }
});
