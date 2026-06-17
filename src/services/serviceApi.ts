import { apiGet } from './http';
import type { ListQuery, ServiceDto } from './backend-types';

export const serviceApi = {
  list: (query?: ListQuery) =>
    apiGet<ServiceDto[]>('/services', query as Record<string, string | number | boolean | undefined | null> | undefined),
};
