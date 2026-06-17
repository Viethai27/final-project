import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http-error';
import { type ListQueryParams } from '../../shared/list-query';

const activeVisitStates = new Set([
  'WAITING_EXAM',
  'IN_EXAM',
  'WAITING_CLS',
  'IN_CLS',
  'WAITING_RESULT',
  'WAITING_CONCLUSION',
  'IN_CONCLUSION',
  'WAITING_PAYMENT',
]);

const stageRoomTypes: Record<string, Array<'EXAM' | 'LAB' | 'IMAGING' | 'OTHER'>> = {
  EXAM: ['EXAM'],
  CLS: ['LAB', 'IMAGING'],
  RESULT: ['LAB', 'IMAGING'],
  CONCLUSION: ['EXAM'],
  PAYMENT: ['EXAM', 'OTHER'],
};

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
  defaultRoomId?: string | null;
  department?: DepartmentSummary | null;
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
    defaultRoomId: doctor.defaultRoomId ?? null,
    department: mapDepartment(doctor.department ?? null),
  };
};

const mapPatient = (patient: any) => ({
  id: patient.id,
  patientCode: patient.patientCode,
  fullName: patient.fullName,
  gender: patient.gender,
  age: patient.age,
  phone: patient.phone,
});

const mapVisitSummary = (visit: any) => ({
  visitId: visit.id,
  queueNumber: visit.queueNumber,
  currentState: visit.progress?.currentState ?? null,
  patient: mapPatient(visit.patient),
  appointment: visit.appointment
    ? {
        appointmentId: visit.appointment.id,
        appointmentTime: visit.appointment.appointmentTime,
        status: visit.appointment.status,
        service: mapService(visit.appointment.service),
        doctor: mapDoctor(visit.appointment.doctor),
        room: mapRoom(visit.appointment.room),
      }
    : null,
});

const mapQueueItem = (queueItem: any) => ({
  queueItemId: queueItem.queueItemId ?? queueItem.id,
  queueType: queueItem.queueType,
  laneType: queueItem.laneType,
  priorityReason: queueItem.priorityReason,
  initialPriorityScore: queueItem.initialPriorityScore,
  enqueuedAt: queueItem.enqueuedAt,
  sameDoctorRequired: queueItem.sameDoctorRequired,
});

const mapDecisionRecommendation = (recommendation: any) => ({
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
});

const mapDecisionOutcome = (outcome: any) =>
  outcome
    ? {
        dispatchOutcomeId: outcome.id,
        serviceId: outcome.serviceId,
        followedRecommendation: outcome.followedRecommendation,
        actualWaitMinutes: outcome.actualWaitMinutes,
        recommendedWaitEstimate: outcome.recommendedWaitEstimate,
        waitDifference: outcome.waitDifference,
        deviationNote: outcome.deviationNote,
        deviationReason: outcome.deviationReason,
      }
    : null;

