import api from './api';
import type { DashboardData, Snapshot, ApiResponse } from '../types';

export const dashboardService = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await api.get<ApiResponse<DashboardData>>('/api/dashboard');
    return response.data.data!;
  },

  getSnapshots: async (limit = 12): Promise<Snapshot[]> => {
    const response = await api.get<ApiResponse<Snapshot[]>>('/api/snapshots', {
      params: { limit },
    });
    return response.data.data || [];
  },
};
