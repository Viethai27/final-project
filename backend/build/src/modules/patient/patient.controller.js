"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPatient = exports.listPatients = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const patient_service_1 = require("./patient.service");
const readString = (value) => (typeof value === 'string' ? value.trim() : '');
const readNullableString = (value) => {
    const text = readString(value);
    return text.length > 0 ? text : null;
};
const readBoolean = (value) => value === true;
const readGender = (value) => {
    const gender = readString(value).toUpperCase();
    if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER') {
        return gender;
    }
    throw new http_error_1.AppError('Gender is required.', 400);
};
exports.listPatients = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, patient_service_1.getPatients)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.createPatient = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const patient = await (0, patient_service_1.createPatientRecord)({
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
    (0, response_1.sendSuccess)(res, patient, 201);
});
