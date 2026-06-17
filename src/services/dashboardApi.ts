import { apiGet } from './http';
import type { DashboardOverviewDto } from './backend-types';

export const dashboardApi = {
  getOverview: () => apiGet<DashboardOverviewDto>('/dashboard/overview'),
};
