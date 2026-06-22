import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http-error';
import { type ListQueryParams } from '../../shared/list-query';
import { startTurn } from '../turn/turn.service';

const defaultActiveStatuses = new Set(['WAITING', 'CALLED', 'SERVING']);
const queueStatuses = new Set(['WAITING', 'CALLED', 'SERVING', 'DONE', 'TIMEOUT', 'CANCELLED']);
const queueLanes = new Set(['PRIORITY', 'APPOINTMENT', 'AFTER_CLS', 'NORMAL']);
const terminalQueueStatuses = new Set(['DONE', 'TIMEOUT', 'CANCELLED']);
const laneOrder = new Map([
  ['PRIORITY', 0],
  ['APPOINTMENT', 1],
  ['AFTER_CLS', 2],
  ['NORMAL', 3],
]);

type DepartmentSummary = {
  id: string;
  name: string;
  code: string | null;
};

type RoomSummary = {
  id: string;
  name: string;
  code: string | null;
  roomType?: string | null;
  department?: DepartmentSummary | null;
};

type ServiceSummary = {
  id: string;
  name: string;
  code: string | null;
  serviceType?: string | null;
  avgDuration?: number | null;
};

type DoctorSummary = {
  id: string;
  name: string;
  specialty: string | null;
  licenseNumber: string | null;
  department?: DepartmentSummary | null;
};

type PatientSummary = {
  id: string;
  patientCode: string;
  fullName: string;
  gender: string;
  age: number | null;
  phone: string | null;
};

const mapDepartment = (department?: DepartmentSummary | null) => {
  if (!department) {
    return null;
  }

  return {
    id: department.id,
    name: department.name,
    code: department.code,
  };
};

