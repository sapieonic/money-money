import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { Debt, IDebt } from '../models/Debt';
import { Expense } from '../models/Expense';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent, SnowballStrategy } from '../types';
import { logger } from '../utils/telemetry';

function calculateMonthlyInterest(
  annualRate: number,
  balance: number,
  totalAmount: number,
  rateType: string
): number {
  const monthlyRate = annualRate / 12 / 100;
  if (rateType === 'fixed') {
    return monthlyRate * totalAmount;
  }
  // reducing, variable, other — interest on current balance
  return monthlyRate * balance;
}

export const getAll = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const status = event.queryStringParameters?.status;
    const filter: Record<string, unknown> = { userId: event.userId, isActive: true };
    if (status) {
      filter.status = status;
    }

    const debts = await Debt.find(filter).sort({ createdAt: -1 });
    return success(debts);
  } catch (err) {
    logger.error('Error fetching debts', { error: String(err) });
    return error('Failed to fetch debts');
  }
});

export const create = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');

    if (!body.name || body.totalAmount === undefined || body.monthlyPayment === undefined) {
      return badRequest('Name, totalAmount, and monthlyPayment are required');
    }

    if (body.dueDate !== undefined && body.dueDate !== null) {
      const dueDate = Number(body.dueDate);
      if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
        return badRequest('Due date must be a number between 1 and 31');
      }
    }

    let linkedExpenseId = null;

    if (body.linkedExpenseId) {
      // Link to an existing expense
      const existingExpense = await Expense.findOne({
        _id: body.linkedExpenseId,
        userId: event.userId,
        isActive: true,
      });
      if (!existingExpense) {
        return notFound('Linked expense not found');
      }
      linkedExpenseId = existingExpense._id;
    } else {
      // Auto-create linked expense (category: loan)
      const linkedExpense = await Expense.create({
        userId: event.userId,
        name: `${body.name} (EMI)`,
        amount: body.monthlyPayment + (body.additionalPayment || 0),
        currency: body.currency || 'INR',
        category: 'loan',
        isRecurring: true,
        ...(body.dueDate !== undefined && body.dueDate !== null && { dueDate: Number(body.dueDate) }),
        isActive: true,
      });
      linkedExpenseId = linkedExpense._id;
    }

    const debt = await Debt.create({
      userId: event.userId,
      name: body.name,
      totalAmount: body.totalAmount,
      currentBalance: body.currentBalance ?? body.totalAmount,
      interestRate: body.interestRate ?? 0,
      interestRateType: body.interestRateType || 'reducing',
      monthlyPayment: body.monthlyPayment,
      additionalPayment: body.additionalPayment || 0,
      startDate: body.startDate || new Date(),
      endDate: body.endDate || new Date(),
      ...(body.dueDate !== undefined && body.dueDate !== null && { dueDate: Number(body.dueDate) }),
      currency: body.currency || 'INR',
      status: body.status || 'active',
      linkedExpenseId,
      isActive: true,
    });

    return success(debt, 201);
  } catch (err) {
    logger.error('Error creating debt', { error: String(err) });
    return error('Failed to create debt');
  }
});

export const update = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Debt ID is required');
    }

    if (body.dueDate !== undefined && body.dueDate !== null) {
      const dueDate = Number(body.dueDate);
      if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
        return badRequest('Due date must be a number between 1 and 31');
      }
    }

    const updateFields: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'totalAmount', 'currentBalance', 'interestRate', 'interestRateType',
      'monthlyPayment', 'additionalPayment', 'startDate', 'endDate', 'currency', 'status',
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === '') {
        updateFields.dueDate = null;
      } else {
        updateFields.dueDate = Number(body.dueDate);
      }
    }

    const debt = await Debt.findOneAndUpdate(
      { _id: id, userId: event.userId },
      updateFields,
      { new: true }
    );

    if (!debt) {
      return notFound('Debt not found');
    }

    // Sync linked expense if relevant fields changed
    if (debt.linkedExpenseId && (body.monthlyPayment !== undefined || body.additionalPayment !== undefined || body.dueDate !== undefined || body.name !== undefined)) {
      const expenseUpdate: Record<string, unknown> = {};
      if (body.name !== undefined) {
        expenseUpdate.name = `${body.name} (EMI)`;
      }
      if (body.monthlyPayment !== undefined || body.additionalPayment !== undefined) {
        expenseUpdate.amount = debt.monthlyPayment + debt.additionalPayment;
      }
      if (body.dueDate !== undefined) {
        expenseUpdate.dueDate = body.dueDate === null || body.dueDate === '' ? null : Number(body.dueDate);
      }
      await Expense.findByIdAndUpdate(debt.linkedExpenseId, expenseUpdate);
    }

    return success(debt);
  } catch (err) {
    logger.error('Error updating debt', { error: String(err) });
    return error('Failed to update debt');
  }
});

