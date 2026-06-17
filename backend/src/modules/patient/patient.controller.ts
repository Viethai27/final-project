import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import { createPatientRecord, getPatients } from './patient.service';

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

export const listPatients: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getPatients(query);

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const createPatient: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;

  const patient = await createPatientRecord({
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
  });

  sendSuccess(res, patient, 201);
});
