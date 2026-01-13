import mongoose, { Document, Schema } from 'mongoose';

export interface ISnapshot extends Document {
  userId: string;
  month: string; // Format: YYYY-MM
  totalIncome: number;
  totalExpenses: number;
  totalSIPs: number;
  totalVoluntaryInvestments: number;
  remaining: number;
  totalAssetValue: number;
  createdAt: Date;
}

const snapshotSchema = new Schema<ISnapshot>(
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
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    totalSIPs: {
      type: Number,
      default: 0,
    },
    totalVoluntaryInvestments: {
      type: Number,
      default: 0,
    },
    remaining: {
      type: Number,
      default: 0,
    },
    totalAssetValue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user + month uniqueness
snapshotSchema.index({ userId: 1, month: 1 }, { unique: true });

export const Snapshot = mongoose.models.Snapshot || mongoose.model<ISnapshot>('Snapshot', snapshotSchema);
