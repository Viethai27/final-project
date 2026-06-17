import { apiGet, apiSend } from './http';
import type {
  ListQuery,
  VisitConclusionInputDto,
  VisitDetailForActionDto,
  VisitListItemDto,
  WalkInRegistrationInputDto,
} from './backend-types';

export const visitApi = {
  list: (query?: ListQuery) =>
    apiGet<VisitListItemDto[]>('/visits', query as Record<string, string | number | boolean | undefined | null> | undefined),
  getById: (id: string) => apiGet<VisitDetailForActionDto>(`/visits/${id}`),
  getTurnsByVisitId: (visitId: string) => apiGet(`/visits/${visitId}/turns`),
  getClsOrdersByVisitId: (visitId: string) => apiGet(`/visits/${visitId}/cls-orders`),
  createWalkIn: (body: WalkInRegistrationInputDto) =>
    apiSend<VisitDetailForActionDto>('/visits/walk-in', { method: 'POST', body }),
  conclude: (id: string, body: VisitConclusionInputDto) =>
    apiSend<VisitDetailForActionDto>(`/visits/${id}/conclusion`, { method: 'PATCH', body }),
};