const dispatchVisitSelect = {
  id: true,
  queueNumber: true,
  createdAt: true,
  chiefComplaint: true,
  isUrgent: true,
  isPregnantAtVisit: true,
  priorityReason: true,
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
    },
  },
  progress: {
    select: {
      id: true,
      currentState: true,
      laneType: true,
      sameDoctorRequired: true,
      updatedAt: true,
    },
  },
  queueItems: {
    orderBy: [{ enqueuedAt: 'desc' }],
    take: 1,
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
  turns: {
    orderBy: [{ createdAt: 'desc' }],
    take: 1,
    select: {
      id: true,
      turnType: true,
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
  clsOrders: {
    orderBy: [{ orderedAt: 'desc' }],
    select: {
      id: true,
      status: true,
      priority: true,
      orderedAt: true,
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
    },
  },
} satisfies Prisma.VisitSelect;

const dispatchDecisionSelect = {
  id: true,
  visitId: true,
  queueItemId: true,
  decisionById: true,
  decisionTime: true,
  decisionType: true,
  outcomeRoomId: true,
  outcomeDoctorId: true,
  note: true,
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
    },
  },
  queueItem: {
    select: {
      id: true,
      queueType: true,
      laneType: true,
    },
  },
  decisionBy: {
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
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
} satisfies Prisma.DispatchDecisionSelect;

export const suggestionFromVisit = async (visit: any) => {
  const stage = getDispatchStage(visit);
  const roomTypes = stageRoomTypes[stage] ?? ['EXAM'];
  const preferredService = getPreferredService(visit, stage);
  const candidateRooms = await prisma.room.findMany({
    where: {
      isActive: true,
      roomType: {
        in: roomTypes as any,
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      roomType: true,
      capacity: true,
      avgServiceTime: true,
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  const roomIds = candidateRooms.map(room => room.id);
  const [loads, queueItems, doctors, serviceRooms] = await Promise.all([
    prisma.resourceLoad.findMany({
      where: {
        roomId: { in: roomIds },
        isActive: true,
      },
      orderBy: [{ recordedAt: 'desc' }],
      select: {
        roomId: true,
        currentLoad: true,
        queueLength: true,
        utilizationRate: true,
        waitTimeRatio: true,
        queuePressure: true,
        avgActualWait: true,
        alertLevel: true,
        doctorAvailable: true,
      },
    }),
    prisma.queueItem.findMany({
      where: {
        targetRoomId: { in: roomIds },
        status: {
          is: {
            status: {
              in: ['WAITING', 'CALLED', 'SERVING'] as any,
            },
          },
        },
      },
      select: {
        targetRoomId: true,
      },
    }),
    prisma.doctorProfile.findMany({
      where: {
        isActive: true,
        OR: [
          { defaultRoomId: { in: roomIds } },
          { departmentId: visit.appointment?.doctor?.department?.id ?? undefined },
        ],
      },
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
    }),
    prisma.serviceRoom.findMany({
      where: {
        roomId: { in: roomIds },
        isActive: true,
      },
      select: {
        roomId: true,
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
    }),
  ]);

  const queueLengthByRoom = queueItems.reduce((acc: Record<string, number>, item) => {
    if (!item.targetRoomId) {
      return acc;
    }

    acc[item.targetRoomId] = (acc[item.targetRoomId] ?? 0) + 1;
    return acc;
  }, {});

  const latestLoadByRoom = loads.reduce((acc: Record<string, any>, load) => {
    if (!acc[load.roomId]) {
      acc[load.roomId] = load;
    }

    return acc;
  }, {});

  const serviceByRoom = serviceRooms.reduce((acc: Record<string, any>, item) => {
    if (!acc[item.roomId]) {
      acc[item.roomId] = item.service;
    }

    return acc;
  }, {});

  const currentRoomId = visit.turns?.[0]?.room?.id ?? visit.queueItems?.[0]?.targetRoom?.id ?? visit.appointment?.room?.id ?? null;
  const currentDoctorId = visit.turns?.[0]?.doctor?.id ?? visit.queueItems?.[0]?.targetDoctor?.id ?? visit.appointment?.doctor?.id ?? null;

  return candidateRooms
    .map(room => {
      const load = latestLoadByRoom[room.id] ?? null;
      const queueLength = load?.queueLength ?? queueLengthByRoom[room.id] ?? 0;
      const utilizationRate = load?.utilizationRate ?? 0;
      const currentLoad = load?.currentLoad ?? queueLength;
      const alertLevel = load?.alertLevel ?? 'NORMAL';
      const doctor =
        room.roomType === 'EXAM'
          ? doctors.find(candidate => candidate.defaultRoomId === room.id) ??
            doctors.find(candidate => candidate.department?.id === room.department?.id) ??
            null
          : null;
      const roomMatchesCurrent = room.id === currentRoomId;
      const doctorMatchesCurrent = doctor?.id && doctor.id === currentDoctorId;
      const roomTypeBonus = stage === 'CLS' || stage === 'RESULT' ? 12 : 15;
      const alertPenalty = alertLevel === 'OVERLOAD' ? 18 : alertLevel === 'WARNING' ? 8 : 0;
      const score = Math.max(
        0,
        Math.round(
          100 -
            queueLength * 3 -
            utilizationRate * 25 -
            currentLoad * 1.5 -
            alertPenalty +
            (roomMatchesCurrent ? 12 : 0) +
            (doctorMatchesCurrent ? 8 : 0) +
            roomTypeBonus,
        ),
      );

      const avgServiceTime = load?.avgActualWait ?? room.avgServiceTime ?? preferredService?.avgDuration ?? 10;
      const estimatedWaitMinutes = Math.max(1, Math.round((queueLength + 1) * avgServiceTime * 0.5));
      const reasonParts = [
        roomMatchesCurrent ? 'trùng phòng hiện tại' : null,
        queueLength <= 2 ? 'hàng chờ ngắn' : `hàng chờ ${queueLength}`,
        alertLevel === 'NORMAL' ? 'tải ổn định' : alertLevel === 'WARNING' ? 'tải tăng' : 'quá tải',
      ].filter(Boolean);

      return {
        room: mapRoom(room),
        doctor: mapDoctor(doctor),
        service: mapService(serviceByRoom[room.id] ?? preferredService),
        resourceScore: Number((score / 100).toFixed(2)),
        queueLength,
        utilizationRate: Number(utilizationRate.toFixed(2)),
        estimatedWaitMinutes,
        alertLevel,
        reason: reasonParts.join(', '),
        wasSelected: false,
      };
    })
    .sort((left, right) => right.resourceScore - left.resourceScore)
    .slice(0, 3)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      wasSelected: index === 0,
    }));
};

export const getDispatchStage = (visit: any) => {
  const state = visit.progress?.currentState ?? null;

  if (!state || state === 'WAITING_EXAM' || state === 'IN_EXAM') {
    return 'EXAM';
  }

  if (state === 'WAITING_CLS' || state === 'IN_CLS') {
    return 'CLS';
  }

  if (state === 'WAITING_RESULT') {
    return 'RESULT';
  }

  if (state === 'WAITING_CONCLUSION' || state === 'IN_CONCLUSION') {
    return 'CONCLUSION';
  }

  if (state === 'WAITING_PAYMENT') {
    return 'PAYMENT';
  }

  return 'EXAM';
};

const getPreferredService = (visit: any, stage: string) => {
  if (stage === 'CLS') {
    const pendingCls = visit.clsOrders.find((order: any) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(order.status));
    return pendingCls?.service ?? visit.clsOrders[0]?.service ?? visit.appointment?.service ?? null;
  }

  if (stage === 'CONCLUSION' || stage === 'EXAM') {
    return visit.appointment?.service ?? visit.turns?.[0]?.service ?? null;
  }

  return visit.appointment?.service ?? null;
};

const listVisitSuggestionsSelect = {
  ...dispatchVisitSelect,
} satisfies Prisma.VisitSelect;

const mapSuggestion = async (visit: any) => {
  const candidates = await suggestionFromVisit(visit);
  return {
    visit: mapVisitSummary(visit),
    stage: getDispatchStage(visit),
    queueItem: visit.queueItems?.[0] ? mapQueueItem(visit.queueItems[0]) : null,
    candidates,
  };
};

export const getDispatchSuggestions = async (query: ListQueryParams) => {
  const where: Prisma.VisitWhereInput = {
    progress: {
      is: {
        currentState: {
          in: [...activeVisitStates] as any,
        },
      },
    },
  };

  const status = query.status?.toUpperCase();
  if (status && status !== 'ALL' && activeVisitStates.has(status)) {
    where.progress = {
      is: {
        currentState: status as any,
      },
    };
  }

  if (query.search) {
    where.OR = [
      { queueNumber: { contains: query.search } },
      { chiefComplaint: { contains: query.search } },
      { patient: { fullName: { contains: query.search } } },
      { patient: { patientCode: { contains: query.search } } },
    ];
  }

  const [total, visits] = await prisma.$transaction([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      orderBy: [{ createdAt: query.sort }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: listVisitSuggestionsSelect,
    }),
  ]);

  const items = await Promise.all(visits.map(mapSuggestion));

  return {
    items,
    total,
  };
};

export const getDispatchSuggestionByVisitId = async (visitId: string) => {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: listVisitSuggestionsSelect,
  });

  if (!visit) {
    throw new AppError('Visit not found.', 404);
  }

  return mapSuggestion(visit);
};

