"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPatientRecord = exports.getPatients = void 0;
const prisma_1 = require("../../lib/prisma");
const http_error_1 = require("../../shared/http-error");
const patient_intake_1 = require("./patient.intake");
const getPatients = async (query) => {
    const where = {};
    if (query.search) {
        where.OR = [
            { patientCode: { contains: query.search } },
            { fullName: { contains: query.search } },
            { phone: { contains: query.search } },
            { idNumber: { contains: query.search } },
            { insuranceNumber: { contains: query.search } },
        ];
    }
    const [total, items] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.patient.count({ where }),
        prisma_1.prisma.patient.findMany({
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
exports.getPatients = getPatients;
const createPatientRecord = async (input, options = {}) => {
    (0, patient_intake_1.validatePatientInput)(input);
    return prisma_1.prisma.$transaction(async (tx) => {
        const resolved = await (0, patient_intake_1.resolvePatientForIntake)(tx, input, {
            createNewPatientOnPhoneMatch: options.createNewPatientOnPhoneMatch ?? false,
        });
        if (!resolved.created) {
            throw new http_error_1.AppError('Đã tồn tại hồ sơ bệnh nhân với thông tin định danh này. Vui lòng kiểm tra CCCD/SĐT/BHYT hoặc dùng chức năng cập nhật hồ sơ.', 409);
        }
        return (0, patient_intake_1.mapPatient)(resolved.patient);
    });
};
exports.createPatientRecord = createPatientRecord;