export const remove = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;

    if (!id) {
      return badRequest('Debt ID is required');
    }

    const debt = await Debt.findOneAndUpdate(
      { _id: id, userId: event.userId },
      { isActive: false },
      { new: true }
    );

    if (!debt) {
      return notFound('Debt not found');
    }

    // Deactivate linked expense
    if (debt.linkedExpenseId) {
      await Expense.findByIdAndUpdate(debt.linkedExpenseId, { isActive: false });
    }

    return success({ message: 'Debt deleted successfully' });
  } catch (err) {
    logger.error('Error deleting debt', { error: String(err) });
    return error('Failed to delete debt');
  }
});

export const recordPayment = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return badRequest('Debt ID is required');
    }

    if (!body.amount || body.amount <= 0) {
      return badRequest('Amount must be a positive number');
    }

    const debt = await Debt.findOne({ _id: id, userId: event.userId, isActive: true });

    if (!debt) {
      return notFound('Debt not found');
    }

    if (debt.status === 'paid_off') {
      return badRequest('Debt is already paid off');
    }

    // Ad-hoc payments go entirely to principal
    const paymentAmount = Math.min(body.amount, debt.currentBalance);
    const newBalance = debt.currentBalance - paymentAmount;

    debt.paymentHistory.push({
      date: body.date ? new Date(body.date) : new Date(),
      amount: paymentAmount,
      principal: paymentAmount,
      interest: 0,
      type: 'adhoc',
      balanceAfter: newBalance,
      note: body.note || undefined,
    });

    debt.currentBalance = newBalance;

    if (newBalance <= 0) {
      debt.status = 'paid_off';
      // Deactivate linked expense
      if (debt.linkedExpenseId) {
        await Expense.findByIdAndUpdate(debt.linkedExpenseId, { isActive: false });
      }
    }

    await debt.save();

    return success(debt);
  } catch (err) {
    logger.error('Error recording payment', { error: String(err) });
    return error('Failed to record payment');
  }
});

export const deletePayment = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;
    const paymentId = event.pathParameters?.paymentId;

    if (!id) {
      return badRequest('Debt ID is required');
    }

    if (!paymentId) {
      return badRequest('Payment ID is required');
    }

    const debt = await Debt.findOne({ _id: id, userId: event.userId, isActive: true });

    if (!debt) {
      return notFound('Debt not found');
    }

    const paymentIndex = debt.paymentHistory.findIndex(
      (p: any) => p._id?.toString() === paymentId
    );

    if (paymentIndex === -1) {
      return notFound('Payment not found');
    }

    const removedPayment = debt.paymentHistory[paymentIndex];

    // Remove the payment
    debt.paymentHistory.splice(paymentIndex, 1);

    // Reverse the balance effect: add back the principal that was paid
    debt.currentBalance = Math.round((debt.currentBalance + removedPayment.principal) * 100) / 100;

    // If debt was paid_off but now has a positive balance, reactivate it
    if (debt.status === 'paid_off' && debt.currentBalance > 0) {
      debt.status = 'active';
      // Re-activate linked expense
      if (debt.linkedExpenseId) {
        await Expense.findByIdAndUpdate(debt.linkedExpenseId, { isActive: true });
      }
    }

    await debt.save();

    return success(debt);
  } catch (err) {
    logger.error('Error deleting payment', { error: String(err) });
    return error('Failed to delete payment');
  }
});

export const getAmortization = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const id = event.pathParameters?.id;

    if (!id) {
      return badRequest('Debt ID is required');
    }

    const debt = await Debt.findOne({ _id: id, userId: event.userId, isActive: true });

    if (!debt) {
      return notFound('Debt not found');
    }

    const schedule = computeAmortization(debt);

    return success({
      debtId: debt._id,
      name: debt.name,
      schedule,
      totalInterest: schedule.reduce((sum, entry) => sum + entry.interest, 0),
      totalPaid: schedule.reduce((sum, entry) => sum + entry.payment, 0),
      months: schedule.length,
    });
  } catch (err) {
    logger.error('Error computing amortization', { error: String(err) });
    return error('Failed to compute amortization');
  }
});

