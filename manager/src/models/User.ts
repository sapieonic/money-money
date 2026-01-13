import mongoose, { Document, Schema } from 'mongoose';
import { ExchangeRates, UserSettings } from '../types';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  name: string;
  picture?: string;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
    },
    settings: {
      currency: {
        type: String,
        default: 'INR',
      },
      exchangeRates: {
        type: Schema.Types.Mixed,
        default: { USD: 89 } as ExchangeRates,
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
