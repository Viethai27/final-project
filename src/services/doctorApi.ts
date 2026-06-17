import { apiGet } from './http';
import type { DoctorDto, ListQuery } from './backend-types';

export const doctorApi = {
  list: (query?: ListQuery) =>
    apiGet<DoctorDto[]>('/doctors', query as Record<string, string | number | boolean | undefined | null> | undefined),
};
