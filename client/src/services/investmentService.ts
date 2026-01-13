import api from './api';
import type { Investment, ApiResponse, InvestmentStatus } from '../types';

export const investmentService = {
  getAll: async (type?: 'sip' | 'voluntary'): Promise<Investment[]> => {
    const params = type ? { type } : {};
    const response = await api.get<ApiResponse<Investment[]>>('/api/investments', { params });
    return response.data.data || [];
  },

  create: async (data: Partial<Investment>): Promise<Investment> => {
    const response = await api.post<ApiResponse<Investment>>('/api/investments', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<Investment>): Promise<Investment> => {
    const response = await api.put<ApiResponse<Investment>>(`/api/investments/${id}`, data);
    return response.data.data!;
  },

  toggleStatus: async (id: string, status: InvestmentStatus): Promise<Investment> => {
    const response = await api.patch<ApiResponse<Investment>>(`/api/investments/${id}/status`, { status });
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/investments/${id}`);
  },
};
