import api from './api';
import type {
  Debt,
  DebtAmortizationResponse,
  SnowballPlanResult,
  SnowballStrategy,
  ApiResponse,
} from '../types';

export const debtService = {
  getAll: async (status?: string): Promise<Debt[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<ApiResponse<Debt[]>>(`/api/debts${params}`);
    return response.data.data || [];
  },

  create: async (data: Partial<Debt>): Promise<Debt> => {
    const response = await api.post<ApiResponse<Debt>>('/api/debts', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<Debt>): Promise<Debt> => {
    const response = await api.put<ApiResponse<Debt>>(`/api/debts/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/debts/${id}`);
  },

  recordPayment: async (
    id: string,
    data: { amount: number; date?: string; note?: string }
  ): Promise<Debt> => {
    const response = await api.post<ApiResponse<Debt>>(`/api/debts/${id}/payment`, data);
    return response.data.data!;
  },

  deletePayment: async (debtId: string, paymentId: string): Promise<Debt> => {
    const response = await api.delete<ApiResponse<Debt>>(
      `/api/debts/${debtId}/payment/${paymentId}`
    );
    return response.data.data!;
  },

  getAmortization: async (id: string): Promise<DebtAmortizationResponse> => {
    const response = await api.get<ApiResponse<DebtAmortizationResponse>>(
      `/api/debts/${id}/amortization`
    );
    return response.data.data!;
  },

  getSnowballPlan: async (strategy: SnowballStrategy = 'snowball'): Promise<SnowballPlanResult> => {
    const response = await api.get<ApiResponse<SnowballPlanResult>>(
      `/api/debts/snowball-plan?strategy=${strategy}`
    );
    return response.data.data!;
  },
};
