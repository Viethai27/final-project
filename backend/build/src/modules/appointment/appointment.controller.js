"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInAppointmentHandler = exports.rejectAppointmentHandler = exports.approveAppointmentHandler = exports.listAppointmentsHandler = exports.createAppointmentHandler = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const appointment_service_1 = require("./appointment.service");
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
const readAppointmentId = (req) => {
    const appointmentId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!appointmentId) {
        throw new http_error_1.AppError('Appointment id is required.', 400);
    }
    return appointmentId;
};
exports.createAppointmentHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const booking = await (0, appointment_service_1.createAppointmentBooking)({
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
    (0, response_1.sendSuccess)(res, booking, 201);
});
exports.listAppointmentsHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'asc',
    });
    const date = typeof req.query.date === 'string'
        ? req.query.date.trim() || undefined
        : undefined;
    const { items, total } = await (0, appointment_service_1.listAppointments)({
        ...query,
        date,
    });
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.approveAppointmentHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const appointmentId = readAppointmentId(req);
    const result = await (0, appointment_service_1.approveAppointment)(appointmentId);
    (0, response_1.sendSuccess)(res, result);
});
exports.rejectAppointmentHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const appointmentId = readAppointmentId(req);
    const result = await (0, appointment_service_1.rejectAppointment)(appointmentId);
    (0, response_1.sendSuccess)(res, result);
});
exports.checkInAppointmentHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const appointmentId = readAppointmentId(req);
    const body = req.body;
    const result = await (0, appointment_service_1.checkInAppointment)(appointmentId, {
        updatedById: readNullableString(body.updatedById),
        note: readNullableString(body.note),
    });
    (0, response_1.sendSuccess)(res, result);
});
