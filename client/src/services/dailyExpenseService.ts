import api from './api';
import type { DailyExpense, DailyExpenseSummary, WeeklyExpenseAnalytics, SendWeeklySummaryResponse, PaginatedResponse, ApiResponse } from '../types';

export interface DailyExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export const dailyExpenseService = {
  getAll: async (filters?: DailyExpenseFilters): Promise<PaginatedResponse<DailyExpense>> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const response = await api.get<ApiResponse<PaginatedResponse<DailyExpense>>>(
      `/api/daily-expenses${queryString ? `?${queryString}` : ''}`
    );
    return response.data.data!;
  },

  getSummary: async (): Promise<DailyExpenseSummary> => {
    const response = await api.get<ApiResponse<DailyExpenseSummary>>('/api/daily-expenses/summary');
    return response.data.data!;
  },

  create: async (data: Partial<DailyExpense>): Promise<DailyExpense> => {
    const response = await api.post<ApiResponse<DailyExpense>>('/api/daily-expenses', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<DailyExpense>): Promise<DailyExpense> => {
    const response = await api.put<ApiResponse<DailyExpense>>(`/api/daily-expenses/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/daily-expenses/${id}`);
  },

  getWeeklyAnalytics: async (): Promise<WeeklyExpenseAnalytics> => {
    const response = await api.get<ApiResponse<WeeklyExpenseAnalytics>>('/api/daily-expenses/weekly-analytics');
    return response.data.data!;
  },

  sendWeeklySummary: async (): Promise<SendWeeklySummaryResponse> => {
    const response = await api.post<ApiResponse<SendWeeklySummaryResponse>>('/api/daily-expenses/send-weekly-summary');
    return response.data.data!;
  },
};
