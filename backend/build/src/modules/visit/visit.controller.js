"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concludeVisitHandler = exports.createWalkInVisitHandler = exports.getVisitDetail = exports.listVisits = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const visit_service_1 = require("./visit.service");
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
exports.listVisits = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, visit_service_1.getVisits)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.getVisitDetail = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const visitId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!visitId) {
        throw new http_error_1.AppError('Visit id is required.', 400);
    }
    const visit = await (0, visit_service_1.getVisitById)(visitId);
    (0, response_1.sendSuccess)(res, visit);
});
exports.createWalkInVisitHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const visit = await (0, visit_service_1.createWalkInVisit)({
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
        updatedById: readNullableString(body.updatedById),
    });
    (0, response_1.sendSuccess)(res, visit, 201);
});
exports.concludeVisitHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const visitId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!visitId) {
        throw new http_error_1.AppError('Visit id is required.', 400);
    }
    const body = req.body;
    const visit = await (0, visit_service_1.concludeVisit)(visitId, {
        finalDiagnosis: typeof body.finalDiagnosis === 'string' ? body.finalDiagnosis : '',
        conclusion: typeof body.conclusion === 'string' ? body.conclusion : '',
        treatmentPlan: typeof body.treatmentPlan === 'string' ? body.treatmentPlan : null,
        updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
        note: typeof body.note === 'string' ? body.note : null,
    });
    (0, response_1.sendSuccess)(res, visit);
});
