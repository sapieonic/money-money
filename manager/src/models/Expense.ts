import mongoose, { Document, Schema } from 'mongoose';
import { ExpenseCategory } from '../types';

export interface IExpense extends Document {
  userId: string;
  name: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    category: {
      type: String,
      enum: ['housing', 'transport', 'utilities', 'subscriptions', 'loan', 'other'],
      default: 'other',
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Expense = mongoose.models.Expense || mongoose.model<IExpense>('Expense', expenseSchema);
