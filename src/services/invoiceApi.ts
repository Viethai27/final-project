import { apiGet, apiSend } from './http';
import type { InvoiceSummaryDto } from './backend-types';

export const invoiceApi = {
  list: (query?: { visitId?: string | null }) =>
    apiGet<InvoiceSummaryDto[]>('/invoices', query as Record<string, string | number | boolean | undefined | null> | undefined),
  getById: (id: string) => apiGet<InvoiceSummaryDto>(`/invoices/${id}`),
  pay: (id: string, body?: { paymentMethod?: string | null; paidById?: string | null; note?: string | null }) =>
    apiSend<InvoiceSummaryDto>(`/invoices/${id}/pay`, { method: 'PATCH', body }),
};
