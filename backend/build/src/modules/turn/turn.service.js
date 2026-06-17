"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeTurn = exports.startTurn = exports.getTurnsByVisitId = exports.getTurnById = exports.getTurns = void 0;
const prisma_1 = require("../../lib/prisma");
const http_error_1 = require("../../shared/http-error");
const turnStatuses = new Set(['PENDING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'TIMEOUT', 'CANCELLED']);
const turnTypeToInProgressState = {
    CLINICAL_EXAM: 'IN_EXAM',
    CLS_LAB: 'IN_CLS',
    CLS_IMAGING: 'IN_CLS',
    CONCLUSION: 'IN_CONCLUSION',
    PAYMENT: 'WAITING_PAYMENT',
};
const turnTypeToCompleteState = {
    CLINICAL_EXAM: 'WAITING_CLS',
    CLS_LAB: 'WAITING_RESULT',
    CLS_IMAGING: 'WAITING_RESULT',
    CONCLUSION: 'WAITING_PAYMENT',
    PAYMENT: 'COMPLETED',
};
const turnTypeToExpectedVisitState = {
    CLINICAL_EXAM: {
        start: 'WAITING_EXAM',
        complete: 'IN_EXAM',
    },
    CLS_LAB: {
        start: 'WAITING_CLS',
        complete: 'IN_CLS',
    },
    CLS_IMAGING: {
        start: 'WAITING_CLS',
        complete: 'IN_CLS',
    },
    CONCLUSION: {
        start: 'WAITING_CONCLUSION',
        complete: 'IN_CONCLUSION',
    },
    PAYMENT: {
        start: 'WAITING_PAYMENT',
        complete: 'WAITING_PAYMENT',
    },
};
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
        department: mapDepartment(doctor.department ?? null),
    };
};
const mapPatient = (patient) => ({
    id: patient.id,
    patientCode: patient.patientCode,
    fullName: patient.fullName,
    gender: patient.gender,
    age: patient.age,
    phone: patient.phone,
});
const mapQueueItem = (queueItem) => ({
    queueItemId: queueItem.id,
    queueType: queueItem.queueType,
    laneType: queueItem.laneType,
    priorityReason: queueItem.priorityReason,
    initialPriorityScore: queueItem.initialPriorityScore,
    enqueuedAt: queueItem.enqueuedAt,
    sameDoctorRequired: queueItem.sameDoctorRequired,
    targetRoom: mapRoom(queueItem.targetRoom),
    targetDoctor: mapDoctor(queueItem.targetDoctor),
    status: queueItem.status
        ? {
            currentStatus: queueItem.status.status,
            priorityScore: queueItem.status.priorityScore,
            lastScoreUpdated: queueItem.status.lastScoreUpdated,
            calledAt: queueItem.status.calledAt,
            servedAt: queueItem.status.servedAt,
            dequeuedAt: queueItem.status.dequeuedAt,
            isTimeout: queueItem.status.isTimeout,
        }
        : null,
});
const mapTurnProgress = (progress) => progress
    ? {
        turnProgressId: progress.id,
        status: progress.status,
        calledAt: progress.calledAt,
        startedAt: progress.startedAt,
        endedAt: progress.endedAt,
        timeoutAt: progress.timeoutAt,
        durationMinutes: progress.durationMinutes,
        note: progress.note,
        updatedAt: progress.updatedAt,
        updatedBy: progress.updatedBy
            ? {
                id: progress.updatedBy.id,
                username: progress.updatedBy.username,
                fullName: progress.updatedBy.fullName,
                role: progress.updatedBy.role,
            }
            : null,
    }
    : null;
