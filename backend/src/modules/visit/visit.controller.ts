import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import { concludeVisit, createWalkInVisit, getVisitById, getVisits } from './visit.service';

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

export const listVisits: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getVisits(query);

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getVisitDetail: RequestHandler = asyncHandler(async (req, res) => {
  const visitId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];

  if (!visitId) {
    throw new AppError('Visit id is required.', 400);
  }

  const visit = await getVisitById(visitId);
  sendSuccess(res, visit);
});

export const createWalkInVisitHandler: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const selectedPatientId = readNullableString(body.selectedPatientId) ?? readNullableString(body.patientId);

  const visit = await createWalkInVisit({
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
      appointmentTime: null,
      chiefComplaint: readNullableString(body.chiefComplaint),
      note: readNullableString(body.note),
      isUrgent: readBoolean(body.isUrgent),
      isPregnant: readBoolean(body.isPregnant),
    },
    selectedPatientId,
    createNewPatientOnPhoneMatch: readBoolean(body.createNewPatientOnPhoneMatch),
    updatedById: readNullableString(body.updatedById),
  });

  sendSuccess(res, visit, 201);
});

export const concludeVisitHandler: RequestHandler = asyncHandler(async (req, res) => {
  const visitId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!visitId) {
    throw new AppError('Visit id is required.', 400);
  }

  const body = req.body as Record<string, unknown>;
  const visit = await concludeVisit(visitId, {
    finalDiagnosis: typeof body.finalDiagnosis === 'string' ? body.finalDiagnosis : '',
    conclusion: typeof body.conclusion === 'string' ? body.conclusion : '',
    treatmentPlan: typeof body.treatmentPlan === 'string' ? body.treatmentPlan : null,
    updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
    note: typeof body.note === 'string' ? body.note : null,
  });

  sendSuccess(res, visit);
});
