import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { Expense } from '../models/Expense';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';

export const getAll = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const expenses = await Expense.find({ userId: event.userId, isActive: true }).sort({ createdAt: -1 });

    return success(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    return error('Failed to fetch expenses');
  }
});

export const create = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');

    if (!body.name || body.amount === undefined) {
      return badRequest('Name and amount are required');
    }

    const expense = await Expense.create({
      userId: event.userId,
      name: body.name,
      amount: body.amount,
      currency: body.currency || 'INR',
      category: body.category || 'other',
      isRecurring: body.isRecurring !== false,
      isActive: true,
    });

    return success(expense, 201);
  } catch (err) {
    console.error('Error creating expense:', err);
    return error('Failed to create expense');
  }
});

export const update = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Expense ID is required');
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: id, userId: event.userId },
      {
        ...(body.name && { name: body.name }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.currency && { currency: body.currency }),
        ...(body.category && { category: body.category }),
        ...(body.isRecurring !== undefined && { isRecurring: body.isRecurring }),
      },
      { new: true }
    );

    if (!expense) {
      return notFound('Expense not found');
    }

    return success(expense);
  } catch (err) {
    console.error('Error updating expense:', err);
    return error('Failed to update expense');
  }
});

export const remove = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;

    if (!id) {
      return badRequest('Expense ID is required');
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: id, userId: event.userId },
      { isActive: false },
      { new: true }
    );

    if (!expense) {
      return notFound('Expense not found');
    }

    return success({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    return error('Failed to delete expense');
  }
});