export const getDispatchDecisions = async (query: ListQueryParams) => {
  const where: Prisma.DispatchDecisionWhereInput = {};

  if (query.search) {
    where.OR = [
      { visit: { queueNumber: { contains: query.search } } },
      { visit: { patient: { fullName: { contains: query.search } } } },
      { visit: { patient: { patientCode: { contains: query.search } } } },
      { note: { contains: query.search } },
      { queueItem: { id: { contains: query.search } } },
    ];
  }

  const [total, decisions] = await prisma.$transaction([
    prisma.dispatchDecision.count({ where }),
    prisma.dispatchDecision.findMany({
      where,
      orderBy: [{ decisionTime: query.sort }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: dispatchDecisionSelect,
    }),
  ]);

  return {
    items: decisions.map(decision => ({
      dispatchDecisionId: decision.id,
      visitId: decision.visitId,
      queueItemId: decision.queueItemId,
      decisionById: decision.decisionById,
      decisionTime: decision.decisionTime,
      decisionType: decision.decisionType,
      outcomeRoomId: decision.outcomeRoomId,
      outcomeDoctorId: decision.outcomeDoctorId,
      note: decision.note,
      visit: mapVisitSummary(decision.visit),
      queueItem: decision.queueItem ? mapQueueItem(decision.queueItem) : null,
      decisionBy: decision.decisionBy,
      outcomeRoom: mapRoom(decision.outcomeRoom),
      outcomeDoctor: mapDoctor(decision.outcomeDoctor),
      recommendations: decision.recommendations.map(mapDecisionRecommendation),
      outcome: mapDecisionOutcome(decision.outcome),
    })),
    total,
  };
};

export const getDispatchDecisionById = async (id: string) => {
  const decision = await prisma.dispatchDecision.findUnique({
    where: { id },
    select: dispatchDecisionSelect,
  });

  if (!decision) {
    throw new AppError('Dispatch decision not found.', 404);
  }

  return {
    dispatchDecisionId: decision.id,
    visitId: decision.visitId,
    queueItemId: decision.queueItemId,
    decisionById: decision.decisionById,
    decisionTime: decision.decisionTime,
    decisionType: decision.decisionType,
    outcomeRoomId: decision.outcomeRoomId,
    outcomeDoctorId: decision.outcomeDoctorId,
    note: decision.note,
    visit: mapVisitSummary(decision.visit),
    queueItem: decision.queueItem ? mapQueueItem(decision.queueItem) : null,
    decisionBy: decision.decisionBy,
    outcomeRoom: mapRoom(decision.outcomeRoom),
    outcomeDoctor: mapDoctor(decision.outcomeDoctor),
    recommendations: decision.recommendations.map(mapDecisionRecommendation),
    outcome: mapDecisionOutcome(decision.outcome),
  };
};

const resolveProvidedRoom = async (roomId?: string | null) => {
  if (!roomId) {
    return null;
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
    },
  });

  if (!room) {
    throw new AppError('Room not found.', 404);
  }

  return room.id;
};

