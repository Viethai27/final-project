import { apiSend } from './http';
import { apiGet } from './http';
import type {
  AppointmentBookingInputDto,
  AppointmentBookingResultDto,
  AppointmentAvailableSlotsResultDto,
  AppointmentCheckInResultDto,
  AppointmentListItemDto,
  ListQuery,
} from './backend-types';

export const appointmentApi = {
  list: (query?: ListQuery & { date?: string }) =>
    apiGet<AppointmentListItemDto[]>('/appointments', query as Record<string, string | number | boolean | undefined | null> | undefined),
  create: (body: AppointmentBookingInputDto) =>
    apiSend<AppointmentBookingResultDto>('/appointments', { method: 'POST', body }),
  getAvailableSlots: (query: { date: string; doctorId?: string | null; departmentId?: string | null; serviceId?: string | null; slotMinutes?: number }) =>
    apiGet<AppointmentAvailableSlotsResultDto>('/appointments/available-slots', query as Record<string, string | number | boolean | undefined | null>),
  approve: (id: string) => apiSend<AppointmentBookingResultDto>(`/appointments/${id}/approve`, { method: 'PATCH' }),
  reject: (id: string) => apiSend<AppointmentBookingResultDto>(`/appointments/${id}/reject`, { method: 'PATCH' }),
  checkIn: (id: string, body?: { updatedById?: string | null; note?: string | null }) =>
    apiSend<AppointmentCheckInResultDto>(`/appointments/${id}/check-in`, { method: 'PATCH', body }),
};
