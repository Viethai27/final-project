import { Prisma, type PriorityReason, type QueueLane } from '@prisma/client';
import { AppError } from '../../shared/http-error';
import { calcPriorityScore } from '../queue/priority-score.helper';

export type IntakePatientInput = {
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string | null;
  phone: string;
  idNumber: string | null;
  address: string | null;
  insuranceNumber: string | null;
  isDisabled: boolean;
  isDisabledHeavy: boolean;
  isRevolutionary: boolean;
};

export type IntakeVisitInput = {
  departmentId: string | null;
  serviceId: string | null;
  doctorId: string | null;
  appointmentTime?: string | null;
  chiefComplaint: string | null;
  note: string | null;
  isUrgent: boolean;
  isPregnant: boolean;
};

export const patientSelect = {
  id: true,
  patientCode: true,
  fullName: true,
  gender: true,
  dateOfBirth: true,
  age: true,
  idNumber: true,
  phone: true,
  address: true,
  insuranceNumber: true,
  isDisabled: true,
  isDisabledHeavy: true,
  isRevolutionary: true,
} satisfies Prisma.PatientSelect;

export const parseDate = (value: string | null, message: string) => {
  if (!value) {
    throw new AppError(message, 400);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(message, 400);
  }

  return parsed;
};

export const normalizeDateOnly = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

export const calculateAge = (dateOfBirth: Date, today = new Date()) => {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = today.getMonth() - dateOfBirth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
};

export const mapPatient = (patient: any) => ({
  id: patient.id,
  patientCode: patient.patientCode,
  fullName: patient.fullName,
  gender: patient.gender,
  age: patient.age ?? 0,
  phone: patient.phone,
  idNumber: patient.idNumber,
  address: patient.address,
  insuranceNumber: patient.insuranceNumber,
  dateOfBirth: patient.dateOfBirth,
  isDisabled: Boolean(patient.isDisabled),
  isDisabledHeavy: Boolean(patient.isDisabledHeavy),
  isRevolutionary: Boolean(patient.isRevolutionary),
});

export const validatePatientInput = (input: IntakePatientInput) => {
  if (!input.fullName.trim()) {
    throw new AppError('Họ và tên là bắt buộc.', 400);
  }

  if (!input.phone.trim()) {
    throw new AppError('Số điện thoại là bắt buộc.', 400);
  }

  const dateOfBirth = input.dateOfBirth ? parseDate(input.dateOfBirth, 'Ngày sinh không hợp lệ.') : null;
  const age = dateOfBirth ? calculateAge(dateOfBirth) : null;

  return {
    dateOfBirth,
    age,
  };
};

export const validateVisitBusinessRules = async (
  tx: Prisma.TransactionClient,
  patientInput: IntakePatientInput,
  visitInput: IntakeVisitInput,
) => {
  const { dateOfBirth, age } = validatePatientInput(patientInput);

  if (visitInput.isPregnant && patientInput.gender !== 'FEMALE') {
    throw new AppError('Chỉ bệnh nhân nữ mới được đánh dấu có thai.', 400);
  }

  if (visitInput.departmentId) {
    const department = await tx.department.findUnique({
      where: { id: visitInput.departmentId },
      select: { id: true, name: true, code: true, isActive: true },
    });

    if (!department || !department.isActive) {
      throw new AppError('Khoa đã chọn không còn hoạt động.', 404);
    }

    const isPediatricsDepartment =
      department.code?.toUpperCase() === 'NK' ||
      department.name.toLowerCase().includes('nhi');

    if (isPediatricsDepartment) {
      if (age === null) {
        throw new AppError('Cần ngày sinh để kiểm tra điều kiện chọn khoa Nhi.', 400);
      }

      if (age >= 15) {
        throw new AppError('Chỉ bệnh nhân dưới 15 tuổi mới được chọn khoa Nhi.', 400);
      }
    }
  }

  return {
    dateOfBirth,
    age,
  };
};

