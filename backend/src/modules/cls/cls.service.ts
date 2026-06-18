import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http-error';
import { type ListQueryParams } from '../../shared/list-query';

const orderStatuses = new Set(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

type CreateClsOrderInput = {
  visitId: string;
  orderedById: string;
  serviceId: string;
  roomId: string | null;
  priority: 'ROUTINE' | 'URGENT';
  clinicalNote: string | null;
  note: string | null;
  updatedById: string | null;
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

const mapVisit = (visit: any) => ({
  visitId: visit.id,
  queueNumber: visit.queueNumber,
  currentState: visit.progress?.currentState ?? null,
  patient: mapPatient(visit.patient),
});

const mapOrderResult = (result: any) =>
  result
    ? {
        clsResultId: result.id,
        resultDate: result.resultDate,
        resultFileUrl: result.resultFileUrl,
        resultText: result.resultText,
        resultAt: result.resultAt,
        isAbnormal: result.isAbnormal,
        note: result.note,
        resultBy: result.resultBy
          ? {
              id: result.resultBy.id,
              username: result.resultBy.username,
              fullName: result.resultBy.fullName,
              role: result.resultBy.role,
            }
          : null,
      }
    : null;

const orderListSelect = {
  id: true,
  visitId: true,
  orderedById: true,
  serviceId: true,
  roomId: true,
  priority: true,
  status: true,
  orderedAt: true,
  completedAt: true,
  clinicalNote: true,
  note: true,
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
  orderedBy: {
    select: {
      id: true,
      name: true,
      specialty: true,
      licenseNumber: true,
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
      resultBy: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.CLSOrderSelect;

const orderDetailSelect = {
  ...orderListSelect,
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
      clinical: {
        select: {
          id: true,
          examStartAt: true,
          clsStartAt: true,
          clsDoneAt: true,
          conclusionStartAt: true,
          completedAt: true,
          provisionalDiagnosis: true,
          finalDiagnosis: true,
          conclusion: true,
        },
      },
    },
  },
} satisfies Prisma.CLSOrderSelect;

const resultListSelect = {
  id: true,
  clsOrderId: true,
  resultDate: true,
  resultFileUrl: true,
  resultText: true,
  resultAt: true,
  resultById: true,
  isAbnormal: true,
  note: true,
  clsOrder: {
    select: {
      id: true,
      status: true,
      priority: true,
      orderedAt: true,
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
        },
      },
      orderedBy: {
        select: {
          id: true,
          name: true,
          specialty: true,
        },
      },
    },
  },
  resultBy: {
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
    },
  },
} satisfies Prisma.CLSResultSelect;

const mapOrder = (order: any) => ({
  clsOrderId: order.id,
  visitId: order.visitId,
  orderedById: order.orderedById,
  serviceId: order.serviceId,
  roomId: order.roomId,
  priority: order.priority,
  status: order.status,
  orderedAt: order.orderedAt,
  completedAt: order.completedAt,
  clinicalNote: order.clinicalNote,
  note: order.note,
  visit: mapVisit(order.visit),
  orderedBy: mapDoctor(order.orderedBy),
  service: mapService(order.service),
  room: mapRoom(order.room),
  result: mapOrderResult(order.result),
});

const mapResult = (result: any) => ({
  clsResultId: result.id,
  clsOrderId: result.clsOrderId,
  resultDate: result.resultDate,
  resultFileUrl: result.resultFileUrl,
  resultText: result.resultText,
  resultAt: result.resultAt,
  resultById: result.resultById,
  isAbnormal: result.isAbnormal,
  note: result.note,
  clsOrder: {
    clsOrderId: result.clsOrder.id,
    status: result.clsOrder.status,
    priority: result.clsOrder.priority,
    orderedAt: result.clsOrder.orderedAt,
    visit: mapVisit(result.clsOrder.visit),
    service: mapService(result.clsOrder.service),
    room: mapRoom(result.clsOrder.room),
    orderedBy: mapDoctor(result.clsOrder.orderedBy),
  },
  resultBy: result.resultBy
    ? {
        id: result.resultBy.id,
        username: result.resultBy.username,
        fullName: result.resultBy.fullName,
        role: result.resultBy.role,
      }
    : null,
});

