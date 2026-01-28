import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { Income } from '../models/Income';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';
import { logger } from '../utils/telemetry';

export const getAll = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const incomes = await Income.find({ userId: event.userId, isActive: true }).sort({ createdAt: -1 });

    return success(incomes);
  } catch (err) {
    logger.error('Error fetching incomes', { error: String(err) });
    return error('Failed to fetch incomes');
  }
});

export const create = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');

    if (!body.name || body.amount === undefined) {
      return badRequest('Name and amount are required');
    }

    const income = await Income.create({
      userId: event.userId,
      name: body.name,
      amount: body.amount,
      preTaxAmount: body.preTaxAmount,
      taxPaid: body.taxPaid,
      currency: body.currency || 'INR',
      type: body.type || 'salary',
      units: body.units,
      unitPrice: body.unitPrice,
      vestPeriod: body.vestPeriod,
      isActive: true,
    });

    return success(income, 201);
  } catch (err) {
    logger.error('Error creating income', { error: String(err) });
    return error('Failed to create income');
  }
});

export const update = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Income ID is required');
    }

    const income = await Income.findOneAndUpdate(
      { _id: id, userId: event.userId },
      {
        ...(body.name && { name: body.name }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.preTaxAmount !== undefined && { preTaxAmount: body.preTaxAmount }),
        ...(body.taxPaid !== undefined && { taxPaid: body.taxPaid }),
        ...(body.currency && { currency: body.currency }),
        ...(body.type && { type: body.type }),
        ...(body.units !== undefined && { units: body.units }),
        ...(body.unitPrice !== undefined && { unitPrice: body.unitPrice }),
        ...(body.vestPeriod && { vestPeriod: body.vestPeriod }),
      },
      { new: true }
    );

    if (!income) {
      return notFound('Income not found');
    }

    return success(income);
  } catch (err) {
    logger.error('Error updating income', { error: String(err) });
    return error('Failed to update income');
  }
});

export const remove = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;

    if (!id) {
      return badRequest('Income ID is required');
    }

    const income = await Income.findOneAndUpdate(
      { _id: id, userId: event.userId },
      { isActive: false },
      { new: true }
    );

    if (!income) {
      return notFound('Income not found');
    }

    return success({ message: 'Income deleted successfully' });
  } catch (err) {
    logger.error('Error deleting income', { error: String(err) });
    return error('Failed to delete income');
  }
});
