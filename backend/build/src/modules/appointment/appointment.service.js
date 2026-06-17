"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInAppointment = exports.rejectAppointment = exports.approveAppointment = exports.listAppointments = exports.createAppointmentBooking = void 0;
const prisma_1 = require("../../lib/prisma");
const http_error_1 = require("../../shared/http-error");
const patient_intake_1 = require("../patient/patient.intake");
const appointmentStatuses = new Set(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'LATE']);
const mapDepartment = (department) => {
    if (!department) {
        return null;
    }
    return {
        id: department.id,
        name: department.name,
        code: department.code,
    };
};
const mapRoom = (room) => {
    if (!room) {
        return null;
    }
    return {
        id: room.id,
        name: room.name,
        code: room.code,
        roomType: room.roomType ?? null,
        department: mapDepartment(room.department ?? null),
    };
};
const mapService = (service) => {
    if (!service) {
        return null;
    }
    return {
        id: service.id,
        name: service.name,
        code: service.code,
        serviceType: service.serviceType ?? null,
        avgDuration: service.avgDuration ?? null,
    };
};
const mapDoctor = (doctor) => {
    if (!doctor) {
        return null;
    }
    return {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        defaultRoomId: doctor.defaultRoomId ?? null,
        department: mapDepartment(doctor.department ?? null),
    };
};
const appointmentSelect = {
    id: true,
    appointmentTime: true,
    status: true,
    note: true,
    doctor: {
        select: {
            id: true,
            name: true,
            specialty: true,
            licenseNumber: true,
            defaultRoomId: true,
            department: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    room: {
        select: {
            id: true,
            name: true,
            code: true,
            roomType: true,
            department: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    service: {
        select: {
            id: true,
            name: true,
            code: true,
            serviceType: true,
            avgDuration: true,
        },
    },
    schedule: {
        select: {
            id: true,
            workDate: true,
            shift: true,
            startTime: true,
            endTime: true,
        },
    },
};
const mapAppointment = (appointment) => ({
    appointmentId: appointment.id,
    appointmentTime: appointment.appointmentTime,
    status: appointment.status,
    note: appointment.note,
    doctor: mapDoctor(appointment.doctor),
    room: mapRoom(appointment.room),
    service: mapService(appointment.service),
    schedule: appointment.schedule
        ? {
            id: appointment.schedule.id,
            workDate: appointment.schedule.workDate,
            shift: appointment.schedule.shift,
            startTime: appointment.schedule.startTime,
            endTime: appointment.schedule.endTime,
        }
        : null,
});
const deriveShift = (appointmentTime) => (appointmentTime.getHours() < 12 ? 'AM' : 'PM');
const resolveRoom = async (tx, input) => {
    const roomId = input.doctorDefaultRoomId ?? null;
    if (roomId) {
        const room = await tx.room.findUnique({
            where: { id: roomId },
            select: {
                id: true,
                name: true,
                code: true,
                roomType: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                isActive: true,
            },
        });
        if (!room || !room.isActive) {
            throw new http_error_1.AppError('Phòng khám không còn khả dụng.', 404);
        }
        if (input.departmentId && room.department?.id !== input.departmentId) {
            throw new http_error_1.AppError('Phòng khám không thuộc khoa đã chọn.', 409);
        }
        return room;
    }
    const room = await tx.room.findFirst({
        where: {
            departmentId: input.departmentId ?? undefined,
            roomType: (input.serviceRoomType ?? 'EXAM'),
            isActive: true,
        },
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
        select: {
            id: true,
            name: true,
            code: true,
            roomType: true,
            department: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
            isActive: true,
        },
    });
    if (!room) {
        throw new http_error_1.AppError('Vui lòng chọn khoa/phòng khám phù hợp.', 400);
    }
    return room;
};
const resolveDoctor = async (tx, doctorId) => {
    if (!doctorId) {
        return null;
    }
    const doctor = await tx.doctorProfile.findUnique({
        where: { id: doctorId },
        select: {
            id: true,
            name: true,
            specialty: true,
            licenseNumber: true,
            defaultRoomId: true,
            departmentId: true,
            isActive: true,
            department: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    });
    if (!doctor || !doctor.isActive) {
        throw new http_error_1.AppError('Bác sĩ không còn khả dụng.', 404);
    }
    return doctor;
};
const resolveService = async (tx, serviceId) => {
    const service = await tx.serviceCatalog.findUnique({
        where: { id: serviceId },
        select: {
            id: true,
            name: true,
            code: true,
            serviceType: true,
            roomTypeRequired: true,
            avgDuration: true,
            isActive: true,
        },
    });
    if (!service || !service.isActive) {
        throw new http_error_1.AppError('Dịch vụ đã chọn không còn khả dụng.', 404);
    }
    return service;
};
const resolveSchedule = async (tx, input) => {
    if (!input.doctorId) {
        return null;
    }
    const workDate = (0, patient_intake_1.normalizeDateOnly)(input.appointmentTime);
    const shift = deriveShift(input.appointmentTime);
    const schedule = await tx.workSchedule.findFirst({
        where: {
            doctorId: input.doctorId,
            roomId: input.roomId,
            workDate,
            shift,
            isActive: true,
        },
        select: {
            id: true,
            workDate: true,
            shift: true,
            startTime: true,
            endTime: true,
            maxPatients: true,
        },
    });
    if (!schedule) {
        return null;
    }
    if (typeof schedule.maxPatients === 'number') {
        const bookedCount = await tx.appointment.count({
            where: {
                scheduleId: schedule.id,
                status: { in: Array.from(appointmentStatuses) },
            },
        });
        if (bookedCount >= schedule.maxPatients) {
            throw new http_error_1.AppError('Khung giờ này đã đầy. Vui lòng chọn thời gian khác.', 409);
        }
    }
    return schedule;
};
const appointmentListSelect = {
    id: true,
    appointmentTime: true,
    status: true,
    note: true,
    createdAt: true,
    updatedAt: true,
    patient: {
        select: patient_intake_1.patientSelect,
    },
    doctor: appointmentSelect.doctor,
    room: appointmentSelect.room,
    service: appointmentSelect.service,
    schedule: appointmentSelect.schedule,
    visit: {
        select: {
            id: true,
            queueNumber: true,
            checkedInAt: true,
            progress: {
                select: {
                    currentState: true,
                    laneType: true,
                    sameDoctorRequired: true,
                },
            },
        },
    },
};
const mapAppointmentListItem = (appointment) => ({
    appointmentId: appointment.id,
    appointmentTime: appointment.appointmentTime,
    status: appointment.status,
    note: appointment.note,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    patient: (0, patient_intake_1.mapPatient)(appointment.patient),
    doctor: mapDoctor(appointment.doctor),
    room: mapRoom(appointment.room),
    service: mapService(appointment.service),
    schedule: appointment.schedule
        ? {
            id: appointment.schedule.id,
            workDate: appointment.schedule.workDate,
            shift: appointment.schedule.shift,
            startTime: appointment.schedule.startTime,
            endTime: appointment.schedule.endTime,
        }
        : null,
    visit: appointment.visit
        ? {
            visitId: appointment.visit.id,
            queueNumber: appointment.visit.queueNumber,
            checkedInAt: appointment.visit.checkedInAt,
            progress: appointment.visit.progress
                ? {
                    currentState: appointment.visit.progress.currentState,
                    laneType: appointment.visit.progress.laneType,
                    sameDoctorRequired: appointment.visit.progress.sameDoctorRequired,
                }
                : null,
        }
        : null,
});
const getAppointmentById = async (id) => {
    const appointment = await prisma_1.prisma.appointment.findUnique({
        where: { id },
        select: {
            ...appointmentSelect,
            patient: {
                select: patient_intake_1.patientSelect,
            },
        },
    });
    if (!appointment) {
        throw new http_error_1.AppError('Appointment not found.', 404);
    }
    return {
        patient: (0, patient_intake_1.mapPatient)(appointment.patient),
        appointment: mapAppointment(appointment),
    };
};
const createAppointmentBooking = async (input) => {
    if (!input.patient.fullName) {
        throw new http_error_1.AppError('Họ và tên là bắt buộc.', 400);
    }
    if (!input.patient.phone) {
        throw new http_error_1.AppError('Số điện thoại là bắt buộc.', 400);
    }
    if (!input.serviceId) {
        throw new http_error_1.AppError('Dịch vụ khám là bắt buộc.', 400);
    }
    const appointmentTime = (0, patient_intake_1.parseDate)(input.visit.appointmentTime ?? null, 'Thời gian khám không hợp lệ.');
    if (appointmentTime.getTime() < Date.now() - 60000) {
        throw new http_error_1.AppError('Thời gian khám phải lớn hơn hiện tại.', 400);
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        await (0, patient_intake_1.validateVisitBusinessRules)(tx, input.patient, input.visit);
        const resolvedPatient = await (0, patient_intake_1.resolvePatientForIntake)(tx, input.patient);
        const patient = resolvedPatient.patient;
        const service = await resolveService(tx, input.serviceId);
        const doctor = await resolveDoctor(tx, input.visit.doctorId);
        if (doctor?.departmentId && input.visit.departmentId && doctor.departmentId !== input.visit.departmentId) {
            throw new http_error_1.AppError('Bác sĩ không thuộc khoa đã chọn.', 409);
        }
        const resolvedRoom = await resolveRoom(tx, {
            departmentId: input.visit.departmentId,
            serviceRoomType: service.roomTypeRequired,
            doctorDefaultRoomId: doctor?.defaultRoomId ?? null,
        });
        if (service.roomTypeRequired && resolvedRoom.roomType !== service.roomTypeRequired) {
            throw new http_error_1.AppError('Phòng khám không phù hợp với dịch vụ đã chọn.', 400);
        }
        const schedule = await resolveSchedule(tx, {
            doctorId: doctor?.id ?? null,
            roomId: resolvedRoom.id,
            appointmentTime,
        });
        const conflictingAppointment = await tx.appointment.findFirst({
            where: {
                appointmentTime,
                status: { in: Array.from(appointmentStatuses) },
                OR: [
                    doctor?.id ? { doctorId: doctor.id } : null,
                    { roomId: resolvedRoom.id },
                ].filter(Boolean),
            },
            select: { id: true },
        });
        if (conflictingAppointment) {
            throw new http_error_1.AppError('Khung giờ này đã có lịch hẹn. Vui lòng chọn thời gian khác.', 409);
        }
        const appointment = await tx.appointment.create({
            data: {
                patientId: patient.id,
                doctorId: doctor?.id ?? null,
                roomId: resolvedRoom.id,
                scheduleId: schedule?.id ?? null,
                appointmentTime,
                serviceId: service.id,
                status: 'SCHEDULED',
                note: input.visit.note ?? null,
            },
            select: appointmentSelect,
        });
        return {
            patient: (0, patient_intake_1.mapPatient)(patient),
            appointment: mapAppointment(appointment),
        };
    });
};
exports.createAppointmentBooking = createAppointmentBooking;
const listAppointments = async (query) => {
    const where = {};
    const normalizedStatus = query.status?.toUpperCase();
    if (normalizedStatus === 'PENDING') {
        where.status = 'SCHEDULED';
    }
    else if (normalizedStatus && normalizedStatus !== 'ALL') {
        where.status = normalizedStatus;
    }
    if (query.search) {
        where.OR = [
            { id: { contains: query.search } },
            { patient: { fullName: { contains: query.search } } },
            { patient: { patientCode: { contains: query.search } } },
            { patient: { phone: { contains: query.search } } },
            { patient: { idNumber: { contains: query.search } } },
            { doctor: { name: { contains: query.search } } },
            { room: { name: { contains: query.search } } },
            { note: { contains: query.search } },
        ];
    }
    if (query.date) {
        const start = (0, patient_intake_1.normalizeDateOnly)((0, patient_intake_1.parseDate)(query.date, 'Ngày hẹn không hợp lệ.'));
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        where.appointmentTime = {
            gte: start,
            lt: end,
        };
    }
    const [total, items] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.appointment.count({ where }),
        prisma_1.prisma.appointment.findMany({
            where,
            orderBy: [{ appointmentTime: query.sort }, { createdAt: query.sort }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: appointmentListSelect,
        }),
    ]);
    return {
        items: items.map(mapAppointmentListItem),
        total,
    };
};
exports.listAppointments = listAppointments;
const updateAppointmentStatus = async (id, status) => {
    const appointment = await prisma_1.prisma.appointment.findUnique({
        where: { id },
        select: {
            id: true,
            status: true,
            visit: {
                select: { id: true },
            },
        },
    });
    if (!appointment) {
        throw new http_error_1.AppError('Appointment not found.', 404);
    }
    if (appointment.visit && status === 'CANCELLED') {
        throw new http_error_1.AppError('Không thể hủy lịch hẹn đã check-in.', 409);
    }
    if (appointment.status === 'CHECKED_IN') {
        throw new http_error_1.AppError('Lịch hẹn đã được check-in.', 409);
    }
    await prisma_1.prisma.appointment.update({
        where: { id },
        data: { status },
    });
    return getAppointmentById(id);
};
const approveAppointment = async (id) => updateAppointmentStatus(id, 'CONFIRMED');
exports.approveAppointment = approveAppointment;
const rejectAppointment = async (id) => updateAppointmentStatus(id, 'CANCELLED');
exports.rejectAppointment = rejectAppointment;
const checkInAppointment = async (id, payload = {}) => {
    const appointment = await prisma_1.prisma.appointment.findUnique({
        where: { id },
        select: {
            id: true,
            appointmentTime: true,
            status: true,
            note: true,
            patientId: true,
            doctorId: true,
            roomId: true,
            serviceId: true,
            patient: {
                select: patient_intake_1.patientSelect,
            },
            doctor: {
                select: {
                    id: true,
                    defaultRoomId: true,
                },
            },
            visit: {
                select: {
                    id: true,
                },
            },
        },
    });
    if (!appointment) {
        throw new http_error_1.AppError('Appointment not found.', 404);
    }
    if (appointment.visit) {
        throw new http_error_1.AppError('Lịch hẹn này đã được check-in trước đó.', 409);
    }
    if (!['SCHEDULED', 'CONFIRMED', 'LATE'].includes(appointment.status)) {
        throw new http_error_1.AppError('Trạng thái lịch hẹn hiện tại không cho phép check-in.', 409);
    }
    const roomId = appointment.roomId ?? appointment.doctor?.defaultRoomId ?? null;
    if (!roomId) {
        throw new http_error_1.AppError('Lịch hẹn chưa có phòng khám để check-in.', 409);
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        const age = appointment.patient.age ?? null;
        const priorityReason = (0, patient_intake_1.derivePriorityReason)({
            age,
            isUrgent: false,
            isPregnant: false,
            isDisabled: Boolean(appointment.patient.isDisabled),
            isDisabledHeavy: Boolean(appointment.patient.isDisabledHeavy),
            isRevolutionary: Boolean(appointment.patient.isRevolutionary),
            isAppointment: true,
        });
        const laneType = (0, patient_intake_1.deriveLaneType)(priorityReason, true);
        const visitDate = (0, patient_intake_1.normalizeDateOnly)(new Date());
        const now = new Date();
        const queueNumber = await (0, patient_intake_1.generateQueueNumber)(tx, visitDate, laneType);
        const priorityScore = (0, patient_intake_1.calculateInitialPriorityScore)({
            priorityReason,
            laneType,
            age,
        });
        const sameDoctorRequired = Boolean(appointment.doctorId);
        const visit = await tx.visit.create({
            data: {
                patientId: appointment.patientId,
                appointmentId: appointment.id,
                visitDate,
                queueNumber,
                chiefComplaint: payload.note ?? appointment.note ?? null,
                isUrgent: false,
                isPregnantAtVisit: false,
                priorityReason,
                arrivedAt: now,
                checkedInAt: now,
                createdById: payload.updatedById ?? null,
            },
        });
        await tx.visitProgress.create({
            data: {
                visitId: visit.id,
                currentState: 'WAITING_EXAM',
                laneType,
                sameDoctorRequired,
                updatedById: payload.updatedById ?? null,
            },
        });
        await tx.visitStateHistory.create({
            data: {
                visitId: visit.id,
                fromState: null,
                toState: 'WAITING_EXAM',
                triggerEvent: 'APPOINTMENT_CHECK_IN',
                triggeredById: payload.updatedById ?? null,
                transitionedAt: now,
                note: payload.note ?? appointment.note ?? null,
            },
        });
        await tx.visitAssignment.create({
            data: {
                visitId: visit.id,
                roomId,
                doctorId: appointment.doctorId ?? null,
                assignedById: payload.updatedById ?? null,
                assignmentReason: appointment.doctorId ? 'REQUESTED_DOCTOR' : 'APPOINTMENT_ROOM',
                isCurrent: true,
            },
        });
        const queueItem = await tx.queueItem.create({
            data: {
                visitId: visit.id,
                queueType: 'EXAM',
                laneType,
                targetRoomId: roomId,
                targetDoctorId: appointment.doctorId ?? null,
                isBase: true,
                isUrgent: false,
                isAgePriority: age !== null && (age < 6 || age >= 75),
                isPregnantPriority: false,
                priorityReason,
                initialPriorityScore: priorityScore,
                appointmentTime: appointment.appointmentTime,
                createdById: payload.updatedById ?? null,
                sameDoctorRequired,
            },
        });
        await tx.queueItemStatus.create({
            data: {
                queueItemId: queueItem.id,
                status: 'WAITING',
                priorityScore,
                lastScoreUpdated: now,
                updatedById: payload.updatedById ?? null,
            },
        });
        await tx.queueItemHistory.create({
            data: {
                queueItemId: queueItem.id,
                eventType: 'APPOINTMENT_CHECK_IN',
                fromStatus: null,
                toStatus: 'WAITING',
                fromScore: null,
                toScore: priorityScore,
                eventTime: now,
                triggeredBy: 'appointment',
                triggeredByUserId: payload.updatedById ?? null,
                note: payload.note ?? appointment.note ?? null,
            },
        });
        await tx.turn.create({
            data: {
                visitId: visit.id,
                roomId,
                doctorId: appointment.doctorId ?? null,
                queueItemId: queueItem.id,
                turnType: 'CLINICAL_EXAM',
                serviceId: appointment.serviceId ?? null,
                createdById: payload.updatedById ?? null,
                progress: {
                    create: {
                        status: 'PENDING',
                        updatedById: payload.updatedById ?? null,
                    },
                },
            },
        });
        await tx.appointment.update({
            where: { id: appointment.id },
            data: {
                status: 'CHECKED_IN',
            },
        });
        return {
            patient: (0, patient_intake_1.mapPatient)(appointment.patient),
            appointment: {
                appointmentId: appointment.id,
                appointmentTime: appointment.appointmentTime,
                status: 'CHECKED_IN',
                note: appointment.note,
                doctor: null,
                room: null,
                service: null,
                schedule: null,
            },
            visit: {
                visitId: visit.id,
                queueNumber: visit.queueNumber,
            },
            queueItem: {
                queueItemId: queueItem.id,
                queueNumber: visit.queueNumber,
            },
        };
    });
};
exports.checkInAppointment = checkInAppointment;