const getOrderWhere = (query: ListQueryParams): Prisma.CLSOrderWhereInput => {
  const where: Prisma.CLSOrderWhereInput = {};
  const status = query.status?.toUpperCase();

  if (status && status !== 'ALL' && orderStatuses.has(status)) {
    where.status = status as any;
  }

  if (query.search) {
    where.OR = [
      { id: { contains: query.search } },
      { visit: { queueNumber: { contains: query.search } } },
      { visit: { patient: { fullName: { contains: query.search } } } },
      { visit: { patient: { patientCode: { contains: query.search } } } },
      { service: { name: { contains: query.search } } },
      { service: { code: { contains: query.search } } },
      { room: { name: { contains: query.search } } },
      { room: { code: { contains: query.search } } },
      { note: { contains: query.search } },
      { clinicalNote: { contains: query.search } },
    ];
  }

  return where;
};

const getResultWhere = (query: ListQueryParams): Prisma.CLSResultWhereInput => {
  const where: Prisma.CLSResultWhereInput = {};

  if (query.search) {
    where.OR = [
      { id: { contains: query.search } },
      { resultText: { contains: query.search } },
      { note: { contains: query.search } },
      { clsOrder: { visit: { patient: { fullName: { contains: query.search } } } } },
      { clsOrder: { service: { name: { contains: query.search } } } },
      { clsOrder: { visit: { queueNumber: { contains: query.search } } } },
    ];
  }

  return where;
};

const visitStateAfterStart = (status: string | null | undefined) => {
  if (status === 'WAITING_CLS') {
    return 'IN_CLS';
  }

  return null;
};

const getClsPriorityScore = (priority: 'ROUTINE' | 'URGENT') => (priority === 'URGENT' ? 85 : 55);

const getClsLane = (priority: 'ROUTINE' | 'URGENT') => (priority === 'URGENT' ? 'PRIORITY' : 'NORMAL');

const resolveClsRoom = async (
  tx: Prisma.TransactionClient,
  input: { roomId: string | null; serviceId: string },
) => {
  if (input.roomId) {
    const room = await tx.room.findUnique({
      where: { id: input.roomId },
      select: { id: true, isActive: true },
    });

    if (!room || !room.isActive) {
      throw new AppError('CLS room is not available.', 404);
    }

    return room.id;
  }

  const mappedRoom = await tx.serviceRoom.findFirst({
    where: {
      serviceId: input.serviceId,
      isActive: true,
      room: { isActive: true },
    },
    orderBy: [{ createdAt: 'asc' }],
    select: { roomId: true },
  });

  if (mappedRoom) {
    return mappedRoom.roomId;
  }

  const fallbackRoom = await tx.room.findFirst({
    where: {
      isActive: true,
      roomType: { in: ['LAB', 'IMAGING'] as any },
    },
    orderBy: [{ name: 'asc' }],
    select: { id: true },
  });

  if (!fallbackRoom) {
    throw new AppError('No CLS room is available.', 400);
  }

  return fallbackRoom.id;
};

const resolveConclusionRoom = async (tx: Prisma.TransactionClient, doctorId: string | null) => {
  if (doctorId) {
    const doctor = await tx.doctorProfile.findUnique({
      where: { id: doctorId },
      select: { defaultRoomId: true },
    });

    if (doctor?.defaultRoomId) {
      return doctor.defaultRoomId;
    }
  }

  const room = await tx.room.findFirst({
    where: { isActive: true, roomType: 'EXAM' },
    orderBy: [{ name: 'asc' }],
    select: { id: true },
  });

  if (!room) {
    throw new AppError('No exam room is available for conclusion.', 400);
  }

  return room.id;
};

