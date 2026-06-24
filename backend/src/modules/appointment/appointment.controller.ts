import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import {
  approveAppointment,
  checkInAppointment,
  createAppointmentBooking,
  getAvailableAppointmentSlots,
  listAppointments,
  rejectAppointment,
} from './appointment.service';

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const readNullableString = (value: unknown) => {
  const text = readString(value);
  return text.length > 0 ? text : null;
};

const readBoolean = (value: unknown) => value === true;

const readGender = (value: unknown) => {
  const gender = readString(value).toUpperCase();
  if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER') {
    return gender;
  }

  throw new AppError('Gender is required.', 400);
};

const readAppointmentId = (req: Parameters<RequestHandler>[0]) => {
  const appointmentId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!appointmentId) {
    throw new AppError('Appointment id is required.', 400);
  }

  return appointmentId;
};

const readOptionalNumber = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const createAppointmentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;

  const booking = await createAppointmentBooking({
    patient: {
      fullName: readString(body.fullName),
      gender: readGender(body.gender),
      dateOfBirth: readNullableString(body.dateOfBirth),
      phone: readString(body.phone),
      idNumber: readNullableString(body.idNumber),
      address: readNullableString(body.address),
      insuranceNumber: readNullableString(body.insuranceNumber),
      isDisabled: readBoolean(body.isDisabled),
      isDisabledHeavy: readBoolean(body.isDisabledHeavy),
      isRevolutionary: readBoolean(body.isRevolutionary),
    },
    visit: {
      departmentId: readNullableString(body.departmentId),
      serviceId: readNullableString(body.serviceId),
      doctorId: readNullableString(body.doctorId),
      appointmentTime: readNullableString(body.appointmentTime),
      chiefComplaint: readNullableString(body.chiefComplaint),
      note: readNullableString(body.note),
      isUrgent: readBoolean(body.isUrgent),
      isPregnant: readBoolean(body.isPregnant),
    },
    serviceId: readString(body.serviceId),
  });

  sendSuccess(res, booking, 201);
});

export const listAppointmentsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'asc',
  });

  const date =
    typeof req.query.date === 'string'
      ? req.query.date.trim() || undefined
      : undefined;

  const { items, total } = await listAppointments({
    ...query,
    date,
  });

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getAvailableAppointmentSlotsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date.trim() : '';
  const doctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId.trim() || null : null;
  const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() || null : null;
  const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId.trim() || null : null;
  const slotMinutes = readOptionalNumber(req.query.slotMinutes);

  if (!date) {
    throw new AppError('Date is required.', 400);
  }

  const result = await getAvailableAppointmentSlots({
    date,
    doctorId,
    departmentId,
    serviceId,
    slotMinutes: slotMinutes ?? undefined,
  });

  sendSuccess(res, result);
});

export const approveAppointmentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const appointmentId = readAppointmentId(req);
  const result = await approveAppointment(appointmentId);
  sendSuccess(res, result);
});

export const rejectAppointmentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const appointmentId = readAppointmentId(req);
  const result = await rejectAppointment(appointmentId);
  sendSuccess(res, result);
});

export const checkInAppointmentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const appointmentId = readAppointmentId(req);
  const body = req.body as Record<string, unknown>;

  const result = await checkInAppointment(appointmentId, {
    updatedById: readNullableString(body.updatedById),
    note: readNullableString(body.note),
  });

  sendSuccess(res, result);
});
