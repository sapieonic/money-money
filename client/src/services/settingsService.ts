import api from './api';
import type { UserSettings, ApiResponse } from '../types';

export const settingsService = {
  get: async (): Promise<UserSettings> => {
    const response = await api.get<ApiResponse<UserSettings>>('/api/settings');
    return response.data.data!;
  },

  update: async (data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await api.put<ApiResponse<UserSettings>>('/api/settings', data);
    return response.data.data!;
  },
};
