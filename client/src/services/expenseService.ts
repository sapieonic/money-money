import api from './api';
import type { Expense, ApiResponse } from '../types';

export const expenseService = {
  getAll: async (): Promise<Expense[]> => {
    const response = await api.get<ApiResponse<Expense[]>>('/api/expenses');
    return response.data.data || [];
  },

  create: async (data: Partial<Expense>): Promise<Expense> => {
    const response = await api.post<ApiResponse<Expense>>('/api/expenses', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<Expense>): Promise<Expense> => {
    const response = await api.put<ApiResponse<Expense>>(`/api/expenses/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/expenses/${id}`);
  },
};