const mapRoom = (room?: RoomSummary | null) => {
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

const mapService = (service?: ServiceSummary | null) => {
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

const mapDoctor = (doctor?: DoctorSummary | null) => {
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

const mapPatient = (patient: PatientSummary) => ({
  id: patient.id,
  patientCode: patient.patientCode,
  fullName: patient.fullName,
  gender: patient.gender,
  age: patient.age,
  phone: patient.phone,
});

const minutesBetween = (start: Date | null | undefined, end = new Date()) => {
  if (!start) {
    return null;
  }

  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  return Number.isFinite(minutes) ? minutes : null;
};

const pickQueueDoctor = (queueItem: any) => {
  const latestTurn = queueItem.turns?.[0];

  return queueItem.targetDoctor ?? latestTurn?.doctor ?? queueItem.visit?.appointment?.doctor ?? null;
};

const pickQueueRoom = (queueItem: any) => {
  const latestTurn = queueItem.turns?.[0];

  return queueItem.targetRoom ?? latestTurn?.room ?? queueItem.visit?.appointment?.room ?? null;
};

const pickQueueService = (queueItem: any) => {
  const latestTurn = queueItem.turns?.[0];

  return queueItem.visit?.appointment?.service ?? latestTurn?.service ?? null;
};

const mapQueueVisit = (visit: any) => ({
  visitId: visit.id,
  queueNumber: visit.queueNumber,
  chiefComplaint: visit.chiefComplaint,
  currentState: visit.progress?.currentState ?? null,
  progress: visit.progress
    ? {
        currentState: visit.progress.currentState,
        laneType: visit.progress.laneType,
        sameDoctorRequired: visit.progress.sameDoctorRequired,
      }
    : null,
  appointment: visit.appointment
    ? {
        appointmentId: visit.appointment.id,
        appointmentTime: visit.appointment.appointmentTime,
        status: visit.appointment.status,
        service: mapService(visit.appointment.service),
      }
    : null,
});

const mapQueueStatus = (status: any) => ({
  currentStatus: status.status,
  priorityScore: status.priorityScore,
  lastScoreUpdated: status.lastScoreUpdated,
  calledAt: status.calledAt,
  servedAt: status.servedAt,
  dequeuedAt: status.dequeuedAt,
  isTimeout: status.isTimeout,
});

const mapQueueHistory = (history: any) => ({
  queueItemHistoryId: history.id,
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
});

const mapQueueTurn = (turn: any) => ({
  turnId: turn.id,
  turnType: turn.turnType,
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

const mapQueueItem = (queueItem: any) => {
  const status = queueItem.status ? mapQueueStatus(queueItem.status) : null;
  const room = pickQueueRoom(queueItem);
  const doctor = pickQueueDoctor(queueItem);
  const service = pickQueueService(queueItem);
  const latestTurn = queueItem.turns?.[0] ?? null;
  const startedAt = latestTurn?.progress?.startedAt ?? null;

  return {
    queueItemId: queueItem.id,
    queueNumber: queueItem.visit?.queueNumber ?? null,
    patient: mapPatient(queueItem.visit.patient),
    visit: mapQueueVisit(queueItem.visit),
    room: mapRoom(room),
    doctor: mapDoctor(doctor),
    service: mapService(service),
    status,
    currentStatus: status?.currentStatus ?? null,
    priority: {
      queueType: queueItem.queueType,
      laneType: queueItem.laneType,
      priorityReason: queueItem.priorityReason,
      initialPriorityScore: queueItem.initialPriorityScore,
      isBase: queueItem.isBase,
      isUrgent: queueItem.isUrgent,
      isAgePriority: queueItem.isAgePriority,
      isPregnantPriority: queueItem.isPregnantPriority,
      sameDoctorRequired: queueItem.sameDoctorRequired,
    },
    waitingTimeMinutes: minutesBetween(queueItem.enqueuedAt, status?.servedAt ?? status?.calledAt ?? new Date()),
    createdAt: queueItem.enqueuedAt,
    enqueuedAt: queueItem.enqueuedAt,
    calledAt: status?.calledAt ?? null,
    startedAt,
    histories: (queueItem.histories ?? []).map(mapQueueHistory),
    turns: (queueItem.turns ?? []).map(mapQueueTurn),
  };
};

const queueListSelect = {
  id: true,
  queueType: true,
  laneType: true,
  isBase: true,
  isUrgent: true,
  isAgePriority: true,
  isPregnantPriority: true,
  priorityReason: true,
  initialPriorityScore: true,
  appointmentTime: true,
  enqueuedAt: true,
  sameDoctorRequired: true,
  visit: {
    select: {
      id: true,
      queueNumber: true,
      chiefComplaint: true,
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
          service: {
            select: {
              id: true,
              name: true,
              code: true,
              serviceType: true,
              avgDuration: true,
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
      progress: {
        select: {
          currentState: true,
          laneType: true,
          sameDoctorRequired: true,
        },
      },
    },
  },
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
  turns: {
    orderBy: [{ createdAt: 'desc' }],
    take: 1,
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
} satisfies Prisma.QueueItemSelect;

const queueMutationSelect = {
  id: true,
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
  turns: {
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      progress: {
        select: {
          status: true,
          calledAt: true,
          startedAt: true,
          endedAt: true,
          timeoutAt: true,
          durationMinutes: true,
          note: true,
        },
      },
    },
  },
} satisfies Prisma.QueueItemSelect;

const queueDetailSelect = {
  id: true,
  queueType: true,
  laneType: true,
  isBase: true,
  isUrgent: true,
  isAgePriority: true,
  isPregnantPriority: true,
  priorityReason: true,
  initialPriorityScore: true,
  appointmentTime: true,
  enqueuedAt: true,
  sameDoctorRequired: true,
  visit: {
    select: {
      id: true,
      queueNumber: true,
      chiefComplaint: true,
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
          service: {
            select: {
              id: true,
              name: true,
              code: true,
              serviceType: true,
              avgDuration: true,
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
      progress: {
        select: {
          currentState: true,
          laneType: true,
          sameDoctorRequired: true,
        },
      },
    },
  },
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
} satisfies Prisma.QueueItemSelect;

export const getQueueItems = async (query: ListQueryParams & { lane?: string }) => {
  const where: Prisma.QueueItemWhereInput = {};
  const status = query.status?.toUpperCase();
  const lane = query.lane?.toUpperCase();

  if (lane && lane !== 'ALL') {
    if (!queueLanes.has(lane)) {
      throw new AppError('Invalid queue lane.', 400);
    }

    where.laneType = lane as any;
  }

  if (status && status !== 'ALL' && queueStatuses.has(status)) {
    where.status = {
      is: {
        status: status as any,
      },
    };
  } else if (!status || status === 'ACTIVE') {
    where.status = {
      is: {
        status: {
          in: [...defaultActiveStatuses] as any,
        },
      },
    };
  }

  if (query.search) {
    where.OR = [
      { visit: { queueNumber: { contains: query.search } } },
      { visit: { chiefComplaint: { contains: query.search } } },
      { visit: { patient: { patientCode: { contains: query.search } } } },
      { visit: { patient: { fullName: { contains: query.search } } } },
      { targetRoom: { name: { contains: query.search } } },
      { targetRoom: { code: { contains: query.search } } },
      { targetDoctor: { name: { contains: query.search } } },
      { targetDoctor: { specialty: { contains: query.search } } },
    ];
  }

  const items = await prisma.queueItem.findMany({
    where,
    select: queueListSelect,
  });

  const sorted = items.sort((left, right) => {
    const leftStatus = left.status?.status;
    const rightStatus = right.status?.status;
    const byLifecycle =
      Number(terminalQueueStatuses.has(leftStatus ?? '')) -
      Number(terminalQueueStatuses.has(rightStatus ?? ''));
    if (byLifecycle !== 0) {
      return byLifecycle;
    }

    const byLane = (laneOrder.get(left.laneType) ?? 99) - (laneOrder.get(right.laneType) ?? 99);
    if (byLane !== 0) {
      return byLane;
    }

    const byScore = (right.status?.priorityScore ?? 0) - (left.status?.priorityScore ?? 0);
    if (byScore !== 0) {
      return byScore;
    }

    const byEnqueuedAt = left.enqueuedAt.getTime() - right.enqueuedAt.getTime();
    if (byEnqueuedAt !== 0) {
      return byEnqueuedAt;
    }

    return (left.visit.queueNumber ?? '').localeCompare(right.visit.queueNumber ?? '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  const total = sorted.length;
  const start = (query.page - 1) * query.limit;
  const itemsPage = sorted.slice(start, start + query.limit);

  return {
    items: itemsPage.map(mapQueueItem),
    total,
  };
};

export const getQueueItemById = async (id: string) => {
  const queueItem = await prisma.queueItem.findUnique({
    where: { id },
    select: queueDetailSelect,
  });

  if (!queueItem) {
    throw new AppError('Queue item not found.', 404);
  }

  return mapQueueItem(queueItem);
};

type QueueActionPayload = {
  updatedById?: string | null;
  note?: string | null;
};

const queueActionRules = {
  call: {
    allowedStatuses: new Set(['WAITING']),
    nextStatus: 'CALLED',
    turnStatus: 'CALLED',
    eventType: 'QUEUE_CALL',
  },
  timeout: {
    allowedStatuses: new Set(['WAITING', 'CALLED']),
    nextStatus: 'TIMEOUT',
    turnStatus: 'TIMEOUT',
    eventType: 'QUEUE_TIMEOUT',
  },
  cancel: {
    allowedStatuses: new Set(['WAITING', 'CALLED']),
    nextStatus: 'CANCELLED',
    turnStatus: 'CANCELLED',
    eventType: 'QUEUE_CANCEL',
  },
} as const;

const mutateQueueItem = async (
  id: string,
  action: keyof typeof queueActionRules,
  payload: QueueActionPayload,
) => {
  const queueItem = await prisma.queueItem.findUnique({
    where: { id },
    select: queueMutationSelect,
  });

  if (!queueItem) {
    throw new AppError('Queue item not found.', 404);
  }

  const currentStatus = queueItem.status?.status ?? null;
  const rule = queueActionRules[action];
  if (!currentStatus || !rule.allowedStatuses.has(currentStatus as never)) {
    throw new AppError(`Queue item cannot be ${action}ed in its current state.`, 409);
  }

  const activeTurn = queueItem.turns.find(turn =>
    !turn.progress || ['PENDING', 'CALLED'].includes(turn.progress.status),
  );
  if (activeTurn?.progress && !['PENDING', 'CALLED'].includes(activeTurn.progress.status)) {
    throw new AppError('Linked turn cannot transition with this queue action.', 409);
  }

  const now = new Date();
  const score = queueItem.status?.priorityScore ?? queueItem.initialPriorityScore;

  await prisma.$transaction(async tx => {
    await tx.queueItemStatus.update({
      where: { queueItemId: queueItem.id },
      data: {
        status: rule.nextStatus,
        priorityScore: score,
        lastScoreUpdated: now,
        calledAt: action === 'call' ? now : queueItem.status?.calledAt ?? null,
        servedAt: queueItem.status?.servedAt ?? null,
        dequeuedAt: action === 'timeout' || action === 'cancel' ? now : null,
        isTimeout: action === 'timeout',
        updatedById: payload.updatedById ?? null,
      },
    });

    if (activeTurn) {
      const progress = activeTurn.progress;
      await tx.turnProgress.upsert({
        where: { turnId: activeTurn.id },
        create: {
          turnId: activeTurn.id,
          status: rule.turnStatus,
          calledAt: action === 'call' ? now : progress?.calledAt ?? queueItem.status?.calledAt ?? null,
          startedAt: progress?.startedAt ?? null,
          endedAt: action === 'timeout' || action === 'cancel' ? now : null,
          timeoutAt: action === 'timeout' ? now : progress?.timeoutAt ?? null,
          durationMinutes: progress?.durationMinutes ?? null,
          note: payload.note ?? progress?.note ?? null,
          updatedById: payload.updatedById ?? null,
        },
        update: {
          status: rule.turnStatus,
          calledAt: action === 'call' ? now : progress?.calledAt ?? queueItem.status?.calledAt ?? null,
          startedAt: progress?.startedAt ?? null,
          endedAt: action === 'timeout' || action === 'cancel' ? now : progress?.endedAt ?? null,
          timeoutAt: action === 'timeout' ? now : progress?.timeoutAt ?? null,
          durationMinutes: progress?.durationMinutes ?? null,
          note: payload.note ?? progress?.note ?? null,
          updatedById: payload.updatedById ?? null,
        },
      });
    }

    await tx.queueItemHistory.create({
      data: {
        queueItemId: queueItem.id,
        eventType: rule.eventType,
        fromStatus: currentStatus,
        toStatus: rule.nextStatus,
        fromScore: score,
        toScore: score,
        eventTime: now,
        triggeredBy: 'queue',
        triggeredByUserId: payload.updatedById ?? null,
        note: payload.note ?? null,
      },
    });
  });

  return getQueueItemById(id);
};

export const callQueueItem = (id: string, payload: QueueActionPayload = {}) =>
  mutateQueueItem(id, 'call', payload);

export const timeoutQueueItem = (id: string, payload: QueueActionPayload = {}) =>
  mutateQueueItem(id, 'timeout', payload);

export const cancelQueueItem = (id: string, payload: QueueActionPayload = {}) =>
  mutateQueueItem(id, 'cancel', payload);

export const startQueueItem = async (id: string, payload: QueueActionPayload = {}) => {
  const queueItem = await prisma.queueItem.findUnique({
    where: { id },
    select: queueMutationSelect,
  });

  if (!queueItem) {
    throw new AppError('Queue item not found.', 404);
  }

  const currentStatus = queueItem.status?.status ?? null;
  if (!currentStatus || !['WAITING', 'CALLED'].includes(currentStatus)) {
    throw new AppError('Queue item cannot be started in its current state.', 409);
  }

  const turn = queueItem.turns.find(candidate =>
    !candidate.progress || ['PENDING', 'CALLED'].includes(candidate.progress.status),
  );
  if (!turn) {
    throw new AppError('Queue item does not have a startable turn.', 409);
  }

  await startTurn(turn.id, payload);
  return getQueueItemById(id);
};
