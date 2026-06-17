import { apiGet, apiSend } from './http';
import type {
  DispatchDecisionCreateInput,
  DispatchDecisionSummaryDto,
  DispatchSuggestionDto,
  ListQuery,
} from './backend-types';

export const dispatchApi = {
  listSuggestions: (query?: ListQuery) =>
    apiGet<DispatchSuggestionDto[]>('/dispatch/suggestions', query as Record<string, string | number | boolean | undefined | null> | undefined),
  getSuggestionByVisitId: (visitId: string) => apiGet<DispatchSuggestionDto>(`/dispatch/suggestions/${visitId}`),
  listDecisions: (query?: ListQuery) =>
    apiGet<DispatchDecisionSummaryDto[]>('/dispatch/decisions', query as Record<string, string | number | boolean | undefined | null> | undefined),
  getDecisionById: (id: string) => apiGet<DispatchDecisionSummaryDto>(`/dispatch/decisions/${id}`),
  createDecision: (body: DispatchDecisionCreateInput) =>
    apiSend<DispatchDecisionSummaryDto>('/dispatch/decisions', { method: 'POST', body }),
};