export const createClsOrder = async (input: CreateClsOrderInput) => {
  if (!input.visitId) {
    throw new AppError('Visit id is required.', 400);
  }

  if (!input.orderedById) {
    throw new AppError('Doctor profile id is required.', 400);
  }

  if (!input.serviceId) {
    throw new AppError('CLS service id is required.', 400);
  }

  let createdOrderId = '';
  const now = new Date();

  await prisma.$transaction(async tx => {
    const visit = await tx.visit.findUnique({
      where: { id: input.visitId },
      select: {
        id: true,
        progress: {
          select: {
            currentState: true,
            sameDoctorRequired: true,
          },
        },
      },
    });

    if (!visit) {
      throw new AppError('Visit not found.', 404);
    }

    if (visit.progress?.currentState !== 'IN_EXAM') {
      throw new AppError('CLS can only be ordered while visit is IN_EXAM.', 409);
    }

    const doctor = await tx.doctorProfile.findUnique({
      where: { id: input.orderedById },
      select: { id: true, isActive: true },
    });

    if (!doctor || !doctor.isActive) {
      throw new AppError('Ordering doctor is not available.', 404);
    }

    const service = await tx.serviceCatalog.findUnique({
      where: { id: input.serviceId },
      select: { id: true, isActive: true, serviceType: true },
    });

    if (!service || !service.isActive) {
      throw new AppError('CLS service is not available.', 404);
    }

    if (!['LAB', 'IMAGING', 'OTHER'].includes(service.serviceType)) {
      throw new AppError('Selected service is not a CLS service.', 400);
    }

    const roomId = await resolveClsRoom(tx, {
      roomId: input.roomId,
      serviceId: service.id,
    });
    const laneType = getClsLane(input.priority);
    const priorityScore = getClsPriorityScore(input.priority);
    const priorityReason = input.priority === 'URGENT' ? 'EMERGENCY' : null;

    const order = await tx.cLSOrder.create({
      data: {
        visitId: visit.id,
        orderedById: doctor.id,
        serviceId: service.id,
        roomId,
        priority: input.priority,
        status: 'PENDING',
        orderedAt: now,
        clinicalNote: input.clinicalNote,
        note: input.note,
      },
      select: { id: true },
    });

    createdOrderId = order.id;

    await tx.visitProgress.update({
      where: { visitId: visit.id },
      data: {
        currentState: 'WAITING_CLS',
        laneType: laneType as any,
        updatedById: input.updatedById,
      },
    });

    await tx.visitStateHistory.create({
      data: {
        visitId: visit.id,
        fromState: 'IN_EXAM',
        toState: 'WAITING_CLS',
        triggerEvent: 'ORDER_CLS',
        triggeredById: input.updatedById,
        transitionedAt: now,
        note: input.note ?? input.clinicalNote,
      },
    });

    const queueItem = await tx.queueItem.create({
      data: {
        visitId: visit.id,
        queueType: 'CLS',
        laneType: laneType as any,
        targetRoomId: roomId,
        targetDoctorId: null,
        isBase: false,
        isUrgent: input.priority === 'URGENT',
        isAgePriority: false,
        isPregnantPriority: false,
        priorityReason: priorityReason as any,
        initialPriorityScore: priorityScore,
        appointmentTime: null,
        enqueuedAt: now,
        createdById: input.updatedById,
        sameDoctorRequired: visit.progress?.sameDoctorRequired ?? false,
      },
      select: { id: true },
    });

    await tx.queueItemStatus.create({
      data: {
        queueItemId: queueItem.id,
        status: 'WAITING',
        priorityScore,
        lastScoreUpdated: now,
        updatedById: input.updatedById,
      },
    });

    await tx.queueItemHistory.create({
      data: {
        queueItemId: queueItem.id,
        eventType: 'ORDER_CLS',
        fromStatus: null,
        toStatus: 'WAITING',
        fromScore: null,
        toScore: priorityScore,
        eventTime: now,
        triggeredBy: 'doctor',
        triggeredByUserId: input.updatedById,
        note: input.note ?? input.clinicalNote,
      },
    });
  });

  return getClsOrderById(createdOrderId);
};

