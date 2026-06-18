"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVisitById = exports.getVisits = exports.concludeVisit = exports.createWalkInVisit = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const http_error_1 = require("../../shared/http-error");
const patient_intake_1 = require("../patient/patient.intake");
const visitStates = new Set([
    'WAITING_EXAM',
    'IN_EXAM',
    'WAITING_CLS',
    'IN_CLS',
    'WAITING_RESULT',
    'WAITING_CONCLUSION',
    'IN_CONCLUSION',
    'WAITING_PAYMENT',
    'COMPLETED',
    'CANCELLED',
]);
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
const addMinutes = (date, minutes) => {
    if (!date || minutes === null || minutes === undefined) {
        return null;
    }
    return new Date(date.getTime() + minutes * 60 * 1000);
};
const pickVisitDoctor = (visit) => {
    const currentAssignment = visit.assignments?.find((assignment) => assignment.isCurrent);
    const latestTurn = visit.turns?.[0];
    return visit.appointment?.doctor ?? currentAssignment?.doctor ?? latestTurn?.doctor ?? null;
};
const pickVisitRoom = (visit) => {
    const currentAssignment = visit.assignments?.find((assignment) => assignment.isCurrent);
    const latestTurn = visit.turns?.[0];
    return visit.appointment?.room ?? currentAssignment?.room ?? latestTurn?.room ?? null;
};
const pickVisitDepartment = (visit) => {
    const doctor = pickVisitDoctor(visit);
    const room = pickVisitRoom(visit);
    return doctor?.department ?? room?.department ?? null;
};
const getVisitExpectedFinishTime = (visit) => {
    const serviceDuration = visit.appointment?.service?.avgDuration ??
        visit.turns?.[0]?.service?.avgDuration ??
        null;
    const baseTime = visit.checkedInAt ??
        visit.arrivedAt ??
        visit.appointment?.appointmentTime ??
        visit.turns?.[0]?.createdAt ??
        null;
    return addMinutes(baseTime, serviceDuration);
};
const mapVisitListItem = (visit) => {
    const doctor = mapDoctor(pickVisitDoctor(visit));
    const room = mapRoom(pickVisitRoom(visit));
    const department = mapDepartment(pickVisitDepartment(visit));
    const progress = visit.progress
        ? {
            currentState: visit.progress.currentState,
            laneType: visit.progress.laneType,
            sameDoctorRequired: visit.progress.sameDoctorRequired,
        }
        : null;
    return {
        visitId: visit.id,
        queueNumber: visit.queueNumber,
        patient: mapPatient(visit.patient),
        doctor,
        department,
        room,
        currentState: visit.progress?.currentState ?? null,
        progress,
        appointment: visit.appointment
            ? {
                appointmentId: visit.appointment.id,
                appointmentTime: visit.appointment.appointmentTime,
                status: visit.appointment.status,
                note: visit.appointment.note,
                doctor: mapDoctor(visit.appointment.doctor),
                room: mapRoom(visit.appointment.room),
                service: mapService(visit.appointment.service),
                schedule: visit.appointment.schedule
                    ? {
                        id: visit.appointment.schedule.id,
                        workDate: visit.appointment.schedule.workDate,
                        shift: visit.appointment.schedule.shift,
                        startTime: visit.appointment.schedule.startTime,
                        endTime: visit.appointment.schedule.endTime,
                    }
                    : null,
            }
            : null,
        createdAt: visit.createdAt,
        receivedAt: visit.checkedInAt ?? visit.arrivedAt ?? null,
        expectedFinishTime: getVisitExpectedFinishTime(visit),
        isUrgent: visit.isUrgent,
        isPregnantAtVisit: visit.isPregnantAtVisit,
        priorityReason: visit.priorityReason,
    };
};
const mapVisitStateHistory = (history) => ({
    id: history.id,
    fromState: history.fromState,
    toState: history.toState,
    triggerEvent: history.triggerEvent,
    transitionedAt: history.transitionedAt,
    durationInState: history.durationInState,
    note: history.note,
    triggeredBy: history.triggeredBy
        ? {
            id: history.triggeredBy.id,
            username: history.triggeredBy.username,
            fullName: history.triggeredBy.fullName,
            role: history.triggeredBy.role,
        }
        : null,
});
const mapVisitQueueItem = (queueItem) => ({
    queueItemId: queueItem.id,
    queueType: queueItem.queueType,
    laneType: queueItem.laneType,
    targetRoom: mapRoom(queueItem.targetRoom),
    targetDoctor: mapDoctor(queueItem.targetDoctor),
    isBase: queueItem.isBase,
    isUrgent: queueItem.isUrgent,
    isAgePriority: queueItem.isAgePriority,
    isPregnantPriority: queueItem.isPregnantPriority,
    priorityReason: queueItem.priorityReason,
    initialPriorityScore: queueItem.initialPriorityScore,
    appointmentTime: queueItem.appointmentTime,
    enqueuedAt: queueItem.enqueuedAt,
    sameDoctorRequired: queueItem.sameDoctorRequired,
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
    histories: (queueItem.histories ?? []).map((history) => ({
        id: history.id,
        eventType: history.eventType,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        fromScore: history.fromScore,
        toScore: history.toScore,
        eventTime: history.eventTime,
        triggeredBy: history.triggeredBy,
        note: history.note,
        triggeredByUser: history.triggeredByUser
            ? {
                id: history.triggeredByUser.id,
                username: history.triggeredByUser.username,
                fullName: history.triggeredByUser.fullName,
                role: history.triggeredByUser.role,
            }
            : null,
    })),
});
const mapVisitTurn = (turn) => ({
    turnId: turn.id,
    turnType: turn.turnType,
    queueItemId: turn.queueItemId,
    timeoutThreshold: turn.timeoutThreshold,
    createdAt: turn.createdAt,
    room: mapRoom(turn.room),
    doctor: mapDoctor(turn.doctor),
    service: mapService(turn.service),
    progress: turn.progress
        ? {
            status: turn.progress.status,
            calledAt: turn.progress.calledAt,
            startedAt: turn.progress.startedAt,
            endedAt: turn.progress.endedAt,
            timeoutAt: turn.progress.timeoutAt,
            durationMinutes: turn.progress.durationMinutes,
        }
        : null,
});
const mapVisitClsOrder = (order) => ({
    clsOrderId: order.id,
    priority: order.priority,
    status: order.status,
    orderedAt: order.orderedAt,
    completedAt: order.completedAt,
    clinicalNote: order.clinicalNote,
    note: order.note,
    orderedBy: order.orderedBy
        ? {
            id: order.orderedBy.id,
            name: order.orderedBy.name,
            specialty: order.orderedBy.specialty,
        }
        : null,
    service: mapService(order.service),
    room: mapRoom(order.room),
    result: order.result
        ? {
            clsResultId: order.result.id,
            resultDate: order.result.resultDate,
            resultFileUrl: order.result.resultFileUrl,
            resultText: order.result.resultText,
            resultAt: order.result.resultAt,
            isAbnormal: order.result.isAbnormal,
            note: order.result.note,
        }
        : null,
});
const mapVisitDispatchDecision = (decision) => ({
    dispatchDecisionId: decision.id,
    decisionTime: decision.decisionTime,
    decisionType: decision.decisionType,
    note: decision.note,
    queueItem: decision.queueItem
        ? {
            queueItemId: decision.queueItem.id,
            queueType: decision.queueItem.queueType,
            laneType: decision.queueItem.laneType,
        }
        : null,
    outcomeRoom: mapRoom(decision.outcomeRoom),
    outcomeDoctor: mapDoctor(decision.outcomeDoctor),
    recommendations: (decision.recommendations ?? []).map((recommendation) => ({
        dispatchRecommendationId: recommendation.id,
        rank: recommendation.rank,
        roomId: recommendation.roomId,
        room: mapRoom(recommendation.room),
        resourceScore: recommendation.resourceScore,
        queueLength: recommendation.queueLength,
        utilizationRate: recommendation.utilizationRate,
        estimatedWaitMinutes: recommendation.estimatedWaitMinutes,
        alertLevel: recommendation.alertLevel,
        reason: recommendation.reason,
        wasSelected: recommendation.wasSelected,
    })),
    outcome: decision.outcome
        ? {
            dispatchOutcomeId: decision.outcome.id,
            serviceId: decision.outcome.serviceId,
            followedRecommendation: decision.outcome.followedRecommendation,
            actualWaitMinutes: decision.outcome.actualWaitMinutes,
            recommendedWaitEstimate: decision.outcome.recommendedWaitEstimate,
            waitDifference: decision.outcome.waitDifference,
            deviationNote: decision.outcome.deviationNote,
            deviationReason: decision.outcome.deviationReason,
        }
        : null,
});
const mapVisitInvoice = (invoice) => ({
    invoiceId: invoice.id,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt,
    items: (invoice.items ?? []).map((item) => ({
        invoiceItemId: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        service: mapService(item.service),
    })),
});
const mapVisitDetail = (visit) => ({
    visitId: visit.id,
    queueNumber: visit.queueNumber,
    patient: mapPatient(visit.patient),
    doctor: mapDoctor(pickVisitDoctor(visit)),
    department: mapDepartment(pickVisitDepartment(visit)),
    room: mapRoom(pickVisitRoom(visit)),
    currentState: visit.progress?.currentState ?? null,
    progress: visit.progress
        ? {
            progressId: visit.progress.id,
            currentState: visit.progress.currentState,
            laneType: visit.progress.laneType,
            sameDoctorRequired: visit.progress.sameDoctorRequired,
            updatedAt: visit.progress.updatedAt,
            updatedBy: visit.progress.updatedBy
                ? {
                    id: visit.progress.updatedBy.id,
                    username: visit.progress.updatedBy.username,
                    fullName: visit.progress.updatedBy.fullName,
                    role: visit.progress.updatedBy.role,
                }
                : null,
        }
        : null,
    appointment: visit.appointment
        ? {
            appointmentId: visit.appointment.id,
            appointmentTime: visit.appointment.appointmentTime,
            status: visit.appointment.status,
            note: visit.appointment.note,
            doctor: mapDoctor(visit.appointment.doctor),
            room: mapRoom(visit.appointment.room),
            service: mapService(visit.appointment.service),
            schedule: visit.appointment.schedule
                ? {
                    id: visit.appointment.schedule.id,
                    workDate: visit.appointment.schedule.workDate,
                    shift: visit.appointment.schedule.shift,
                    startTime: visit.appointment.schedule.startTime,
                    endTime: visit.appointment.schedule.endTime,
                }
                : null,
        }
        : null,
    createdAt: visit.createdAt,
    receivedAt: visit.checkedInAt ?? visit.arrivedAt ?? null,
    expectedFinishTime: getVisitExpectedFinishTime(visit),
    chiefComplaint: visit.chiefComplaint,
    isUrgent: visit.isUrgent,
    isPregnantAtVisit: visit.isPregnantAtVisit,
    priorityReason: visit.priorityReason,
    stateHistories: (visit.stateHistories ?? []).map(mapVisitStateHistory),
    clinical: visit.clinical
        ? {
            visitClinicalId: visit.clinical.id,
            provisionalDiagnosis: visit.clinical.provisionalDiagnosis,
            finalDiagnosis: visit.clinical.finalDiagnosis,
            conclusion: visit.clinical.conclusion,
            treatmentPlan: visit.clinical.treatmentPlan,
            clinicalNotes: visit.clinical.clinicalNotes,
            cancelReason: visit.clinical.cancelReason,
            examStartAt: visit.clinical.examStartAt,
            clsStartAt: visit.clinical.clsStartAt,
            clsDoneAt: visit.clinical.clsDoneAt,
            conclusionStartAt: visit.clinical.conclusionStartAt,
            completedAt: visit.clinical.completedAt,
            canceledAt: visit.clinical.canceledAt,
            totalWaitMinutes: visit.clinical.totalWaitMinutes,
            totalVisitMinutes: visit.clinical.totalVisitMinutes,
        }
        : null,
    assignments: (visit.assignments ?? []).map((assignment) => ({
        visitAssignmentId: assignment.id,
        isCurrent: assignment.isCurrent,
        assignmentReason: assignment.assignmentReason,
        createdAt: assignment.createdAt,
        doctor: mapDoctor(assignment.doctor),
        room: mapRoom(assignment.room),
        assignedBy: assignment.assignedBy
            ? {
                id: assignment.assignedBy.id,
                username: assignment.assignedBy.username,
                fullName: assignment.assignedBy.fullName,
            }
            : null,
    })),
    queueItems: (visit.queueItems ?? []).map(mapVisitQueueItem),
    turns: (visit.turns ?? []).map(mapVisitTurn),
    clsOrders: (visit.clsOrders ?? []).map(mapVisitClsOrder),
    dispatchDecisions: (visit.dispatchDecisions ?? []).map(mapVisitDispatchDecision),
    escalationLogs: (visit.escalationLogs ?? []).map((log) => ({
        escalationLogId: log.id,
        escalationTime: log.escalationTime,
        escalationType: log.escalationType,
        fromLane: log.fromLane,
        toLane: log.toLane,
        fromPriorityScore: log.fromPriorityScore,
        toPriorityScore: log.toPriorityScore,
        reason: log.reason,
        outcome: log.outcome,
    })),
    invoice: visit.invoice ? mapVisitInvoice(visit.invoice) : null,
});
const listSelect = {
    id: true,
    visitDate: true,
    queueNumber: true,
    chiefComplaint: true,
    isUrgent: true,
    isPregnantAtVisit: true,
    priorityReason: true,
    arrivedAt: true,
    checkedInAt: true,
    createdAt: true,
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
        },
    },
    progress: {
        select: {
            currentState: true,
            laneType: true,
            sameDoctorRequired: true,
        },
    },
    assignments: {
        where: {
            isCurrent: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
        select: {
            isCurrent: true,
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
        },
    },
    turns: {
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
        select: {
            createdAt: true,
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
};
const detailSelect = {
    id: true,
    visitDate: true,
    queueNumber: true,
    chiefComplaint: true,
    isUrgent: true,
    isPregnantAtVisit: true,
    priorityReason: true,
    arrivedAt: true,
    checkedInAt: true,
    createdAt: true,
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
        },
    },
    progress: {
        select: {
            id: true,
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
    stateHistories: {
        orderBy: [{ transitionedAt: 'asc' }],
        select: {
            id: true,
            fromState: true,
            toState: true,
            triggerEvent: true,
            transitionedAt: true,
            durationInState: true,
            note: true,
            triggeredBy: {
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    role: true,
                },
            },
        },
    },
    clinical: {
        select: {
            id: true,
            provisionalDiagnosis: true,
            finalDiagnosis: true,
            conclusion: true,
            treatmentPlan: true,
            clinicalNotes: true,
            cancelReason: true,
            examStartAt: true,
            clsStartAt: true,
            clsDoneAt: true,
            conclusionStartAt: true,
            completedAt: true,
            canceledAt: true,
            totalWaitMinutes: true,
            totalVisitMinutes: true,
        },
    },
    assignments: {
        orderBy: [{ createdAt: 'desc' }],
        select: {
            id: true,
            isCurrent: true,
            assignmentReason: true,
            createdAt: true,
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
            assignedBy: {
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                },
            },
        },
    },
    queueItems: {
        orderBy: [{ enqueuedAt: 'asc' }],
        select: {
            id: true,
            queueType: true,
            laneType: true,
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
            isBase: true,
            isUrgent: true,
            isAgePriority: true,
            isPregnantPriority: true,
            priorityReason: true,
            initialPriorityScore: true,
            appointmentTime: true,
            enqueuedAt: true,
            sameDoctorRequired: true,
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
            histories: {
                orderBy: [{ eventTime: 'desc' }],
                select: {
                    id: true,
                    eventType: true,
                    fromStatus: true,
                    toStatus: true,
                    fromScore: true,
                    toScore: true,
                    eventTime: true,
                    triggeredBy: true,
                    note: true,
                    triggeredByUser: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            role: true,
                        },
                    },
                },
            },
        },
    },
    turns: {
        orderBy: [{ createdAt: 'desc' }],
        select: {
            id: true,
            turnType: true,
            timeoutThreshold: true,
            createdAt: true,
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
                    status: true,
                    calledAt: true,
                    startedAt: true,
                    endedAt: true,
                    timeoutAt: true,
                    durationMinutes: true,
                },
            },
        },
    },
    clsOrders: {
        orderBy: [{ orderedAt: 'desc' }],
        select: {
            id: true,
            priority: true,
            status: true,
            orderedAt: true,
            completedAt: true,
            clinicalNote: true,
            note: true,
            orderedBy: {
                select: {
                    id: true,
                    name: true,
                    specialty: true,
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
            result: {
                select: {
                    id: true,
                    resultDate: true,
                    resultFileUrl: true,
                    resultText: true,
                    resultAt: true,
                    isAbnormal: true,
                    note: true,
                },
            },
        },
    },
    dispatchDecisions: {
        orderBy: [{ decisionTime: 'desc' }],
        select: {
            id: true,
            decisionTime: true,
            decisionType: true,
            note: true,
            queueItem: {
                select: {
                    id: true,
                    queueType: true,
                    laneType: true,
                },
            },
            outcomeRoom: {
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
            outcomeDoctor: {
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
            recommendations: {
                orderBy: [{ rank: 'asc' }],
                select: {
                    id: true,
                    rank: true,
                    roomId: true,
                    resourceScore: true,
                    queueLength: true,
                    utilizationRate: true,
                    estimatedWaitMinutes: true,
                    alertLevel: true,
                    reason: true,
                    wasSelected: true,
                    room: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            roomType: true,
                        },
                    },
                },
            },
            outcome: {
                select: {
                    id: true,
                    serviceId: true,
                    followedRecommendation: true,
                    actualWaitMinutes: true,
                    recommendedWaitEstimate: true,
                    waitDifference: true,
                    deviationNote: true,
                    deviationReason: true,
                },
            },
        },
    },
    escalationLogs: {
        orderBy: [{ escalationTime: 'desc' }],
        select: {
            id: true,
            escalationTime: true,
            escalationType: true,
            fromLane: true,
            toLane: true,
            fromPriorityScore: true,
            toPriorityScore: true,
            reason: true,
            outcome: true,
        },
    },
    invoice: {
        select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            paidAt: true,
            items: {
                orderBy: [{ createdAt: 'asc' }],
                select: {
                    id: true,
                    description: true,
                    quantity: true,
                    unitPrice: true,
                    totalPrice: true,
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
        },
    },
};
const resolveWalkInDoctor = async (tx, doctorId) => {
    if (!doctorId) {
        return null;
    }
    const doctor = await tx.doctorProfile.findUnique({
        where: { id: doctorId },
        select: {
            id: true,
            departmentId: true,
            defaultRoomId: true,
            isActive: true,
        },
    });
    if (!doctor || !doctor.isActive) {
        throw new http_error_1.AppError('Bác sĩ không còn khả dụng.', 404);
    }
    return doctor;
};
const resolveWalkInService = async (tx, serviceId) => {
    if (!serviceId) {
        return null;
    }
    const service = await tx.serviceCatalog.findUnique({
        where: { id: serviceId },
        select: {
            id: true,
            serviceType: true,
            roomTypeRequired: true,
            isActive: true,
        },
    });
    if (!service || !service.isActive) {
        throw new http_error_1.AppError('Dịch vụ khám đã chọn không còn khả dụng.', 404);
    }
    if (service.serviceType !== 'EXAM') {
        throw new http_error_1.AppError('Walk-in registration service must be an exam service, not a CLS service.', 400);
    }
    return service;
};
const resolveWalkInRoom = async (tx, input) => {
    if (input.doctorDefaultRoomId) {
        const room = await tx.room.findUnique({
            where: { id: input.doctorDefaultRoomId },
            select: {
                id: true,
                departmentId: true,
                roomType: true,
                isActive: true,
            },
        });
        if (!room || !room.isActive) {
            throw new http_error_1.AppError('Phòng khám của bác sĩ không còn khả dụng.', 404);
        }
        if (input.departmentId && room.departmentId !== input.departmentId) {
            throw new http_error_1.AppError('Bác sĩ không thuộc khoa đã chọn.', 409);
        }
        if (input.roomTypeRequired && room.roomType !== input.roomTypeRequired) {
            throw new http_error_1.AppError('Phòng khám không phù hợp với dịch vụ đã chọn.', 409);
        }
        return room.id;
    }
    const room = await tx.room.findFirst({
        where: {
            departmentId: input.departmentId ?? undefined,
            roomType: (input.roomTypeRequired ?? 'EXAM'),
            isActive: true,
        },
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
        select: {
            id: true,
        },
    });
    if (!room) {
        throw new http_error_1.AppError('Không tìm thấy phòng khám phù hợp cho lượt đăng ký này.', 400);
    }
    return room.id;
};
const ensureInvoiceForVisit = async (tx, visitId) => {
    const existingInvoice = await tx.invoice.findUnique({
        where: { visitId },
        select: { id: true },
    });
    if (existingInvoice) {
        return existingInvoice.id;
    }
    const visit = await tx.visit.findUnique({
        where: { id: visitId },
        select: {
            appointment: {
                select: {
                    service: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                        },
                    },
                },
            },
            clsOrders: {
                select: {
                    service: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                        },
                    },
                },
            },
        },
    });
    if (!visit) {
        throw new http_error_1.AppError('Visit not found.', 404);
    }
    const services = [
        visit.appointment?.service ?? null,
        ...visit.clsOrders.map(order => order.service),
    ].filter((service) => Boolean(service));
    const items = services.map(service => {
        const unitPrice = service.price ?? new client_1.Prisma.Decimal(0);
        return {
            serviceId: service.id,
            description: service.name,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
        };
    });
    const totalAmount = items.reduce((total, item) => total.plus(item.totalPrice), new client_1.Prisma.Decimal(0));
    const invoice = await tx.invoice.create({
        data: {
            visitId,
            totalAmount,
            paidAmount: new client_1.Prisma.Decimal(0),
            status: 'UNPAID',
            items: {
                create: items,
            },
        },
        select: { id: true },
    });
    return invoice.id;
};
const createWalkInVisit = async (input) => {
    if (!input.visit.departmentId) {
        throw new http_error_1.AppError('Khoa khám là bắt buộc.', 400);
    }
    if (!input.visit.serviceId) {
        throw new http_error_1.AppError('Dịch vụ khám là bắt buộc.', 400);
    }
    const createdVisitId = await prisma_1.prisma.$transaction(async (tx) => {
        const { age } = await (0, patient_intake_1.validateVisitBusinessRules)(tx, input.patient, input.visit);
        const resolvedPatient = await (0, patient_intake_1.resolvePatientForIntake)(tx, input.patient);
        const patient = resolvedPatient.patient;
        await (0, patient_intake_1.assertNoActiveVisitOrQueue)(tx, patient.id);
        const doctor = await resolveWalkInDoctor(tx, input.visit.doctorId);
        const service = await resolveWalkInService(tx, input.visit.serviceId);
        if (doctor?.departmentId && doctor.departmentId !== input.visit.departmentId) {
            throw new http_error_1.AppError('Bác sĩ không thuộc khoa đã chọn.', 409);
        }
        const roomId = await resolveWalkInRoom(tx, {
            departmentId: input.visit.departmentId,
            doctorDefaultRoomId: doctor?.defaultRoomId ?? null,
            roomTypeRequired: service?.roomTypeRequired ?? 'EXAM',
        });
        const priorityReason = (0, patient_intake_1.derivePriorityReason)({
            age,
            isUrgent: input.visit.isUrgent,
            isPregnant: input.visit.isPregnant,
            isDisabled: input.patient.isDisabled,
            isDisabledHeavy: input.patient.isDisabledHeavy,
            isRevolutionary: input.patient.isRevolutionary,
            isAppointment: false,
        });
        const laneType = (0, patient_intake_1.deriveLaneType)(priorityReason, false);
        const visitDate = (0, patient_intake_1.normalizeDateOnly)(new Date());
        const queueNumber = await (0, patient_intake_1.generateQueueNumber)(tx, visitDate, laneType);
        const priorityScore = (0, patient_intake_1.calculateInitialPriorityScore)({
            priorityReason,
            laneType,
            age,
        });
        const sameDoctorRequired = Boolean(doctor?.id);
        const now = new Date();
        const visit = await tx.visit.create({
            data: {
                patientId: patient.id,
                visitDate,
                queueNumber,
                chiefComplaint: input.visit.chiefComplaint ?? input.visit.note ?? null,
                isUrgent: input.visit.isUrgent,
                isPregnantAtVisit: input.visit.isPregnant,
                priorityReason,
                arrivedAt: now,
                checkedInAt: now,
                createdById: input.updatedById ?? null,
            },
        });
        await tx.visitProgress.create({
            data: {
                visitId: visit.id,
                currentState: 'WAITING_EXAM',
                laneType,
                sameDoctorRequired,
                updatedById: input.updatedById ?? null,
            },
        });
        await tx.visitStateHistory.create({
            data: {
                visitId: visit.id,
                fromState: null,
                toState: 'WAITING_EXAM',
                triggerEvent: 'WALK_IN_REGISTRATION',
                triggeredById: input.updatedById ?? null,
                transitionedAt: now,
                note: input.visit.note ?? input.visit.chiefComplaint ?? null,
            },
        });
        await tx.visitAssignment.create({
            data: {
                visitId: visit.id,
                roomId,
                doctorId: doctor?.id ?? null,
                assignedById: input.updatedById ?? null,
                assignmentReason: doctor?.id ? 'REQUESTED_DOCTOR' : 'WALK_IN_QUEUE',
                isCurrent: true,
            },
        });
        const queueItem = await tx.queueItem.create({
            data: {
                visitId: visit.id,
                queueType: 'EXAM',
                laneType,
                targetRoomId: roomId,
                targetDoctorId: doctor?.id ?? null,
                isBase: true,
                isUrgent: input.visit.isUrgent,
                isAgePriority: age !== null && (age < 6 || age >= 75),
                isPregnantPriority: input.visit.isPregnant,
                priorityReason,
                initialPriorityScore: priorityScore,
                createdById: input.updatedById ?? null,
                sameDoctorRequired,
            },
        });
        await tx.queueItemStatus.create({
            data: {
                queueItemId: queueItem.id,
                status: 'WAITING',
                priorityScore,
                lastScoreUpdated: now,
                updatedById: input.updatedById ?? null,
            },
        });
        await tx.queueItemHistory.create({
            data: {
                queueItemId: queueItem.id,
                eventType: 'WALK_IN_REGISTRATION',
                fromStatus: null,
                toStatus: 'WAITING',
                fromScore: null,
                toScore: priorityScore,
                eventTime: now,
                triggeredBy: 'reception',
                triggeredByUserId: input.updatedById ?? null,
                note: input.visit.note ?? input.visit.chiefComplaint ?? null,
            },
        });
        await tx.turn.create({
            data: {
                visitId: visit.id,
                roomId,
                doctorId: doctor?.id ?? null,
                queueItemId: queueItem.id,
                turnType: 'CLINICAL_EXAM',
                serviceId: input.visit.serviceId,
                createdById: input.updatedById ?? null,
                progress: {
                    create: {
                        status: 'PENDING',
                        updatedById: input.updatedById ?? null,
                    },
                },
            },
        });
        return visit.id;
    });
    return (0, exports.getVisitById)(createdVisitId);
};
exports.createWalkInVisit = createWalkInVisit;
const concludeVisit = async (id, payload) => {
    if (!payload.finalDiagnosis.trim()) {
        throw new http_error_1.AppError('Final diagnosis is required.', 400);
    }
    if (!payload.conclusion.trim()) {
        throw new http_error_1.AppError('Conclusion is required.', 400);
    }
    const visit = await prisma_1.prisma.visit.findUnique({
        where: { id },
        select: {
            id: true,
            progress: {
                select: {
                    currentState: true,
                    laneType: true,
                    sameDoctorRequired: true,
                },
            },
        },
    });
    if (!visit) {
        throw new http_error_1.AppError('Visit not found.', 404);
    }
    if (visit.progress?.currentState !== 'IN_CONCLUSION') {
        throw new http_error_1.AppError('Visit must be IN_CONCLUSION before conclusion.', 409);
    }
    const now = new Date();
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.visitClinical.upsert({
            where: { visitId: id },
            create: {
                visitId: id,
                finalDiagnosis: payload.finalDiagnosis.trim(),
                conclusion: payload.conclusion.trim(),
                treatmentPlan: payload.treatmentPlan?.trim() || null,
                completedAt: now,
            },
            update: {
                finalDiagnosis: payload.finalDiagnosis.trim(),
                conclusion: payload.conclusion.trim(),
                treatmentPlan: payload.treatmentPlan?.trim() || null,
                completedAt: now,
            },
        });
        await tx.visitProgress.update({
            where: { visitId: id },
            data: {
                currentState: 'WAITING_PAYMENT',
                laneType: visit.progress?.laneType ?? 'NORMAL',
                sameDoctorRequired: visit.progress?.sameDoctorRequired ?? false,
                updatedById: payload.updatedById ?? null,
            },
        });
        await tx.visitStateHistory.create({
            data: {
                visitId: id,
                fromState: 'IN_CONCLUSION',
                toState: 'WAITING_PAYMENT',
                triggerEvent: 'COMPLETE_CONCLUSION',
                triggeredById: payload.updatedById ?? null,
                transitionedAt: now,
                note: payload.note ?? payload.conclusion.trim(),
            },
        });
        await ensureInvoiceForVisit(tx, id);
    });
    return (0, exports.getVisitById)(id);
};
exports.concludeVisit = concludeVisit;
const getVisits = async (query) => {
    const where = {};
    const status = query.status?.toUpperCase();
    if (status && status !== 'ALL' && visitStates.has(status)) {
        where.progress = {
            is: {
                currentState: status,
            },
        };
    }
    if (query.search) {
        where.OR = [
            { queueNumber: { contains: query.search } },
            { chiefComplaint: { contains: query.search } },
            { patient: { patientCode: { contains: query.search } } },
            { patient: { fullName: { contains: query.search } } },
            { appointment: { note: { contains: query.search } } },
        ];
    }
    const [total, visits] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.visit.count({ where }),
        prisma_1.prisma.visit.findMany({
            where,
            orderBy: [{ createdAt: query.sort }, { visitDate: query.sort }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: listSelect,
        }),
    ]);
    return {
        items: visits.map(mapVisitListItem),
        total,
    };
};
exports.getVisits = getVisits;
const getVisitById = async (id) => {
    const visit = await prisma_1.prisma.visit.findUnique({
        where: { id },
        select: detailSelect,
    });
    if (!visit) {
        throw new http_error_1.AppError('Visit not found.', 404);
    }
    return mapVisitDetail(visit);
};
exports.getVisitById = getVisitById;
