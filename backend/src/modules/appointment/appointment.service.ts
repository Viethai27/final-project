import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http-error';
import { type ListQueryParams } from '../../shared/list-query';
import {
  calculateInitialPriorityScore,
  deriveLaneType,
  derivePriorityReason,
  generateQueueNumber,
  mapPatient,
  normalizeDateOnly,
  parseDate,
  patientSelect,
  resolvePatientForIntake,
  validateVisitBusinessRules,
  type IntakePatientInput,
  type IntakeVisitInput,
} from '../patient/patient.intake';

type CreateAppointmentBookingInput = {
  patient: IntakePatientInput;
  visit: IntakeVisitInput;
  serviceId: string;
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

const appointmentStatuses = new Set(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'LATE']);

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
} satisfies Prisma.AppointmentSelect;

const mapAppointment = (appointment: any) => ({
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

const deriveShift = (appointmentTime: Date) => (appointmentTime.getHours() < 12 ? 'AM' : 'PM');

const resolveRoom = async (
  tx: Prisma.TransactionClient,
  input: {
    departmentId?: string | null;
    serviceRoomType?: string | null;
    doctorDefaultRoomId?: string | null;
  },
) => {
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
      throw new AppError('Phòng khám không còn khả dụng.', 404);
    }

    if (input.departmentId && room.department?.id !== input.departmentId) {
      throw new AppError('Phòng khám không thuộc khoa đã chọn.', 409);
    }

    return room;
  }

  const room = await tx.room.findFirst({
    where: {
      departmentId: input.departmentId ?? undefined,
      roomType: (input.serviceRoomType ?? 'EXAM') as any,
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
    throw new AppError('Vui lòng chọn khoa/phòng khám phù hợp.', 400);
  }

  return room;
};

const resolveDoctor = async (tx: Prisma.TransactionClient, doctorId: string | null) => {
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
    throw new AppError('Bác sĩ không còn khả dụng.', 404);
  }

  return doctor;
};

const resolveService = async (tx: Prisma.TransactionClient, serviceId: string) => {
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
    throw new AppError('Dịch vụ đã chọn không còn khả dụng.', 404);
  }

  return service;
};

const resolveSchedule = async (
  tx: Prisma.TransactionClient,
  input: {
    doctorId: string | null;
    roomId: string;
    appointmentTime: Date;
  },
) => {
  if (!input.doctorId) {
    return null;
  }

  const workDate = normalizeDateOnly(input.appointmentTime);
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
        status: { in: Array.from(appointmentStatuses) as any },
      },
    });

    if (bookedCount >= schedule.maxPatients) {
      throw new AppError('Khung giờ này đã đầy. Vui lòng chọn thời gian khác.', 409);
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
    select: patientSelect,
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
} satisfies Prisma.AppointmentSelect;

const mapAppointmentListItem = (appointment: any) => ({
  appointmentId: appointment.id,
  appointmentTime: appointment.appointmentTime,
  status: appointment.status,
  note: appointment.note,
  createdAt: appointment.createdAt,
  updatedAt: appointment.updatedAt,
  patient: mapPatient(appointment.patient),
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

const getAppointmentById = async (id: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      ...appointmentSelect,
      patient: {
        select: patientSelect,
      },
    } satisfies Prisma.AppointmentSelect,
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', 404);
  }

  return {
    patient: mapPatient((appointment as any).patient),
    appointment: mapAppointment(appointment),
  };
};