const mapVisitSummary = (visit) => ({
    visitId: visit.id,
    queueNumber: visit.queueNumber,
    currentState: visit.progress?.currentState ?? null,
    patient: mapPatient(visit.patient),
    appointment: visit.appointment
        ? {
            appointmentId: visit.appointment.id,
            appointmentTime: visit.appointment.appointmentTime,
            status: visit.appointment.status,
        }
        : null,
});
const turnListSelect = {
    id: true,
    visitId: true,
    roomId: true,
    doctorId: true,
    queueItemId: true,
    turnType: true,
    serviceId: true,
    timeoutThreshold: true,
    createdAt: true,
    updatedAt: true,
    visit: {
        select: {
            id: true,
            queueNumber: true,
            patient: {
                select: {
                    id: true,
                    patientCode: true,
                    fullName: true,
                    gender: true,
                    age: true,
                    phone: true,
                },
            },
            progress: {
                select: {
                    currentState: true,
                    laneType: true,
                    sameDoctorRequired: true,
                },
            },
            appointment: {
                select: {
                    id: true,
                    appointmentTime: true,
                    status: true,
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
    doctor: {
        select: {
            id: true,
            name: true,
            specialty: true,
            licenseNumber: true,
            department: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    queueItem: {
        select: {
            id: true,
            queueType: true,
            laneType: true,
            priorityReason: true,
            initialPriorityScore: true,
            enqueuedAt: true,
            sameDoctorRequired: true,
            targetRoom: {
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
            targetDoctor: {
                select: {
                    id: true,
                    name: true,
                    specialty: true,
                    licenseNumber: true,
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            },
            status: {
                select: {
                    status: true,
                    priorityScore: true,
                    lastScoreUpdated: true,
                    calledAt: true,
                    servedAt: true,
                    dequeuedAt: true,
                    isTimeout: true,
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
    progress: {
        select: {
            id: true,
            status: true,
            calledAt: true,
            startedAt: true,
            endedAt: true,
            timeoutAt: true,
            durationMinutes: true,
            note: true,
            updatedAt: true,
            updatedBy: {
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    role: true,
                },
            },
        },
    },
};
const turnDetailSelect = {
    ...turnListSelect,
    visit: {
        select: {
            id: true,
            queueNumber: true,
            patient: {
                select: {
                    id: true,
                    patientCode: true,
                    fullName: true,
                    gender: true,
                    age: true,
                    phone: true,
                },
            },
            progress: {
                select: {
                    currentState: true,
                    laneType: true,
                    sameDoctorRequired: true,
                    updatedAt: true,
                    updatedBy: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            role: true,
                        },
                    },
                },
            },
            appointment: {
                select: {
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
                        },
                    },
                    room: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
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
                },
            },
            clinical: {
                select: {
                    id: true,
                    examStartAt: true,
                    clsStartAt: true,
                    clsDoneAt: true,
                    conclusionStartAt: true,
                    completedAt: true,
                    canceledAt: true,
                    provisionalDiagnosis: true,
                    finalDiagnosis: true,
                    conclusion: true,
                    totalWaitMinutes: true,
                    totalVisitMinutes: true,
                },
            },
            invoice: {
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    paidAmount: true,
                    paidAt: true,
                },
            },
        },
    },
};
const mapTurn = (turn) => ({
    turnId: turn.id,
    visitId: turn.visitId,
    roomId: turn.roomId,
    doctorId: turn.doctorId,
    queueItemId: turn.queueItemId,
    turnType: turn.turnType,
    serviceId: turn.serviceId,
    timeoutThreshold: turn.timeoutThreshold,
    createdAt: turn.createdAt,
    updatedAt: turn.updatedAt,
    visit: mapVisitSummary(turn.visit),
    room: mapRoom(turn.room),
    doctor: mapDoctor(turn.doctor),
    queueItem: turn.queueItem ? mapQueueItem(turn.queueItem) : null,
    service: mapService(turn.service),
    progress: mapTurnProgress(turn.progress),
});
const getTurnWhere = (query) => {
    const where = {};
    const status = query.status?.toUpperCase();
    if (status && status !== 'ALL' && turnStatuses.has(status)) {
        where.progress = {
            is: {
                status: status,
            },
        };
    }
    if (query.search) {
        where.OR = [
            { id: { contains: query.search } },
            { visit: { queueNumber: { contains: query.search } } },
            { visit: { patient: { fullName: { contains: query.search } } } },
            { visit: { patient: { patientCode: { contains: query.search } } } },
            { room: { name: { contains: query.search } } },
            { room: { code: { contains: query.search } } },
            { doctor: { name: { contains: query.search } } },
            { service: { name: { contains: query.search } } },
            { service: { code: { contains: query.search } } },
        ];
    }
    return where;
};
const turnMutationSelect = {
    id: true,
    visitId: true,
    roomId: true,
    doctorId: true,
    queueItemId: true,
    turnType: true,
    serviceId: true,
    timeoutThreshold: true,
    createdAt: true,
    updatedAt: true,
    visit: {
        select: {
            id: true,
            queueNumber: true,
            patient: {
                select: {
                    id: true,
                    patientCode: true,
                    fullName: true,
                    gender: true,
                    age: true,
                    phone: true,
                },
            },
            progress: {
                select: {
                    currentState: true,
                    laneType: true,
                    sameDoctorRequired: true,
                },
            },
            clinical: {
                select: {
                    id: true,
                    examStartAt: true,
                    clsStartAt: true,
                    clsDoneAt: true,
                    conclusionStartAt: true,
                    completedAt: true,
                },
            },
            clsOrders: {
                select: {
                    status: true,
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
    doctor: {
        select: {
            id: true,
            name: true,
            specialty: true,
            licenseNumber: true,
            department: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    queueItem: {
        select: {
            id: true,
            laneType: true,
            sameDoctorRequired: true,
            initialPriorityScore: true,
            status: {
                select: {
                    status: true,
                    priorityScore: true,
                    calledAt: true,
                    servedAt: true,
                    dequeuedAt: true,
                    isTimeout: true,
                },
            },
        },
    },
    progress: {
        select: {
            id: true,
            status: true,
            calledAt: true,
            startedAt: true,
            endedAt: true,
            timeoutAt: true,
            durationMinutes: true,
            note: true,
        },
    },
};
const getNextVisitState = async (turn, kind) => {
    if (kind === 'start') {
        return turnTypeToInProgressState[turn.turnType] ?? null;
    }
    if (turn.turnType === 'CLINICAL_EXAM') {
        const pendingCls = turn.visit.clsOrders.some((order) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(order.status));
        return pendingCls ? 'WAITING_CLS' : 'WAITING_CONCLUSION';
    }
    return turnTypeToCompleteState[turn.turnType] ?? null;
};
const getQueueHistoryEvent = (kind) => (kind === 'start' ? 'TURN_START' : 'TURN_COMPLETE');
const getTurns = async (query) => {
    const where = getTurnWhere(query);
    const [total, turns] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.turn.count({ where }),
        prisma_1.prisma.turn.findMany({
            where,
            orderBy: [{ createdAt: query.sort }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: turnListSelect,
        }),
    ]);
    return {
        items: turns.map(mapTurn),
        total,
    };
};
exports.getTurns = getTurns;
const getTurnById = async (id) => {
    const turn = await prisma_1.prisma.turn.findUnique({
        where: { id },
        select: turnDetailSelect,
    });
    if (!turn) {
        throw new http_error_1.AppError('Turn not found.', 404);
    }
    return mapTurn(turn);
};
exports.getTurnById = getTurnById;
const getTurnsByVisitId = async (visitId) => {
    const turns = await prisma_1.prisma.turn.findMany({
        where: { visitId },
        orderBy: [{ createdAt: 'desc' }],
        select: turnListSelect,
    });
    return turns.map(mapTurn);
};
exports.getTurnsByVisitId = getTurnsByVisitId;
const mutateTurn = async (id, action, payload) => {
    const turn = await prisma_1.prisma.turn.findUnique({
        where: { id },
        select: turnMutationSelect,
    });
    if (!turn) {
        throw new http_error_1.AppError('Turn not found.', 404);
    }
    const currentProgressStatus = turn.progress?.status ?? null;
    const expectedVisitState = turnTypeToExpectedVisitState[turn.turnType]?.[action] ?? null;
    const currentVisitState = turn.visit.progress?.currentState ?? null;
    if (action === 'start') {
        if (currentProgressStatus && ['IN_PROGRESS', 'COMPLETED', 'TIMEOUT', 'CANCELLED'].includes(currentProgressStatus)) {
            throw new http_error_1.AppError('Turn cannot be started in its current state.', 409);
        }
        if (currentVisitState && expectedVisitState && currentVisitState !== expectedVisitState) {
            throw new http_error_1.AppError('Visit state does not allow this turn to start.', 409);
        }
    }
    if (action === 'complete') {
        if (currentProgressStatus !== 'IN_PROGRESS') {
            throw new http_error_1.AppError('Turn must be in progress before completion.', 409);
        }
        if (currentVisitState && expectedVisitState && currentVisitState !== expectedVisitState) {
            throw new http_error_1.AppError('Visit state does not allow this turn to complete.', 409);
        }
    }
    const now = new Date();
    const nextVisitState = await getNextVisitState(turn, action);
    const queueStatusBefore = turn.queueItem?.status?.status ?? null;
    await prisma_1.prisma.$transaction(async (tx) => {
        const currentProgress = turn.progress;
        const queueItemStatus = turn.queueItem?.status;
        await tx.turnProgress.upsert({
            where: {
                turnId: turn.id,
            },
            create: {
                turnId: turn.id,
                status: action === 'start' ? 'IN_PROGRESS' : 'COMPLETED',
                calledAt: currentProgress?.calledAt ?? now,
                startedAt: action === 'start' ? now : currentProgress?.startedAt ?? now,
                endedAt: action === 'complete' ? now : currentProgress?.endedAt ?? null,
                timeoutAt: currentProgress?.timeoutAt ?? null,
                durationMinutes: action === 'complete'
                    ? Math.max(0, Math.round((now.getTime() - (currentProgress?.startedAt ?? currentProgress?.calledAt ?? now).getTime()) /
                        60000))
                    : null,
                note: payload.note ?? currentProgress?.note ?? null,
                updatedById: payload.updatedById ?? null,
            },
            update: {
                status: action === 'start' ? 'IN_PROGRESS' : 'COMPLETED',
                calledAt: currentProgress?.calledAt ?? now,
                startedAt: action === 'start' ? now : currentProgress?.startedAt ?? now,
                endedAt: action === 'complete' ? now : currentProgress?.endedAt ?? null,
                timeoutAt: currentProgress?.timeoutAt ?? null,
                durationMinutes: action === 'complete'
                    ? Math.max(0, Math.round((now.getTime() - (currentProgress?.startedAt ?? currentProgress?.calledAt ?? now).getTime()) /
                        60000))
                    : currentProgress?.durationMinutes ?? null,
                note: payload.note ?? currentProgress?.note ?? null,
                updatedById: payload.updatedById ?? null,
            },
        });
        if (turn.queueItemId) {
            await tx.queueItemStatus.upsert({
                where: {
                    queueItemId: turn.queueItemId,
                },
                create: {
                    queueItemId: turn.queueItemId,
                    status: action === 'start' ? 'SERVING' : 'DONE',
                    priorityScore: turn.queueItem?.status?.priorityScore ?? turn.queueItem?.initialPriorityScore ?? 0,
                    lastScoreUpdated: now,
                    calledAt: action === 'start' ? queueItemStatus?.calledAt ?? now : queueItemStatus?.calledAt ?? now,
                    servedAt: action === 'start'
                        ? queueItemStatus?.servedAt ?? now
                        : queueItemStatus?.servedAt ?? queueItemStatus?.calledAt ?? now,
                    dequeuedAt: action === 'complete' ? now : queueItemStatus?.dequeuedAt ?? null,
                    isTimeout: queueItemStatus?.isTimeout ?? false,
                    updatedById: payload.updatedById ?? null,
                },
                update: {
                    status: action === 'start' ? 'SERVING' : 'DONE',
                    priorityScore: queueItemStatus?.priorityScore ?? turn.queueItem?.initialPriorityScore ?? 0,
                    lastScoreUpdated: now,
                    calledAt: action === 'start' ? queueItemStatus?.calledAt ?? now : queueItemStatus?.calledAt ?? now,
                    servedAt: action === 'start'
                        ? queueItemStatus?.servedAt ?? now
                        : queueItemStatus?.servedAt ?? queueItemStatus?.calledAt ?? now,
                    dequeuedAt: action === 'complete' ? now : queueItemStatus?.dequeuedAt ?? null,
                    isTimeout: queueItemStatus?.isTimeout ?? false,
                    updatedById: payload.updatedById ?? null,
                },
            });
            await tx.queueItemHistory.create({
                data: {
                    queueItemId: turn.queueItemId,
                    eventType: getQueueHistoryEvent(action),
                    fromStatus: queueStatusBefore,
                    toStatus: action === 'start' ? 'SERVING' : 'DONE',
                    fromScore: queueItemStatus?.priorityScore ?? turn.queueItem?.initialPriorityScore ?? null,
                    toScore: queueItemStatus?.priorityScore ?? turn.queueItem?.initialPriorityScore ?? null,
                    eventTime: now,
                    triggeredBy: 'turn',
                    triggeredByUserId: payload.updatedById ?? null,
                    note: payload.note ?? null,
                },
            });
        }
        if (nextVisitState) {
            const currentVisitState = turn.visit.progress?.currentState ?? null;
            await tx.visitProgress.upsert({
                where: {
                    visitId: turn.visitId,
                },
                create: {
                    visitId: turn.visitId,
                    currentState: nextVisitState,
                    laneType: turn.visit.progress?.laneType ?? turn.queueItem?.laneType ?? 'NORMAL',
                    sameDoctorRequired: turn.visit.progress?.sameDoctorRequired ?? turn.queueItem?.sameDoctorRequired ?? false,
                    updatedById: payload.updatedById ?? null,
                },
                update: {
                    currentState: nextVisitState,
                    laneType: turn.visit.progress?.laneType ?? turn.queueItem?.laneType ?? 'NORMAL',
                    sameDoctorRequired: turn.visit.progress?.sameDoctorRequired ?? turn.queueItem?.sameDoctorRequired ?? false,
                    updatedById: payload.updatedById ?? null,
                },
            });
            if (currentVisitState !== nextVisitState) {
                await tx.visitStateHistory.create({
                    data: {
                        visitId: turn.visitId,
                        fromState: currentVisitState,
                        toState: nextVisitState,
                        triggerEvent: action === 'start' ? 'TURN_START' : 'TURN_COMPLETE',
                        triggeredById: payload.updatedById ?? null,
                        transitionedAt: now,
                        note: payload.note ?? null,
                    },
                });
            }
        }
        await tx.visitClinical.upsert({
            where: {
                visitId: turn.visitId,
            },
            create: {
                visitId: turn.visitId,
                examStartAt: action === 'start' && turn.turnType === 'CLINICAL_EXAM' ? now : null,
                clsStartAt: action === 'start' && ['CLS_LAB', 'CLS_IMAGING'].includes(turn.turnType) ? now : null,
                clsDoneAt: action === 'complete' && ['CLS_LAB', 'CLS_IMAGING'].includes(turn.turnType) ? now : null,
                conclusionStartAt: action === 'start' && turn.turnType === 'CONCLUSION' ? now : null,
                completedAt: action === 'complete' && turn.turnType === 'PAYMENT' ? now : null,
            },
            update: {
                examStartAt: action === 'start' && turn.turnType === 'CLINICAL_EXAM' ? now : undefined,
                clsStartAt: action === 'start' && ['CLS_LAB', 'CLS_IMAGING'].includes(turn.turnType) ? now : undefined,
                clsDoneAt: action === 'complete' && ['CLS_LAB', 'CLS_IMAGING'].includes(turn.turnType) ? now : undefined,
                conclusionStartAt: action === 'start' && turn.turnType === 'CONCLUSION' ? now : undefined,
                completedAt: action === 'complete' && turn.turnType === 'PAYMENT' ? now : undefined,
            },
        });
        if (action === 'complete' && turn.turnType === 'PAYMENT') {
            const invoice = await tx.invoice.findFirst({
                where: { visitId: turn.visitId },
                select: {
                    totalAmount: true,
                },
            });
            if (invoice) {
                await tx.invoice.updateMany({
                    where: { visitId: turn.visitId },
                    data: {
                        status: 'PAID',
                        paidAmount: invoice.totalAmount,
                        paidAt: now,
                    },
                });
            }
        }
    });
    return (0, exports.getTurnById)(id);
};
const startTurn = async (id, payload = {}) => mutateTurn(id, 'start', payload);
exports.startTurn = startTurn;
const completeTurn = async (id, payload = {}) => mutateTurn(id, 'complete', payload);
exports.completeTurn = completeTurn;
