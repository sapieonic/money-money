import api from './api';
import type { Asset, ApiResponse } from '../types';

export const assetService = {
  getAll: async (includeSold = false): Promise<Asset[]> => {
    const params = { includeSold: includeSold.toString() };
    const response = await api.get<ApiResponse<Asset[]>>('/api/assets', { params });
    return response.data.data || [];
  },

  create: async (data: Partial<Asset>): Promise<Asset> => {
    const response = await api.post<ApiResponse<Asset>>('/api/assets', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<Asset>): Promise<Asset> => {
    const response = await api.put<ApiResponse<Asset>>(`/api/assets/${id}`, data);
    return response.data.data!;
  },

  updateValue: async (
    id: string,
    currentValueINR: number,
    currentValueUSD?: number
  ): Promise<Asset> => {
    const response = await api.patch<ApiResponse<Asset>>(`/api/assets/${id}/value`, {
      currentValueINR,
      currentValueUSD,
    });
    return response.data.data!;
  },

  delete: async (id: string, hard = false): Promise<void> => {
    const params = hard ? { hard: 'true' } : {};
    await api.delete(`/api/assets/${id}`, { params });
  },
};
