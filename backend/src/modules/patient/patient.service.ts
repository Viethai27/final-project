import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http-error';
import { type ListQueryParams } from '../../shared/list-query';
import {
  mapPatient,
  resolvePatientForIntake,
  validatePatientInput,
  type IntakePatientInput,
  type ResolvePatientForIntakeOptions,
} from './patient.intake';

export const getPatients = async (query: ListQueryParams) => {
  const where: Prisma.PatientWhereInput = {};

  if (query.search) {
    where.OR = [
      { patientCode: { contains: query.search } },
      { fullName: { contains: query.search } },
      { phone: { contains: query.search } },
      { idNumber: { contains: query.search } },
      { insuranceNumber: { contains: query.search } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: [{ createdAt: query.sort }, { fullName: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
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
        isDisabledHeavy: true,
        isDisabled: true,
        isRevolutionary: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            appointments: true,
            visits: true,
          },
        },
        visits: {
          orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: {
            id: true,
            visitDate: true,
            queueNumber: true,
            isUrgent: true,
            isPregnantAtVisit: true,
            priorityReason: true,
            createdAt: true,
            progress: {
              select: {
                currentState: true,
                laneType: true,
                sameDoctorRequired: true,
                updatedAt: true,
              },
            },
            clinical: {
              select: {
                finalDiagnosis: true,
                conclusion: true,
                completedAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return { items, total };
};

export const createPatientRecord = async (
  input: IntakePatientInput,
  options: Pick<ResolvePatientForIntakeOptions, 'createNewPatientOnPhoneMatch'> = {},
) => {
  validatePatientInput(input);

  return prisma.$transaction(async tx => {
    const resolved = await resolvePatientForIntake(tx, input, {
      createNewPatientOnPhoneMatch: options.createNewPatientOnPhoneMatch ?? false,
    });
    if (!resolved.created) {
      throw new AppError(
        'Đã tồn tại hồ sơ bệnh nhân với thông tin định danh này. Vui lòng kiểm tra CCCD/SĐT/BHYT hoặc dùng chức năng cập nhật hồ sơ.',
        409,
      );
    }

    return mapPatient(resolved.patient);
  });
};
