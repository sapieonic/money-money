import mongoose, { Document, Schema } from 'mongoose';

export interface ITelegramLinkCode extends Document {
  code: string;
  telegramChatId: number;
  telegramUsername: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const telegramLinkCodeSchema = new Schema<ITelegramLinkCode>(
  {
    code: {
      type: String,
      required: true,
      index: true,
    },
    telegramChatId: {
      type: Number,
      required: true,
    },
    telegramUsername: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire documents after they expire (TTL index)
telegramLinkCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TelegramLinkCode =
  mongoose.models.TelegramLinkCode ||
  mongoose.model<ITelegramLinkCode>('TelegramLinkCode', telegramLinkCodeSchema);
