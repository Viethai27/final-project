import { apiGet, apiSend } from './http';
import type { ListQuery, PatientCreateInputDto, PatientDto } from './backend-types';

export const patientApi = {
  list: (query?: ListQuery) => apiGet<PatientDto[]>('/patients', query as Record<string, string | number | boolean | undefined | null> | undefined),
  create: (body: PatientCreateInputDto) => apiSend<PatientDto>('/patients', { method: 'POST', body }),
};
