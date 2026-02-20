import mongoose, { Document, Schema, Types } from 'mongoose';
import { DebtStatus, InterestRateType, PaymentType } from '../types';

export interface IPaymentHistory {
  date: Date;
  amount: number;
  principal: number;
  interest: number;
  type: PaymentType;
  balanceAfter: number;
  note?: string;
}

export interface IDebt extends Document {
  userId: string;
  name: string;
  totalAmount: number;
  currentBalance: number;
  interestRate: number;
  interestRateType: InterestRateType;
  monthlyPayment: number;
  additionalPayment: number;
  startDate: Date;
  endDate: Date;
  dueDate?: number;
  currency: string;
  status: DebtStatus;
  linkedExpenseId?: Types.ObjectId;
  paymentHistory: IPaymentHistory[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentHistorySchema = new Schema<IPaymentHistory>(
  {
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    principal: {
      type: Number,
      required: true,
    },
    interest: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['scheduled', 'adhoc'],
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
    },
  },
  { _id: true }
);

const debtSchema = new Schema<IDebt>(
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
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
    },
    interestRateType: {
      type: String,
      enum: ['fixed', 'variable', 'reducing', 'other'],
      default: 'reducing',
    },
    monthlyPayment: {
      type: Number,
      required: true,
      min: 0,
    },
    additionalPayment: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Number,
      min: 1,
      max: 31,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['active', 'paid_off', 'paused'],
      default: 'active',
    },
    linkedExpenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
    },
    paymentHistory: {
      type: [paymentHistorySchema],
      default: [],
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

debtSchema.index({ userId: 1, status: 1 });
debtSchema.index({ userId: 1, dueDate: 1, status: 1 });

export const Debt = mongoose.models.Debt || mongoose.model<IDebt>('Debt', debtSchema);