const resolveProvidedDoctor = async (doctorId?: string | null) => {
  if (!doctorId) {
    return null;
  }

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
    },
  });

  if (!doctor) {
    throw new AppError('Doctor not found.', 404);
  }

  return doctor.id;
};

const resolveProvidedUser = async (userId?: string | null) => {
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user.id;
};

const resolveProvidedService = async (serviceId?: string | null) => {
  if (!serviceId) {
    return null;
  }

  const service = await prisma.serviceCatalog.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
    },
  });

  if (!service) {
    throw new AppError('Service not found.', 404);
  }

  return service.id;
};

const resolveVisitForDecision = async (visitId: string) => {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: listVisitSuggestionsSelect,
  });

  if (!visit) {
    throw new AppError('Visit not found.', 404);
  }

  return visit;
};

export const createDispatchDecision = async (
  input: {
    visitId: string;
    queueItemId?: string | null;
    decisionById?: string | null;
    decisionType?: string | null;
    outcomeRoomId?: string | null;
    outcomeDoctorId?: string | null;
    serviceId?: string | null;
    note?: string | null;
    recommendations?: Array<{
      rank: number;
      roomId: string;
      resourceScore?: number | null;
      queueLength?: number | null;
      utilizationRate?: number | null;
      estimatedWaitMinutes?: number | null;
      alertLevel?: string | null;
      reason?: string | null;
      wasSelected?: boolean | null;
    }>;
    outcome?: {
      serviceId?: string | null;
      followedRecommendation?: boolean | null;
      actualWaitMinutes?: number | null;
      recommendedWaitEstimate?: number | null;
      waitDifference?: number | null;
      deviationNote?: string | null;
      deviationReason?: string | null;
    };
  },
) => {
  const visit = await resolveVisitForDecision(input.visitId);
  const queueItemId = input.queueItemId ?? visit.queueItems?.[0]?.id ?? null;
  if (queueItemId) {
    const queueItem = await prisma.queueItem.findUnique({
      where: { id: queueItemId },
      select: { id: true, visitId: true },
    });

    if (!queueItem) {
      throw new AppError('Queue item not found.', 404);
    }

    if (queueItem.visitId !== visit.id) {
      throw new AppError('Queue item does not belong to the visit.', 400);
    }
  }

  const decisionById = await resolveProvidedUser(input.decisionById ?? null);

  const outcomeRoomId = await resolveProvidedRoom(input.outcomeRoomId ?? null);
  const outcomeDoctorId = await resolveProvidedDoctor(input.outcomeDoctorId ?? null);
  const serviceId = await resolveProvidedService(input.serviceId ?? null);

  const suggestions = await suggestionFromVisit(visit);
  const recommendationInputs =
    input.recommendations && input.recommendations.length > 0
      ? input.recommendations
      : suggestions.map(suggestion => ({
          rank: suggestion.rank,
          roomId: suggestion.room?.id,
          resourceScore: suggestion.resourceScore,
          queueLength: suggestion.queueLength,
          utilizationRate: suggestion.utilizationRate,
          estimatedWaitMinutes: suggestion.estimatedWaitMinutes,
          alertLevel: suggestion.alertLevel,
          reason: suggestion.reason,
          wasSelected: suggestion.wasSelected,
        })).filter((recommendation): recommendation is NonNullable<typeof recommendation> => Boolean(recommendation.roomId));

  for (const recommendation of recommendationInputs) {
    await resolveProvidedRoom(recommendation.roomId);
  }

  const selectedRecommendation = recommendationInputs.find(recommendation => recommendation.wasSelected) ?? recommendationInputs[0] ?? null;
  const inferredOutcomeServiceId = await resolveProvidedService(
    input.outcome?.serviceId ?? input.serviceId ?? visit.appointment?.service?.id ?? null,
  );
  const recommendedWaitEstimate = input.outcome?.recommendedWaitEstimate ?? selectedRecommendation?.estimatedWaitMinutes ?? null;
  const actualWaitMinutes = input.outcome?.actualWaitMinutes ?? recommendedWaitEstimate ?? null;
  const waitDifference =
    input.outcome?.waitDifference ??
    (actualWaitMinutes !== null && recommendedWaitEstimate !== null ? actualWaitMinutes - recommendedWaitEstimate : null);

  const created = (await prisma.$transaction(async tx => {
    const existingDecision = await tx.dispatchDecision.findFirst({
      where: {
        visitId: visit.id,
      },
      select: {
        id: true,
      },
    });

    if (existingDecision) {
      throw new AppError('Dispatch decision already exists for this visit.', 409);
    }

    return tx.dispatchDecision.create({
      data: {
        visitId: visit.id,
        queueItemId,
        decisionById,
        decisionType: (input.decisionType ?? 'SYSTEM_SUGGESTED') as any,
        outcomeRoomId,
        outcomeDoctorId,
        note: input.note ?? null,
        recommendations: {
          create: recommendationInputs.map(recommendation => ({
            rank: recommendation.rank,
            room: {
              connect: {
                id: recommendation.roomId,
              },
            },
            resourceScore: recommendation.resourceScore ?? null,
            queueLength: recommendation.queueLength ?? null,
            utilizationRate: recommendation.utilizationRate ?? null,
            estimatedWaitMinutes: recommendation.estimatedWaitMinutes ?? null,
            alertLevel: recommendation.alertLevel ?? null,
            reason: recommendation.reason ?? null,
            wasSelected: recommendation.wasSelected ?? false,
          })),
        },
        outcome: {
          create: {
            serviceId: (input.outcome?.serviceId ?? inferredOutcomeServiceId ?? null) as string | null,
            followedRecommendation: input.outcome?.followedRecommendation ?? true,
            actualWaitMinutes,
            recommendedWaitEstimate,
            waitDifference,
            deviationNote: input.outcome?.deviationNote ?? null,
            deviationReason: input.outcome?.deviationReason ?? null,
          },
        },
      },
      select: dispatchDecisionSelect,
    });
  })) as any;

  return {
    dispatchDecisionId: created.id,
    visitId: created.visitId,
    queueItemId: created.queueItemId,
    decisionById: created.decisionById,
    decisionTime: created.decisionTime,
    decisionType: created.decisionType,
    outcomeRoomId: created.outcomeRoomId,
    outcomeDoctorId: created.outcomeDoctorId,
    note: created.note,
    visit: mapVisitSummary(created.visit),
    queueItem: created.queueItem ? mapQueueItem(created.queueItem) : null,
    decisionBy: created.decisionBy,
    outcomeRoom: mapRoom(created.outcomeRoom),
    outcomeDoctor: mapDoctor(created.outcomeDoctor),
    recommendations: created.recommendations.map(mapDecisionRecommendation),
    outcome: mapDecisionOutcome(created.outcome),
  };
};
