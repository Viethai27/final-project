"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../__mocks__/prisma");
vitest_1.vi.mock('../../../lib/prisma', () => ({ prisma: prisma_1.prisma }));
const dispatch_service_1 = require("../dispatch.service");
const baseDepartment = {
    id: 'dep-1',
    name: 'Khoa Kham',
    code: 'KHAM',
};
const createRoom = (id, roomType = 'EXAM', avgServiceTime = 15) => ({
    id,
    name: `Phong ${id}`,
    code: id.toUpperCase(),
    roomType,
    capacity: 1,
    avgServiceTime,
    department: baseDepartment,
});
const createService = (id, avgDuration = 15) => ({
    id,
    name: `Dich vu ${id}`,
    code: id.toUpperCase(),
    serviceType: 'EXAM',
    avgDuration,
});
const createDoctor = (id, defaultRoomId = 'room-a') => ({
    id,
    name: `Bac si ${id}`,
    specialty: 'Noi tong quat',
    licenseNumber: `LIC-${id}`,
    defaultRoomId,
    department: baseDepartment,
});
const createVisit = (overrides = {}) => ({
    id: 'visit-1',
    queueNumber: 'V-001',
    createdAt: new Date('2026-06-01T08:00:00.000Z'),
    chiefComplaint: 'Sot',
    isUrgent: false,
    isPregnantAtVisit: false,
    priorityReason: null,
    patient: {
        id: 'patient-1',
        patientCode: 'BN001',
        fullName: 'Nguyen Van A',
        gender: 'MALE',
        age: 32,
        phone: '0900000000',
    },
    appointment: {
        id: 'app-1',
        appointmentTime: '2026-06-01T07:30:00.000Z',
        status: 'SCHEDULED',
        service: createService('svc-a', 15),
        doctor: createDoctor('doctor-a'),
        room: createRoom('room-a'),
    },
    progress: {
        currentState: 'WAITING_EXAM',
        laneType: 'NORMAL',
        sameDoctorRequired: false,
    },
    queueItems: [
        {
            id: 'qi-1',
            queueType: 'EXAM',
            laneType: 'NORMAL',
            priorityReason: null,
            initialPriorityScore: 50,
            enqueuedAt: new Date('2026-06-01T08:05:00.000Z'),
            sameDoctorRequired: false,
            targetRoom: createRoom('room-a'),
            targetDoctor: createDoctor('doctor-a'),
            status: {
                status: 'WAITING',
                priorityScore: 50,
                lastScoreUpdated: null,
                calledAt: null,
                servedAt: null,
                dequeuedAt: null,
                isTimeout: false,
            },
        },
    ],
    turns: [
        {
            id: 'turn-1',
            turnType: 'EXAM',
            createdAt: new Date('2026-06-01T08:10:00.000Z'),
            room: createRoom('room-a'),
            doctor: createDoctor('doctor-a'),
            service: createService('svc-a', 15),
            progress: {
                status: 'PENDING',
                calledAt: null,
                startedAt: null,
                endedAt: null,
                timeoutAt: null,
                durationMinutes: null,
            },
        },
    ],
    clsOrders: [],
    ...overrides,
});
const createDispatchDecisionRecord = () => ({
    id: 'dec-1',
    visitId: 'visit-1',
    queueItemId: 'qi-1',
    decisionById: 'user-1',
    decisionTime: new Date('2026-06-01T09:00:00.000Z'),
    decisionType: 'MANUAL',
    outcomeRoomId: 'room-a',
    outcomeDoctorId: 'doctor-a',
    note: 'Dieu phoi thu nghiem',
    visit: {
        id: 'visit-1',
        queueNumber: 'V-001',
        patient: createVisit().patient,
        progress: createVisit().progress,
    },
    queueItem: {
        id: 'qi-1',
        queueType: 'EXAM',
        laneType: 'NORMAL',
    },
    decisionBy: {
        id: 'user-1',
        username: 'admin',
        fullName: 'Admin User',
        role: 'ADMIN',
    },
    outcomeRoom: createRoom('room-a'),
    outcomeDoctor: createDoctor('doctor-a'),
    recommendations: [
        {
            id: 'rec-1',
            rank: 1,
            roomId: 'room-a',
            resourceScore: 0.88,
            queueLength: 2,
            utilizationRate: 0.4,
            estimatedWaitMinutes: 15,
            alertLevel: 'NORMAL',
            reason: 'hang cho ngan',
            wasSelected: true,
            room: createRoom('room-a'),
        },
    ],
    outcome: {
        id: 'out-1',
        serviceId: 'svc-a',
        followedRecommendation: true,
        actualWaitMinutes: 15,
        recommendedWaitEstimate: 15,
        waitDifference: 0,
        deviationNote: null,
        deviationReason: null,
    },
});
const txMock = {
    dispatchDecision: {
        findFirst: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
    },
};
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
    prisma_1.prisma.$transaction.mockImplementation(async (arg) => {
        if (Array.isArray(arg)) {
            return Promise.all(arg);
        }
        if (typeof arg === 'function') {
            return arg(txMock);
        }
        throw new Error('Unsupported transaction payload');
    });
    prisma_1.prisma.visit.findUnique.mockResolvedValue(createVisit());
    prisma_1.prisma.room.findMany.mockResolvedValue([createRoom('room-a')]);
    prisma_1.prisma.resourceLoad.findMany.mockResolvedValue([
        {
            roomId: 'room-a',
            currentLoad: 2,
            queueLength: 2,
            utilizationRate: 0.4,
            waitTimeRatio: 0.2,
            queuePressure: 0.1,
            avgActualWait: 15,
            alertLevel: 'NORMAL',
            doctorAvailable: true,
        },
    ]);
    prisma_1.prisma.queueItem.findMany.mockResolvedValue([]);
    prisma_1.prisma.doctorProfile.findMany.mockResolvedValue([]);
    prisma_1.prisma.serviceRoom.findMany.mockResolvedValue([
        { roomId: 'room-a', service: createService('svc-a', 15) },
    ]);
    prisma_1.prisma.user.findUnique.mockImplementation(async ({ where }) => ({ id: where.id }));
    prisma_1.prisma.room.findUnique.mockImplementation(async ({ where }) => ({ id: where.id }));
    prisma_1.prisma.doctorProfile.findUnique.mockImplementation(async ({ where }) => ({ id: where.id }));
    prisma_1.prisma.serviceCatalog.findUnique.mockImplementation(async ({ where }) => ({ id: where.id }));
    prisma_1.prisma.queueItem.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, visitId: 'visit-1' }));
    txMock.dispatchDecision.findFirst.mockResolvedValue(null);
    txMock.dispatchDecision.create.mockResolvedValue(createDispatchDecisionRecord());
});
(0, vitest_1.describe)('Dispatch service coverage helpers', () => {
    (0, vitest_1.it)('getDispatchDecisions maps list result', async () => {
        // Nghiep vu: danh sach quyet dinh dieu phoi phai map dung ve DTO.
        prisma_1.prisma.dispatchDecision.count.mockResolvedValueOnce(1);
        prisma_1.prisma.dispatchDecision.findMany.mockResolvedValueOnce([createDispatchDecisionRecord()]);
        const result = await (0, dispatch_service_1.getDispatchDecisions)({
            page: 1,
            limit: 10,
            sort: 'desc',
            search: undefined,
            status: undefined,
        });
        (0, vitest_1.expect)(result.total).toBe(1);
        (0, vitest_1.expect)(result.items[0].dispatchDecisionId).toBe('dec-1');
        (0, vitest_1.expect)(result.items[0].recommendations).toHaveLength(1);
    });
    (0, vitest_1.it)('getDispatchDecisionById maps detail result', async () => {
        // Nghiep vu: lay chi tiet quyet dinh phai tra ve du thong tin can demo.
        prisma_1.prisma.dispatchDecision.findUnique.mockResolvedValueOnce(createDispatchDecisionRecord());
        const result = await (0, dispatch_service_1.getDispatchDecisionById)('dec-1');
        (0, vitest_1.expect)(result.dispatchDecisionId).toBe('dec-1');
        (0, vitest_1.expect)(result.outcome?.dispatchOutcomeId).toBe('out-1');
        (0, vitest_1.expect)(result.visit.visitId).toBe('visit-1');
    });
    (0, vitest_1.it)('createDispatchDecision creates recommendation and outcome', async () => {
        // Nghiep vu: tao quyet dinh hop le phai tao du recommendation va outcome.
        const result = await (0, dispatch_service_1.createDispatchDecision)({
            visitId: 'visit-1',
            queueItemId: 'qi-1',
            decisionById: 'user-1',
            decisionType: 'MANUAL',
            outcomeRoomId: 'room-a',
            outcomeDoctorId: 'doctor-a',
            serviceId: 'svc-a',
            note: 'Dieu phoi thu nghiem',
        });
        (0, vitest_1.expect)(result.dispatchDecisionId).toBe('dec-1');
        (0, vitest_1.expect)(result.recommendations).toHaveLength(1);
        (0, vitest_1.expect)(result.outcome?.dispatchOutcomeId).toBe('out-1');
        (0, vitest_1.expect)(txMock.dispatchDecision.create).toHaveBeenCalled();
    });
    (0, vitest_1.it)('createDispatchDecision throws 409 when decision already exists', async () => {
        // Nghiep vu: mot visit khong duoc tao trung 2 quyet dinh dieu phoi.
        txMock.dispatchDecision.findFirst.mockResolvedValueOnce({ id: 'existing-dec' });
        await (0, vitest_1.expect)((0, dispatch_service_1.createDispatchDecision)({
            visitId: 'visit-1',
        })).rejects.toMatchObject({
            statusCode: 409,
        });
    });
});