export const generatePatientCode = async (tx: Prisma.TransactionClient) => {
  const patients = await tx.patient.findMany({
    select: { patientCode: true },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  const nextNumber = patients.reduce((max, record) => {
    const match = /^BN(\d+)$/.exec(record.patientCode);
    if (!match) {
      return max;
    }

    return Math.max(max, Number.parseInt(match[1], 10));
  }, 0);

  return `BN${String(nextNumber + 1).padStart(3, '0')}`;
};

export const upsertPatient = async (
  tx: Prisma.TransactionClient,
  input: IntakePatientInput,
) => {
  const { dateOfBirth, age } = validatePatientInput(input);

  const existingByIdNumber = input.idNumber
    ? await tx.patient.findUnique({
        where: { idNumber: input.idNumber },
        select: patientSelect,
      })
    : null;

  const existingByPhone =
    !existingByIdNumber && input.phone
      ? await tx.patient.findFirst({
          where: { phone: input.phone },
          select: patientSelect,
        })
      : null;

  if (existingByIdNumber && existingByPhone && existingByIdNumber.id !== existingByPhone.id) {
    throw new AppError('Số điện thoại và CCCD đang thuộc hai hồ sơ khác nhau.', 409);
  }

  const current = existingByIdNumber ?? existingByPhone;

  if (current) {
    return tx.patient.update({
      where: { id: current.id },
      data: {
        fullName: input.fullName,
        gender: input.gender,
        dateOfBirth: dateOfBirth ?? undefined,
        age: age ?? undefined,
        idNumber: input.idNumber ?? undefined,
        phone: input.phone,
        address: input.address ?? undefined,
        insuranceNumber: input.insuranceNumber ?? undefined,
        isDisabled: input.isDisabled,
        isDisabledHeavy: input.isDisabledHeavy,
        isRevolutionary: input.isRevolutionary,
      },
      select: patientSelect,
    });
  }

  const patientCode = await generatePatientCode(tx);

  return tx.patient.create({
    data: {
      patientCode,
      fullName: input.fullName,
      gender: input.gender,
      dateOfBirth: dateOfBirth ?? null,
      age,
      idNumber: input.idNumber,
      phone: input.phone,
      address: input.address,
      insuranceNumber: input.insuranceNumber,
      isDisabled: input.isDisabled,
      isDisabledHeavy: input.isDisabledHeavy,
      isRevolutionary: input.isRevolutionary,
    },
    select: patientSelect,
  });
};

const ACTIVE_VISIT_STATES = [
  'WAITING_EXAM',
  'IN_EXAM',
  'WAITING_CLS',
  'IN_CLS',
  'WAITING_RESULT',
  'WAITING_CONCLUSION',
  'IN_CONCLUSION',
  'WAITING_PAYMENT',
] as const;

const ACTIVE_QUEUE_STATUSES = ['WAITING', 'CALLED', 'SERVING'] as const;

export const findPatientsByUniqueIdentifiers = async (
  tx: Prisma.TransactionClient,
  input: IntakePatientInput,
) => {
  const [byIdNumber, byInsuranceNumber, byPhone] = await Promise.all([
    input.idNumber
      ? tx.patient.findMany({
          where: { idNumber: input.idNumber },
          select: patientSelect,
        })
      : Promise.resolve([]),
    input.insuranceNumber
      ? tx.patient.findMany({
          where: { insuranceNumber: input.insuranceNumber },
          select: patientSelect,
        })
      : Promise.resolve([]),
    input.phone
      ? tx.patient.findMany({
          where: { phone: input.phone },
          select: patientSelect,
        })
      : Promise.resolve([]),
  ]);

  return {
    byIdNumber,
    byInsuranceNumber,
    byPhone,
  };
};

const getMatchedPatients = (matches: Awaited<ReturnType<typeof findPatientsByUniqueIdentifiers>>) => {
  const patients = [...matches.byIdNumber, ...matches.byInsuranceNumber, ...matches.byPhone];
  const uniquePatients = new Map(patients.map(patient => [patient.id, patient]));
  return Array.from(uniquePatients.values());
};

const getConflictMessage = () =>
  'IDENTITY_CONFLICT: Thông tin định danh bị xung đột với nhiều hồ sơ bệnh nhân khác nhau. Vui lòng kiểm tra lại CCCD/SĐT/BHYT.';

export const resolvePatientForIntake = async (
  tx: Prisma.TransactionClient,
  input: IntakePatientInput,
) => {
  const { dateOfBirth, age } = validatePatientInput(input);
  const matches = await findPatientsByUniqueIdentifiers(tx, input);
  const matchedPatients = getMatchedPatients(matches);

  if (matchedPatients.length > 1) {
    throw new AppError(getConflictMessage(), 409);
  }

  if (matchedPatients.length === 1) {
    return {
      patient: matchedPatients[0],
      created: false,
      matchedBy: {
        idNumber: matches.byIdNumber.some(patient => patient.id === matchedPatients[0].id),
        insuranceNumber: matches.byInsuranceNumber.some(patient => patient.id === matchedPatients[0].id),
        phone: matches.byPhone.some(patient => patient.id === matchedPatients[0].id),
      },
    };
  }

  const patientCode = await generatePatientCode(tx);
  const patient = await tx.patient.create({
    data: {
      patientCode,
      fullName: input.fullName,
      gender: input.gender,
      dateOfBirth: dateOfBirth ?? null,
      age,
      idNumber: input.idNumber,
      phone: input.phone,
      address: input.address,
      insuranceNumber: input.insuranceNumber,
      isDisabled: input.isDisabled,
      isDisabledHeavy: input.isDisabledHeavy,
      isRevolutionary: input.isRevolutionary,
    },
    select: patientSelect,
  });

  return {
    patient,
    created: true,
    matchedBy: {
      idNumber: false,
      insuranceNumber: false,
      phone: false,
    },
  };
};

export const assertNoActiveVisitOrQueue = async (
  tx: Prisma.TransactionClient,
  patientId: string,
) => {
  const activeQueueItem = await tx.queueItem.findFirst({
    where: {
      visit: {
        patientId,
      },
      status: {
        is: {
          status: {
            in: [...ACTIVE_QUEUE_STATUSES] as any,
          },
        },
      },
    },
    select: { id: true },
  });

  if (activeQueueItem) {
    throw new AppError('Bệnh nhân đã trong hàng đợi.', 409);
  }

  const activeVisit = await tx.visit.findFirst({
    where: {
      patientId,
      progress: {
        is: {
          currentState: {
            in: [...ACTIVE_VISIT_STATES] as any,
          },
        },
      },
    },
    select: { id: true },
  });

  if (activeVisit) {
    throw new AppError('Bệnh nhân đã có lượt khám đang hoạt động.', 409);
  }
};

export const derivePriorityReason = (params: {
  age: number | null;
  isUrgent: boolean;
  isPregnant: boolean;
  isDisabled: boolean;
  isDisabledHeavy: boolean;
  isRevolutionary: boolean;
  isAppointment: boolean;
}): PriorityReason | null => {
  if (params.isUrgent) return 'EMERGENCY';
  if (params.age !== null && params.age < 6) return 'CHILD_UNDER_6';
  if (params.isPregnant) return 'PREGNANT';
  if (params.isDisabledHeavy) return 'HEAVY_DISABLED';
  if (params.isDisabled) return 'DISABLED';
  if (params.age !== null && params.age >= 75) return 'ELDERLY_75PLUS';
  if (params.isRevolutionary) return 'REVOLUTIONARY_CONTRIBUTOR';
  if (params.isAppointment) return 'APPOINTMENT';
  return null;
};

export const deriveLaneType = (priorityReason: PriorityReason | null, isAppointment: boolean): QueueLane => {
  if (priorityReason && priorityReason !== 'APPOINTMENT' && priorityReason !== 'AFTER_CLS') {
    return 'PRIORITY';
  }

  if (isAppointment) {
    return 'APPOINTMENT';
  }

  return 'NORMAL';
};

export const getQueuePrefix = (laneType: QueueLane) => {
  if (laneType === 'APPOINTMENT') return 'A';
  if (laneType === 'PRIORITY') return 'P';
  return 'N';
};

export const generateQueueNumber = async (
  tx: Prisma.TransactionClient,
  visitDate: Date,
  laneType: QueueLane,
) => {
  const prefix = getQueuePrefix(laneType);
  const visits = await tx.visit.findMany({
    where: {
      visitDate,
      queueNumber: {
        startsWith: prefix,
      },
    },
    select: {
      queueNumber: true,
    },
  });

  const nextNumber = visits.reduce((max, record) => {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(record.queueNumber ?? '');
    if (!match) {
      return max;
    }

    return Math.max(max, Number.parseInt(match[1], 10));
  }, 0);

  return `${prefix}${String(nextNumber + 1).padStart(3, '0')}`;
};

export const calculateInitialPriorityScore = (params: {
  priorityReason: PriorityReason | null;
  laneType: QueueLane;
  age: number | null;
}) => {
  const sbase =
    params.priorityReason === 'EMERGENCY'
      ? 100
      : params.laneType === 'PRIORITY'
        ? 85
        : params.laneType === 'APPOINTMENT'
          ? 70
          : params.priorityReason === 'AFTER_CLS'
            ? 72
            : 55;

  const sage =
    params.priorityReason === 'CHILD_UNDER_6' || params.priorityReason === 'ELDERLY_75PLUS'
      ? 95
      : params.age !== null && params.age < 15
        ? 75
        : 50;

  const scls = params.priorityReason === 'AFTER_CLS' ? 100 : 0;

  return Number(
    calcPriorityScore({
      sbase,
      waitMinutes: 0,
      sage,
      scls,
    }).toFixed(2),
  );
};
