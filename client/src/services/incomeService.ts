import api from './api';
import type { Income, ApiResponse } from '../types';

export const incomeService = {
  getAll: async (): Promise<Income[]> => {
    const response = await api.get<ApiResponse<Income[]>>('/api/income');
    return response.data.data || [];
  },

  create: async (data: Partial<Income>): Promise<Income> => {
    const response = await api.post<ApiResponse<Income>>('/api/income', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<Income>): Promise<Income> => {
    const response = await api.put<ApiResponse<Income>>(`/api/income/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/income/${id}`);
  },
};