function computeAmortization(debt: IDebt) {
  const schedule: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
    date: string;
  }> = [];

  let balance = debt.currentBalance;
  const monthlyPayment = debt.monthlyPayment + debt.additionalPayment;
  let currentDate = new Date();

  for (let month = 1; month <= 600 && balance > 0; month++) {
    const interest = calculateMonthlyInterest(
      debt.interestRate,
      balance,
      debt.totalAmount,
      debt.interestRateType
    );

    const totalPayment = Math.min(monthlyPayment, balance + interest);
    const principalPaid = totalPayment - interest;
    balance = Math.max(0, balance - principalPaid);

    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);

    schedule.push({
      month,
      payment: Math.round(totalPayment * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      date: currentDate.toISOString().split('T')[0],
    });
  }

  return schedule;
}

export const getSnowballPlan = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const strategy = (event.queryStringParameters?.strategy || 'snowball') as SnowballStrategy;

    if (strategy !== 'snowball' && strategy !== 'avalanche') {
      return badRequest('Strategy must be "snowball" or "avalanche"');
    }

    const debts = await Debt.find({
      userId: event.userId,
      isActive: true,
      status: 'active',
    });

    if (debts.length === 0) {
      return success({ strategy, debts: [], plan: [], summary: null });
    }

    // Sort: snowball = smallest balance first, avalanche = highest rate first
    const sortedDebts = [...debts].sort((a, b) => {
      if (strategy === 'snowball') {
        return a.currentBalance - b.currentBalance;
      }
      return b.interestRate - a.interestRate;
    });

    // Build the plan
    const debtStates = sortedDebts.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      balance: d.currentBalance,
      rate: d.interestRate,
      rateType: d.interestRateType,
      totalAmount: d.totalAmount,
      minPayment: d.monthlyPayment,
      additionalPayment: d.additionalPayment,
      paidOffMonth: 0,
    }));

    const totalExtra = debtStates.reduce((sum, d) => sum + d.additionalPayment, 0);
    let freedPayments = 0;
    const plan: Array<{
      month: number;
      date: string;
      debts: Array<{
        id: string;
        name: string;
        payment: number;
        principal: number;
        interest: number;
        balance: number;
      }>;
      totalPayment: number;
    }> = [];

    const payoffOrder: Array<{ id: string; name: string; month: number; date: string }> = [];
    let currentDate = new Date();

    for (let month = 1; month <= 600; month++) {
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + 1);
      const dateStr = currentDate.toISOString().split('T')[0];

      const activeDebts = debtStates.filter((d) => d.balance > 0);
      if (activeDebts.length === 0) break;

      // Determine extra payment pool for priority debt
      let extraPool = totalExtra + freedPayments;

      const monthEntries: Array<{
        id: string;
        name: string;
        payment: number;
        principal: number;
        interest: number;
        balance: number;
      }> = [];

      for (let i = 0; i < debtStates.length; i++) {
        const d = debtStates[i];
        if (d.balance <= 0) continue;

        const interest = calculateMonthlyInterest(d.rate, d.balance, d.totalAmount, d.rateType);
        let payment = d.minPayment;

        // Priority debt (first active in sorted order) gets extra
        if (d.id === activeDebts[0].id) {
          payment += extraPool;
          extraPool = 0;
        }

        payment = Math.min(payment, d.balance + interest);
        const principalPaid = payment - interest;
        d.balance = Math.max(0, d.balance - principalPaid);

        monthEntries.push({
          id: d.id,
          name: d.name,
          payment: Math.round(payment * 100) / 100,
          principal: Math.round(principalPaid * 100) / 100,
          interest: Math.round(interest * 100) / 100,
          balance: Math.round(d.balance * 100) / 100,
        });

        if (d.balance <= 0 && d.paidOffMonth === 0) {
          d.paidOffMonth = month;
          freedPayments += d.minPayment;
          payoffOrder.push({ id: d.id, name: d.name, month, date: dateStr });
        }
      }

      plan.push({
        month,
        date: dateStr,
        debts: monthEntries,
        totalPayment: Math.round(monthEntries.reduce((s, e) => s + e.payment, 0) * 100) / 100,
      });
    }

    const totalInterest = plan.reduce(
      (sum, m) => sum + m.debts.reduce((s, d) => s + d.interest, 0),
      0
    );
    const totalPaid = plan.reduce((sum, m) => sum + m.totalPayment, 0);

    return success({
      strategy,
      summary: {
        totalMonths: plan.length,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        projectedPayoffDate: plan.length > 0 ? plan[plan.length - 1].date : null,
        payoffOrder,
      },
      plan,
    });
  } catch (err) {
    logger.error('Error computing snowball plan', { error: String(err) });
    return error('Failed to compute snowball plan');
  }
});
