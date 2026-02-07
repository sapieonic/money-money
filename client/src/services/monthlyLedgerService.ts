import api from './api';
import type { MonthlyLedger, MonthlyLedgerResponse, LedgerSection, ApiResponse } from '../types';

export const monthlyLedgerService = {
  getOrCreate: async (month: string): Promise<MonthlyLedgerResponse> => {
    const response = await api.get<ApiResponse<MonthlyLedgerResponse>>('/api/monthly-ledger', {
      params: { month },
    });
    return response.data.data!;
  },

  addItem: async (month: string, section: LedgerSection, data: Record<string, unknown>): Promise<MonthlyLedger> => {
    const response = await api.post<ApiResponse<MonthlyLedger>>(`/api/monthly-ledger/${month}/items`, {
      section,
      ...data,
    });
    return response.data.data!;
  },

  updateItem: async (month: string, itemId: string, section: LedgerSection, data: Record<string, unknown>): Promise<MonthlyLedger> => {
    const response = await api.put<ApiResponse<MonthlyLedger>>(`/api/monthly-ledger/${month}/items/${itemId}`, {
      section,
      ...data,
    });
    return response.data.data!;
  },

  removeItem: async (month: string, itemId: string, section: LedgerSection): Promise<MonthlyLedger> => {
    const response = await api.delete<ApiResponse<MonthlyLedger>>(`/api/monthly-ledger/${month}/items/${itemId}`, {
      params: { section },
    });
    return response.data.data!;
  },
};
