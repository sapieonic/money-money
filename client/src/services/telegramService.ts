import api from './api';
import type { TelegramStatus, TelegramVerifyResponse, TelegramUnlinkResponse, ApiResponse } from '../types';

export const telegramService = {
  getStatus: async (): Promise<TelegramStatus> => {
    const response = await api.get<ApiResponse<TelegramStatus>>('/api/telegram/status');
    return response.data.data!;
  },

  verifyCode: async (code: string): Promise<TelegramVerifyResponse> => {
    const response = await api.post<ApiResponse<TelegramVerifyResponse>>('/api/telegram/verify-code', { code });
    return response.data.data!;
  },

  unlink: async (): Promise<TelegramUnlinkResponse> => {
    const response = await api.delete<ApiResponse<TelegramUnlinkResponse>>('/api/telegram/unlink');
    return response.data.data!;
  },
};