export const createAppointmentBooking = async (input: CreateAppointmentBookingInput) => {
  if (!input.patient.fullName) {
    throw new AppError('Họ và tên là bắt buộc.', 400);
  }

  if (!input.patient.phone) {
    throw new AppError('Số điện thoại là bắt buộc.', 400);
  }

  if (!input.serviceId) {
    throw new AppError('Dịch vụ khám là bắt buộc.', 400);
  }

  const appointmentTime = parseDate(input.visit.appointmentTime ?? null, 'Thời gian khám không hợp lệ.');
  if (appointmentTime.getTime() < Date.now() - 60_000) {
    throw new AppError('Thời gian khám phải lớn hơn hiện tại.', 400);
  }

  return prisma.$transaction(async tx => {
    await validateVisitBusinessRules(tx, input.patient, input.visit);
    const resolvedPatient = await resolvePatientForIntake(tx, input.patient);
    const patient = resolvedPatient.patient;
    const service = await resolveService(tx, input.serviceId);
    const doctor = await resolveDoctor(tx, input.visit.doctorId);

    if (doctor?.departmentId && input.visit.departmentId && doctor.departmentId !== input.visit.departmentId) {
      throw new AppError('Bác sĩ không thuộc khoa đã chọn.', 409);
    }

    const resolvedRoom = await resolveRoom(tx, {
      departmentId: input.visit.departmentId,
      serviceRoomType: service.roomTypeRequired,
      doctorDefaultRoomId: doctor?.defaultRoomId ?? null,
    });

    if (service.roomTypeRequired && resolvedRoom.roomType !== service.roomTypeRequired) {
      throw new AppError('Phòng khám không phù hợp với dịch vụ đã chọn.', 400);
    }

    const schedule = await resolveSchedule(tx, {
      doctorId: doctor?.id ?? null,
      roomId: resolvedRoom.id,
      appointmentTime,
    });

    const conflictingAppointment = await tx.appointment.findFirst({
      where: {
        appointmentTime,
        status: { in: Array.from(appointmentStatuses) as any },
        OR: [
          doctor?.id ? { doctorId: doctor.id } : null,
          { roomId: resolvedRoom.id },
        ].filter(Boolean) as Prisma.AppointmentWhereInput[],
      },
      select: { id: true },
    });

    if (conflictingAppointment) {
      throw new AppError('Khung giờ này đã có lịch hẹn. Vui lòng chọn thời gian khác.', 409);
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
      patient: mapPatient(patient),
      appointment: mapAppointment(appointment),
    };
  });
};

export const listAppointments = async (query: ListQueryParams & { date?: string }) => {
  const where: Prisma.AppointmentWhereInput = {};
  const normalizedStatus = query.status?.toUpperCase();

  if (normalizedStatus === 'PENDING') {
    where.status = 'SCHEDULED';
  } else if (normalizedStatus && normalizedStatus !== 'ALL') {
    where.status = normalizedStatus as any;
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
    const start = normalizeDateOnly(parseDate(query.date, 'Ngày hẹn không hợp lệ.'));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.appointmentTime = {
      gte: start,
      lt: end,
    };
  }

  const [total, items] = await prisma.$transaction([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
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

const updateAppointmentStatus = async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
  const appointment = await prisma.appointment.findUnique({
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
    throw new AppError('Appointment not found.', 404);
  }

  if (appointment.visit && status === 'CANCELLED') {
    throw new AppError('Không thể hủy lịch hẹn đã check-in.', 409);
  }

  if (appointment.status === 'CHECKED_IN') {
    throw new AppError('Lịch hẹn đã được check-in.', 409);
  }

  await prisma.appointment.update({
    where: { id },
    data: { status },
  });

  return getAppointmentById(id);
};

export const approveAppointment = async (id: string) => updateAppointmentStatus(id, 'CONFIRMED');
export const rejectAppointment = async (id: string) => updateAppointmentStatus(id, 'CANCELLED');

export const checkInAppointment = async (
  id: string,
  payload: { updatedById?: string | null; note?: string | null } = {},
) => {
  const appointment = await prisma.appointment.findUnique({
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
        select: patientSelect,
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
    throw new AppError('Appointment not found.', 404);
  }

  if (appointment.visit) {
    throw new AppError('Lịch hẹn này đã được check-in trước đó.', 409);
  }

  if (!['SCHEDULED', 'CONFIRMED', 'LATE'].includes(appointment.status)) {
    throw new AppError('Trạng thái lịch hẹn hiện tại không cho phép check-in.', 409);
  }

  const roomId = appointment.roomId ?? appointment.doctor?.defaultRoomId ?? null;
  if (!roomId) {
    throw new AppError('Lịch hẹn chưa có phòng khám để check-in.', 409);
  }

  return prisma.$transaction(async tx => {
    const age = appointment.patient.age ?? null;
    const priorityReason = derivePriorityReason({
      age,
      isUrgent: false,
      isPregnant: false,
      isDisabled: Boolean(appointment.patient.isDisabled),
      isDisabledHeavy: Boolean(appointment.patient.isDisabledHeavy),
      isRevolutionary: Boolean(appointment.patient.isRevolutionary),
      isAppointment: true,
    });
    const laneType = deriveLaneType(priorityReason, true);
    const visitDate = normalizeDateOnly(new Date());
    const now = new Date();
    const queueNumber = await generateQueueNumber(tx, visitDate, laneType);
    const priorityScore = calculateInitialPriorityScore({
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
      patient: mapPatient(appointment.patient),
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
