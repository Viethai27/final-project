import { apiGet } from './http';
import type { DepartmentDto, ListQuery } from './backend-types';

export const departmentApi = {
  list: (query?: ListQuery) =>
    apiGet<DepartmentDto[]>('/departments', query as Record<string, string | number | boolean | undefined | null> | undefined),
};