export const getClsOrders = async (query: ListQueryParams) => {
  const where = getOrderWhere(query);

  const [total, orders] = await prisma.$transaction([
    prisma.cLSOrder.count({ where }),
    prisma.cLSOrder.findMany({
      where,
      orderBy: [{ orderedAt: query.sort }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: orderListSelect,
    }),
  ]);

  return {
    items: orders.map(mapOrder),
    total,
  };
};

export const getClsOrderById = async (id: string) => {
  const order = await prisma.cLSOrder.findUnique({
    where: { id },
    select: orderDetailSelect,
  });

  if (!order) {
    throw new AppError('CLS order not found.', 404);
  }

  return mapOrder(order);
};

export const getClsOrdersByVisitId = async (visitId: string) => {
  const orders = await prisma.cLSOrder.findMany({
    where: { visitId },
    orderBy: [{ orderedAt: 'desc' }],
    select: orderListSelect,
  });

  return orders.map(mapOrder);
};

const mutateOrder = async (
  id: string,
  action: 'start' | 'complete',
  payload: {
    updatedById?: string | null;
    note?: string | null;
    resultText?: string | null;
    resultFileUrl?: string | null;
    isAbnormal?: boolean | null;
    resultById?: string | null;
    resultDate?: string | null;
  },
) => {
  const order = await prisma.cLSOrder.findUnique({
    where: { id },
    select: {
      id: true,
      visitId: true,
      status: true,
      orderedAt: true,
      orderedById: true,
      serviceId: true,
      roomId: true,
      visit: {
        select: {
          id: true,
          progress: {
            select: {
              currentState: true,
              laneType: true,
              sameDoctorRequired: true,
              updatedById: true,
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
      result: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError('CLS order not found.', 404);
  }

  const currentStatus = order.status;
  const currentVisitState = order.visit.progress?.currentState ?? null;

  if (action === 'start') {
    if (currentStatus && ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(currentStatus)) {
      throw new AppError('CLS order cannot be started in its current state.', 409);
    }

    if (currentVisitState && currentVisitState !== 'WAITING_CLS') {
      throw new AppError('Visit state does not allow this CLS order to start.', 409);
    }
  }

  if (action === 'complete') {
    if (currentStatus !== 'IN_PROGRESS') {
      throw new AppError('CLS order must be in progress before completion.', 409);
    }

    if (currentVisitState && currentVisitState !== 'IN_CLS') {
      throw new AppError('Visit state does not allow this CLS order to complete.', 409);
    }

    if (order.result) {
      throw new AppError('CLS result already exists for this order.', 409);
    }
  }

  const now = new Date();
  const nextState = action === 'start' ? visitStateAfterStart(order.visit.progress?.currentState) : null;

  await prisma.$transaction(async tx => {
    await tx.cLSOrder.update({
      where: { id },
      data: {
        status: action === 'start' ? 'IN_PROGRESS' : 'COMPLETED',
        completedAt: action === 'complete' ? now : undefined,
      },
    });

    if (order.visitId && nextState) {
      const currentState = order.visit.progress?.currentState ?? null;
      await tx.visitProgress.upsert({
        where: { visitId: order.visitId },
        create: {
          visitId: order.visitId,
          currentState: nextState as any,
          laneType: order.visit.progress?.laneType ?? 'PRIORITY',
          sameDoctorRequired: order.visit.progress?.sameDoctorRequired ?? false,
          updatedById: payload.updatedById ?? null,
        },
        update: {
          currentState: nextState as any,
          laneType: order.visit.progress?.laneType ?? 'PRIORITY',
          sameDoctorRequired: order.visit.progress?.sameDoctorRequired ?? false,
          updatedById: payload.updatedById ?? order.visit.progress?.updatedById ?? null,
        },
      });

      if (currentState !== nextState) {
        await tx.visitStateHistory.create({
          data: {
            visitId: order.visitId,
            fromState: currentState as any,
            toState: nextState as any,
            triggerEvent: action === 'start' ? 'CLS_START' : 'CLS_COMPLETE',
            triggeredById: payload.updatedById ?? null,
            transitionedAt: now,
            note: payload.note ?? null,
          },
        });
      }
    }

    if (action === 'start') {
      await tx.visitClinical.upsert({
        where: { visitId: order.visitId },
        create: {
          visitId: order.visitId,
          clsStartAt: now,
        },
        update: {
          clsStartAt: now,
        },
      });
    }

    if (action === 'complete') {
      await tx.visitClinical.upsert({
        where: { visitId: order.visitId },
        create: {
          visitId: order.visitId,
          clsDoneAt: now,
        },
        update: {
          clsDoneAt: now,
        },
      });

      await tx.cLSResult.create({
        data: {
          clsOrderId: order.id,
          resultDate: payload.resultDate ? new Date(payload.resultDate) : now,
          resultFileUrl: payload.resultFileUrl ?? null,
          resultText: payload.resultText ?? null,
          resultAt: now,
          resultById: payload.resultById ?? payload.updatedById ?? null,
          isAbnormal: payload.isAbnormal ?? false,
          note: payload.note ?? null,
        },
      });

      const remainingOpenOrders = await tx.cLSOrder.count({
        where: {
          visitId: order.visitId,
          status: {
            notIn: ['COMPLETED', 'CANCELLED'] as any,
          },
        },
      });

      const currentState = order.visit.progress?.currentState ?? null;

      if (remainingOpenOrders === 0) {
        await tx.visitProgress.update({
          where: { visitId: order.visitId },
          data: {
            currentState: 'WAITING_CONCLUSION',
            laneType: 'AFTER_CLS',
            sameDoctorRequired: true,
            updatedById: payload.updatedById ?? order.visit.progress?.updatedById ?? null,
          },
        });

        if (currentState !== 'WAITING_CONCLUSION') {
          await tx.visitStateHistory.create({
            data: {
              visitId: order.visitId,
              fromState: currentState as any,
              toState: 'WAITING_CONCLUSION',
              triggerEvent: 'CLS_COMPLETE',
              triggeredById: payload.updatedById ?? null,
              transitionedAt: now,
              note: payload.note ?? 'All CLS orders completed.',
            },
          });
        }

        const existingConclusionQueue = await tx.queueItem.findFirst({
          where: {
            visitId: order.visitId,
            queueType: 'CONCLUSION',
            status: {
              is: {
                status: {
                  in: ['WAITING', 'CALLED', 'SERVING'] as any,
                },
              },
            },
          },
          select: { id: true },
        });

        if (!existingConclusionQueue) {
          const conclusionRoomId = await resolveConclusionRoom(tx, order.orderedById);
          const queueItem = await tx.queueItem.create({
            data: {
              visitId: order.visitId,
              queueType: 'CONCLUSION',
              laneType: 'AFTER_CLS',
              targetRoomId: conclusionRoomId,
              targetDoctorId: order.orderedById,
              isBase: false,
              isUrgent: false,
              isAgePriority: false,
              isPregnantPriority: false,
              priorityReason: 'AFTER_CLS',
              initialPriorityScore: 75,
              appointmentTime: null,
              enqueuedAt: now,
              createdById: payload.updatedById ?? null,
              sameDoctorRequired: true,
            },
            select: { id: true },
          });

          await tx.queueItemStatus.create({
            data: {
              queueItemId: queueItem.id,
              status: 'WAITING',
              priorityScore: 75,
              lastScoreUpdated: now,
              updatedById: payload.updatedById ?? null,
            },
          });

          await tx.queueItemHistory.create({
            data: {
              queueItemId: queueItem.id,
              eventType: 'RETURN_TO_DOCTOR',
              fromStatus: null,
              toStatus: 'WAITING',
              fromScore: null,
              toScore: 75,
              eventTime: now,
              triggeredBy: 'cls',
              triggeredByUserId: payload.updatedById ?? null,
              note: 'Return to doctor after CLS.',
            },
          });

          await tx.turn.create({
            data: {
              visitId: order.visitId,
              roomId: conclusionRoomId,
              doctorId: order.orderedById,
              queueItemId: queueItem.id,
              turnType: 'CONCLUSION',
              serviceId: order.serviceId,
              timeoutThreshold: 20,
              createdAt: now,
              createdById: payload.updatedById ?? null,
              progress: {
                create: {
                  status: 'PENDING',
                  note: 'Waiting for doctor conclusion after CLS.',
                  updatedById: payload.updatedById ?? null,
                },
              },
            },
          });
        }
      } else if (currentState !== 'WAITING_RESULT') {
        await tx.visitProgress.update({
          where: { visitId: order.visitId },
          data: {
            currentState: 'WAITING_RESULT',
            laneType: order.visit.progress?.laneType ?? 'NORMAL',
            sameDoctorRequired: order.visit.progress?.sameDoctorRequired ?? false,
            updatedById: payload.updatedById ?? order.visit.progress?.updatedById ?? null,
          },
        });

        await tx.visitStateHistory.create({
          data: {
            visitId: order.visitId,
            fromState: currentState as any,
            toState: 'WAITING_RESULT',
            triggerEvent: 'CLS_COMPLETE',
            triggeredById: payload.updatedById ?? null,
            transitionedAt: now,
            note: payload.note ?? null,
          },
        });
      }
    }
  });

  return getClsOrderById(id);
};

export const startClsOrder = async (
  id: string,
  payload: { updatedById?: string | null; note?: string | null } = {},
) => mutateOrder(id, 'start', payload);

export const completeClsOrder = async (
  id: string,
  payload: {
    updatedById?: string | null;
    note?: string | null;
    resultText?: string | null;
    resultFileUrl?: string | null;
    isAbnormal?: boolean | null;
    resultById?: string | null;
    resultDate?: string | null;
  } = {},
) => mutateOrder(id, 'complete', payload);

export const getClsResults = async (query: ListQueryParams) => {
  const where = getResultWhere(query);

  const [total, results] = await prisma.$transaction([
    prisma.cLSResult.count({ where }),
    prisma.cLSResult.findMany({
      where,
      orderBy: [{ createdAt: query.sort }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: resultListSelect,
    }),
  ]);

  return {
    items: results.map(mapResult),
    total,
  };
};

export const getClsResultById = async (id: string) => {
  const result = await prisma.cLSResult.findUnique({
    where: { id },
    select: resultListSelect,
  });

  if (!result) {
    throw new AppError('CLS result not found.', 404);
  }

  return mapResult(result);
};
