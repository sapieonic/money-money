import mongoose, { Document, Schema } from 'mongoose';
import { DailyExpenseCategory } from '../types';

export interface IDailyExpense extends Document {
  userId: string;
  amount: number;
  description: string;
  vendor: string;
  category: DailyExpenseCategory;
  date: Date;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dailyExpenseSchema = new Schema<IDailyExpense>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    vendor: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['food', 'groceries', 'entertainment', 'shopping', 'travel', 'health', 'personal', 'other'],
      default: 'other',
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'INR',
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

// Compound index for efficient date range queries per user
dailyExpenseSchema.index({ userId: 1, date: -1 });

export const DailyExpense = mongoose.models.DailyExpense || mongoose.model<IDailyExpense>('DailyExpense', dailyExpenseSchema);
