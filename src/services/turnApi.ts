import { apiGet, apiSend } from './http';
import type { ListQuery, TurnDetailDto, TurnSummaryDto } from './backend-types';

export const turnApi = {
  list: (query?: ListQuery) =>
    apiGet<TurnSummaryDto[]>('/turns', query as Record<string, string | number | boolean | undefined | null> | undefined),
  getById: (id: string) => apiGet<TurnDetailDto>(`/turns/${id}`),
  getByVisitId: (visitId: string) => apiGet<TurnSummaryDto[]>(`/visits/${visitId}/turns`),
  start: (id: string, body?: { updatedById?: string | null; note?: string | null }) =>
    apiSend<TurnDetailDto>(`/turns/${id}/start`, { method: 'PATCH', body }),
  complete: (id: string, body?: { updatedById?: string | null; note?: string | null }) =>
    apiSend<TurnDetailDto>(`/turns/${id}/complete`, { method: 'PATCH', body }),
};
