import mongoose, { Document, Schema } from 'mongoose';
import { InvestmentType, InvestmentCategory, InvestmentStatus } from '../types';

export interface IInvestment extends Document {
  userId: string;
  name: string;
  type: InvestmentType;
  amount: number;
  currency: string;
  platform: string;
  category: InvestmentCategory;
  status: InvestmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const investmentSchema = new Schema<IInvestment>(
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
    type: {
      type: String,
      enum: ['sip', 'voluntary'],
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
    platform: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['mutual_fund', 'stocks', 'crypto', 'other'],
      default: 'mutual_fund',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'stopped'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

export const Investment = mongoose.models.Investment || mongoose.model<IInvestment>('Investment', investmentSchema);
