import mongoose, { Document, Schema } from 'mongoose';
import { IncomeType, VestPeriod } from '../types';

export interface IIncome extends Document {
  userId: string;
  name: string;
  amount: number;
  preTaxAmount?: number;
  postTaxAmount?: number;
  taxPaid?: number;
  currency: string;
  type: IncomeType;
  // RSU vesting specific fields
  units?: number;
  unitPrice?: number;
  vestPeriod?: VestPeriod;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const incomeSchema = new Schema<IIncome>(
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
    preTaxAmount: {
      type: Number,
      min: 0,
    },
    postTaxAmount: {
      type: Number,
      min: 0,
    },
    taxPaid: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    type: {
      type: String,
      enum: ['salary', 'freelance', 'dividend', 'rental', 'rsu_vesting', 'other'],
      default: 'salary',
    },
    // RSU vesting specific fields
    units: {
      type: Number,
    },
    unitPrice: {
      type: Number,
    },
    vestPeriod: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
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

export const Income = mongoose.models.Income || mongoose.model<IIncome>('Income', incomeSchema);
