import mongoose, { Document, Schema } from 'mongoose';
import { AssetCategory, ValueHistoryEntry } from '../types';

export interface IAsset extends Document {
  userId: string;
  name: string;
  category: AssetCategory;
  quantity: number;
  unitPrice?: number;
  currentValueINR: number;
  currentValueUSD: number;
  currency: string;
  platform: string;
  valueHistory: ValueHistoryEntry[];
  isSold: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const valueHistorySchema = new Schema<ValueHistoryEntry>(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    valueINR: {
      type: Number,
      required: true,
    },
    valueUSD: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const assetSchema = new Schema<IAsset>(
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
    category: {
      type: String,
      enum: ['stocks', 'mutual_fund', 'crypto', 'fd', 'real_estate', 'rsu', 'other'],
      default: 'other',
    },
    quantity: {
      type: Number,
      default: 0,
    },
    unitPrice: {
      type: Number,
    },
    currentValueINR: {
      type: Number,
      required: true,
      min: 0,
    },
    currentValueUSD: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    platform: {
      type: String,
      default: '',
    },
    valueHistory: {
      type: [valueHistorySchema],
      default: [],
    },
    isSold: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Asset = mongoose.models.Asset || mongoose.model<IAsset>('Asset', assetSchema);
