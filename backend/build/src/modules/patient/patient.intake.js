"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateInitialPriorityScore = exports.generateQueueNumber = exports.getQueuePrefix = exports.deriveLaneType = exports.derivePriorityReason = exports.assertNoActiveVisitOrQueue = exports.resolvePatientForIntake = exports.findPatientsByUniqueIdentifiers = exports.upsertPatient = exports.generatePatientCode = exports.validateVisitBusinessRules = exports.validatePatientInput = exports.mapPatient = exports.calculateAge = exports.normalizeDateOnly = exports.parseDate = exports.patientSelect = void 0;
const http_error_1 = require("../../shared/http-error");
const priority_score_helper_1 = require("../queue/priority-score.helper");
exports.patientSelect = {
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
};
const parseDate = (value, message) => {
    if (!value) {
        throw new http_error_1.AppError(message, 400);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new http_error_1.AppError(message, 400);
    }
    return parsed;
};
exports.parseDate = parseDate;
const normalizeDateOnly = (date) => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};
exports.normalizeDateOnly = normalizeDateOnly;
const calculateAge = (dateOfBirth, today = new Date()) => {
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDelta = today.getMonth() - dateOfBirth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) {
        age -= 1;
    }
    return Math.max(age, 0);
};
exports.calculateAge = calculateAge;
const mapPatient = (patient) => ({
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
exports.mapPatient = mapPatient;
const validatePatientInput = (input) => {
    if (!input.fullName.trim()) {
        throw new http_error_1.AppError('Họ và tên là bắt buộc.', 400);
    }
    if (!input.phone.trim()) {
        throw new http_error_1.AppError('Số điện thoại là bắt buộc.', 400);
    }
    const dateOfBirth = input.dateOfBirth ? (0, exports.parseDate)(input.dateOfBirth, 'Ngày sinh không hợp lệ.') : null;
    const age = dateOfBirth ? (0, exports.calculateAge)(dateOfBirth) : null;
    return {
        dateOfBirth,
        age,
    };
};
exports.validatePatientInput = validatePatientInput;
const validateVisitBusinessRules = async (tx, patientInput, visitInput) => {
    const { dateOfBirth, age } = (0, exports.validatePatientInput)(patientInput);
    if (visitInput.isPregnant && patientInput.gender !== 'FEMALE') {
        throw new http_error_1.AppError('Chỉ bệnh nhân nữ mới được đánh dấu có thai.', 400);
    }
    if (visitInput.departmentId) {
        const department = await tx.department.findUnique({
            where: { id: visitInput.departmentId },
            select: { id: true, name: true, code: true, isActive: true },
        });
        if (!department || !department.isActive) {
            throw new http_error_1.AppError('Khoa đã chọn không còn hoạt động.', 404);
        }
        const isPediatricsDepartment = department.code?.toUpperCase() === 'NK' ||
            department.name.toLowerCase().includes('nhi');
        if (isPediatricsDepartment) {
            if (age === null) {
                throw new http_error_1.AppError('Cần ngày sinh để kiểm tra điều kiện chọn khoa Nhi.', 400);
            }
            if (age >= 15) {
                throw new http_error_1.AppError('Chỉ bệnh nhân dưới 15 tuổi mới được chọn khoa Nhi.', 400);
            }
        }
    }
    return {
        dateOfBirth,
        age,
    };
};
exports.validateVisitBusinessRules = validateVisitBusinessRules;
const generatePatientCode = async (tx) => {
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
exports.generatePatientCode = generatePatientCode;
const upsertPatient = async (tx, input) => {
    const { dateOfBirth, age } = (0, exports.validatePatientInput)(input);
    const existingByIdNumber = input.idNumber
        ? await tx.patient.findUnique({
            where: { idNumber: input.idNumber },
            select: exports.patientSelect,
        })
        : null;
    const existingByPhone = !existingByIdNumber && input.phone
        ? await tx.patient.findFirst({
            where: { phone: input.phone },
            select: exports.patientSelect,
        })
        : null;
    if (existingByIdNumber && existingByPhone && existingByIdNumber.id !== existingByPhone.id) {
        throw new http_error_1.AppError('Số điện thoại và CCCD đang thuộc hai hồ sơ khác nhau.', 409);
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
            select: exports.patientSelect,
        });
    }
    const patientCode = await (0, exports.generatePatientCode)(tx);
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
        select: exports.patientSelect,
    });
};
exports.upsertPatient = upsertPatient;
const ACTIVE_VISIT_STATES = [
    'WAITING_EXAM',
    'IN_EXAM',
    'WAITING_CLS',
    'IN_CLS',
    'WAITING_RESULT',
    'WAITING_CONCLUSION',
    'IN_CONCLUSION',
    'WAITING_PAYMENT',
];
const ACTIVE_QUEUE_STATUSES = ['WAITING', 'CALLED', 'SERVING'];
const hasActiveVisitOrQueue = async (tx, patientId) => {
    const activeQueueItem = await tx.queueItem.findFirst({
        where: {
            visit: {
                patientId,
            },
            status: {
                is: {
                    status: {
                        in: [...ACTIVE_QUEUE_STATUSES],
                    },
                },
            },
        },
        select: { id: true },
    });
    if (activeQueueItem) {
        return true;
    }
    const activeVisit = await tx.visit.findFirst({
        where: {
            patientId,
            progress: {
                is: {
                    currentState: {
                        in: [...ACTIVE_VISIT_STATES],
                    },
                },
            },
        },
        select: { id: true },
    });
    return Boolean(activeVisit);
};
const findPatientsByUniqueIdentifiers = async (tx, input) => {
    const [byIdNumber, byInsuranceNumber, byPhone] = await Promise.all([
        input.idNumber
            ? tx.patient.findMany({
                where: { idNumber: input.idNumber },
                select: exports.patientSelect,
            })
            : Promise.resolve([]),
        input.insuranceNumber
            ? tx.patient.findMany({
                where: { insuranceNumber: input.insuranceNumber },
                select: exports.patientSelect,
            })
            : Promise.resolve([]),
        input.phone
            ? tx.patient.findMany({
                where: { phone: input.phone },
                select: exports.patientSelect,
            })
            : Promise.resolve([]),
    ]);
    return {
        byIdNumber,
        byInsuranceNumber,
        byPhone,
    };
};
exports.findPatientsByUniqueIdentifiers = findPatientsByUniqueIdentifiers;
const getStrongMatchedPatients = (matches) => {
    const patients = [...matches.byIdNumber, ...matches.byInsuranceNumber];
    const uniquePatients = new Map(patients.map(patient => [patient.id, patient]));
    return Array.from(uniquePatients.values());
};
const getConflictMessage = () => 'IDENTITY_CONFLICT: Thông tin định danh bị xung đột với nhiều hồ sơ bệnh nhân khác nhau. Vui lòng kiểm tra lại CCCD/SĐT/BHYT.';
const buildPhoneMatchesDetails = async (tx, patients) => {
    const matches = await Promise.all(patients.map(async (patient) => ({
        ...(0, exports.mapPatient)(patient),
        hasActiveVisitOrQueue: await hasActiveVisitOrQueue(tx, patient.id),
    })));
    return {
        matches,
    };
};
const resolvePatientForIntake = async (tx, input, options = {}) => {
    const { dateOfBirth, age } = (0, exports.validatePatientInput)(input);
    const matches = await (0, exports.findPatientsByUniqueIdentifiers)(tx, input);
    const strongMatchedPatients = getStrongMatchedPatients(matches);
    if (strongMatchedPatients.length > 1) {
        throw new http_error_1.AppError(getConflictMessage(), 409);
    }
    if (options.selectedPatientId) {
        const selectedPatient = await tx.patient.findUnique({
            where: { id: options.selectedPatientId },
            select: exports.patientSelect,
        });
        if (!selectedPatient) {
            throw new http_error_1.AppError('Ho so benh nhan da chon khong ton tai.', 404);
        }
        if (strongMatchedPatients.length === 1 && strongMatchedPatients[0].id !== selectedPatient.id) {
            throw new http_error_1.AppError(getConflictMessage(), 409);
        }
        return {
            patient: selectedPatient,
            created: false,
            matchedBy: {
                idNumber: matches.byIdNumber.some(patient => patient.id === selectedPatient.id),
                insuranceNumber: matches.byInsuranceNumber.some(patient => patient.id === selectedPatient.id),
                phone: matches.byPhone.some(patient => patient.id === selectedPatient.id),
            },
        };
    }
    if (strongMatchedPatients.length === 1) {
        const strongMatchedPatient = strongMatchedPatients[0];
        return {
            patient: strongMatchedPatient,
            created: false,
            matchedBy: {
                idNumber: matches.byIdNumber.some(patient => patient.id === strongMatchedPatient.id),
                insuranceNumber: matches.byInsuranceNumber.some(patient => patient.id === strongMatchedPatient.id),
                phone: matches.byPhone.some(patient => patient.id === strongMatchedPatient.id),
            },
        };
    }
    if (matches.byPhone.length > 0 && !options.createNewPatientOnPhoneMatch) {
        throw new http_error_1.AppError('PHONE_MATCHES_FOUND: So dien thoai da ton tai o ho so khac. Vui long chon ho so cu hoac xac nhan tao ho so moi.', 409, {
            code: 'PHONE_MATCHES_FOUND',
            details: await buildPhoneMatchesDetails(tx, matches.byPhone),
        });
    }
    const patientCode = await (0, exports.generatePatientCode)(tx);
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
        select: exports.patientSelect,
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
exports.resolvePatientForIntake = resolvePatientForIntake;
const assertNoActiveVisitOrQueue = async (tx, patientId) => {
    const activeQueueItem = await tx.queueItem.findFirst({
        where: {
            visit: {
                patientId,
            },
            status: {
                is: {
                    status: {
                        in: [...ACTIVE_QUEUE_STATUSES],
                    },
                },
            },
        },
        select: { id: true },
    });
    if (activeQueueItem) {
        throw new http_error_1.AppError('Bệnh nhân đã trong hàng đợi.', 409);
    }
    const activeVisit = await tx.visit.findFirst({
        where: {
            patientId,
            progress: {
                is: {
                    currentState: {
                        in: [...ACTIVE_VISIT_STATES],
                    },
                },
            },
        },
        select: { id: true },
    });
    if (activeVisit) {
        throw new http_error_1.AppError('Bệnh nhân đã có lượt khám đang hoạt động.', 409);
    }
};
exports.assertNoActiveVisitOrQueue = assertNoActiveVisitOrQueue;
const derivePriorityReason = (params) => {
    if (params.isUrgent)
        return 'EMERGENCY';
    if (params.age !== null && params.age < 6)
        return 'CHILD_UNDER_6';
    if (params.isPregnant)
        return 'PREGNANT';
    if (params.isDisabledHeavy)
        return 'HEAVY_DISABLED';
    if (params.isDisabled)
        return 'DISABLED';
    if (params.age !== null && params.age >= 75)
        return 'ELDERLY_75PLUS';
    if (params.isRevolutionary)
        return 'REVOLUTIONARY_CONTRIBUTOR';
    if (params.isAppointment)
        return 'APPOINTMENT';
    return null;
};
exports.derivePriorityReason = derivePriorityReason;
const deriveLaneType = (priorityReason, isAppointment) => {
    if (priorityReason && priorityReason !== 'APPOINTMENT' && priorityReason !== 'AFTER_CLS') {
        return 'PRIORITY';
    }
    if (isAppointment) {
        return 'APPOINTMENT';
    }
    return 'NORMAL';
};
exports.deriveLaneType = deriveLaneType;
const getQueuePrefix = (laneType) => {
    if (laneType === 'APPOINTMENT')
        return 'A';
    if (laneType === 'PRIORITY')
        return 'P';
    return 'N';
};
exports.getQueuePrefix = getQueuePrefix;
const generateQueueNumber = async (tx, visitDate, laneType) => {
    const prefix = (0, exports.getQueuePrefix)(laneType);
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
exports.generateQueueNumber = generateQueueNumber;
const calculateInitialPriorityScore = (params) => {
    const sbase = params.priorityReason === 'EMERGENCY'
        ? 100
        : params.laneType === 'PRIORITY'
            ? 85
            : params.laneType === 'APPOINTMENT'
                ? 70
                : params.priorityReason === 'AFTER_CLS'
                    ? 72
                    : 55;
    const sage = params.priorityReason === 'CHILD_UNDER_6' || params.priorityReason === 'ELDERLY_75PLUS'
        ? 95
        : params.age !== null && params.age < 15
            ? 75
            : 50;
    const scls = params.priorityReason === 'AFTER_CLS' ? 100 : 0;
    return Number((0, priority_score_helper_1.calcPriorityScore)({
        sbase,
        waitMinutes: 0,
        sage,
        scls,
    }).toFixed(2));
};
exports.calculateInitialPriorityScore = calculateInitialPriorityScore;
