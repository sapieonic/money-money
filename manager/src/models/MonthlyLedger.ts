import mongoose, { Document, Schema } from 'mongoose';
import { IncomeType, VestPeriod, ExpenseCategory, InvestmentType, InvestmentCategory, InvestmentStatus, LedgerStatus } from '../types';

export interface ILedgerIncomeItem {
  _id: mongoose.Types.ObjectId;
  sourceId: mongoose.Types.ObjectId | null;
  name: string;
  amount: number;
  preTaxAmount?: number;
  postTaxAmount?: number;
  taxPaid?: number;
  currency: string;
  type: IncomeType;
  units?: number;
  unitPrice?: number;
  vestPeriod?: VestPeriod;
}

export interface ILedgerExpenseItem {
  _id: mongoose.Types.ObjectId;
  sourceId: mongoose.Types.ObjectId | null;
  name: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  isRecurring: boolean;
}

export interface ILedgerInvestmentItem {
  _id: mongoose.Types.ObjectId;
  sourceId: mongoose.Types.ObjectId | null;
  name: string;
  type: InvestmentType;
  amount: number;
  currency: string;
  platform: string;
  category: InvestmentCategory;
  status: InvestmentStatus;
}

export interface IMonthlyLedger extends Document {
  userId: string;
  month: string;
  status: LedgerStatus;
  incomes: ILedgerIncomeItem[];
  expenses: ILedgerExpenseItem[];
  investments: ILedgerInvestmentItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerIncomeSchema = new Schema<ILedgerIncomeItem>({
  sourceId: { type: Schema.Types.ObjectId, default: null },
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  preTaxAmount: { type: Number, min: 0 },
  postTaxAmount: { type: Number, min: 0 },
  taxPaid: { type: Number, min: 0 },
  currency: { type: String, default: 'INR' },
  type: {
    type: String,
    enum: ['salary', 'freelance', 'dividend', 'rental', 'rsu_vesting', 'other'],
    default: 'salary',
  },
  units: { type: Number },
  unitPrice: { type: Number },
  vestPeriod: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
  },
});

const ledgerExpenseSchema = new Schema<ILedgerExpenseItem>({
  sourceId: { type: Schema.Types.ObjectId, default: null },
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  category: {
    type: String,
    enum: ['housing', 'transport', 'utilities', 'subscriptions', 'loan', 'other'],
    default: 'other',
  },
  isRecurring: { type: Boolean, default: true },
});

const ledgerInvestmentSchema = new Schema<ILedgerInvestmentItem>({
  sourceId: { type: Schema.Types.ObjectId, default: null },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['sip', 'voluntary'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  platform: { type: String, default: '' },
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
});

const monthlyLedgerSchema = new Schema<IMonthlyLedger>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
    },
    incomes: [ledgerIncomeSchema],
    expenses: [ledgerExpenseSchema],
    investments: [ledgerInvestmentSchema],
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

monthlyLedgerSchema.index({ userId: 1, month: 1 }, { unique: true });

export const MonthlyLedger = mongoose.models.MonthlyLedger || mongoose.model<IMonthlyLedger>('MonthlyLedger', monthlyLedgerSchema);
