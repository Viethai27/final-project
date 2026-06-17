"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../__mocks__/prisma");
vitest_1.vi.mock('../../../lib/prisma', () => ({ prisma: prisma_1.prisma }));
const queue_service_1 = require("../../queue/queue.service");
const dispatch_service_1 = require("../dispatch.service");
const dispatch_simulation_1 = require("../../../simulation/dispatch-simulation");
const baseDepartment = {
    id: 'dep-1',
    name: 'Khoa Kham',
    code: 'KHAM',
};
const roomMap = {
    examA: {
        id: 'room-a',
        name: 'Phong A',
        code: 'A',
        roomType: 'EXAM',
        capacity: 1,
        avgServiceTime: 15,
        department: baseDepartment,
    },
    examB: {
        id: 'room-b',
        name: 'Phong B',
        code: 'B',
        roomType: 'EXAM',
        capacity: 1,
        avgServiceTime: 15,
        department: baseDepartment,
    },
    labA: {
        id: 'room-lab-a',
        name: 'Phong CLS A',
        code: 'LAB-A',
        roomType: 'LAB',
        capacity: 1,
        avgServiceTime: 20,
        department: baseDepartment,
    },
    imgA: {
        id: 'room-img-a',
        name: 'Phong Imaging A',
        code: 'IMG-A',
        roomType: 'IMAGING',
        capacity: 1,
        avgServiceTime: 25,
        department: baseDepartment,
    },
};
const createVisit = (currentState, extra = {}) => ({
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
        service: {
            id: 'svc-1',
            name: 'Kham tong quat',
            code: 'KHTQ',
            serviceType: 'EXAM',
            avgDuration: 15,
        },
        doctor: {
            id: 'doctor-1',
            name: 'Bac si A',
            specialty: 'Noi tong quat',
            licenseNumber: 'LIC-1',
            defaultRoomId: 'room-a',
            department: baseDepartment,
        },
        room: roomMap.examA,
    },
    progress: {
        currentState,
        laneType: extra.laneType ?? 'NORMAL',
        sameDoctorRequired: extra.sameDoctorRequired ?? false,
    },
    queueItems: [
        {
            id: 'qi-1',
            queueType: 'EXAM',
            laneType: extra.laneType ?? 'NORMAL',
            priorityReason: null,
            initialPriorityScore: 50,
            enqueuedAt: new Date('2026-06-01T08:05:00.000Z'),
            sameDoctorRequired: extra.sameDoctorRequired ?? false,
            targetRoom: roomMap.examA,
            targetDoctor: {
                id: 'doctor-1',
                name: 'Bac si A',
                specialty: 'Noi tong quat',
                licenseNumber: 'LIC-1',
                defaultRoomId: 'room-a',
                department: baseDepartment,
            },
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
            room: roomMap.examA,
            doctor: {
                id: 'doctor-1',
                name: 'Bac si A',
                specialty: 'Noi tong quat',
                licenseNumber: 'LIC-1',
                defaultRoomId: 'room-a',
                department: baseDepartment,
            },
            service: {
                id: 'svc-1',
                name: 'Kham tong quat',
                code: 'KHTQ',
                serviceType: 'EXAM',
                avgDuration: 15,
            },
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
    ...extra,
});
const createQueueItem = (id, laneType, priorityScore, enqueuedAt) => ({
    id,
    queueType: 'EXAM',
    laneType,
    isBase: laneType === 'NORMAL',
    isUrgent: laneType === 'PRIORITY',
    isAgePriority: false,
    isPregnantPriority: false,
    priorityReason: laneType === 'PRIORITY' ? 'EMERGENCY' : null,
    initialPriorityScore: priorityScore,
    appointmentTime: null,
    enqueuedAt,
    sameDoctorRequired: false,
    visit: {
        id,
        queueNumber: id.toUpperCase(),
        chiefComplaint: 'Sot',
        patient: {
            id: `patient-${id}`,
            patientCode: `BN-${id}`,
            fullName: `Benh nhan ${id}`,
            gender: 'MALE',
            age: 30,
            phone: '0900000000',
        },
        appointment: null,
        progress: {
            currentState: 'WAITING_EXAM',
            laneType,
            sameDoctorRequired: false,
        },
    },
    targetRoom: roomMap.examA,
    targetDoctor: null,
    status: {
        status: 'WAITING',
        priorityScore,
        lastScoreUpdated: null,
        calledAt: null,
        servedAt: null,
        dequeuedAt: null,
        isTimeout: false,
    },
    histories: [],
    turns: [],
});
const makeSimRooms = (overrides = {}) => [
    {
        id: 'room-a',
        name: 'Phong A',
        roomType: 'EXAM',
        queueLength: 1,
        utilizationRate: 0.4,
        alertLevel: 'NORMAL',
        avgServiceTime: 15,
        active: true,
        currentLoad: 1,
        ...overrides,
    },
    {
        id: 'room-b',
        name: 'Phong B',
        roomType: 'EXAM',
        queueLength: 4,
        utilizationRate: 0.4,
        alertLevel: 'NORMAL',
        avgServiceTime: 15,
        active: true,
        currentLoad: 4,
    },
];
const roomsForFallbackScenario = [
    {
        id: 'room-a',
        name: 'Phong A',
        code: 'A',
        roomType: 'EXAM',
        capacity: 1,
        avgServiceTime: 15,
        department: baseDepartment,
        utilizationRate: 1.05,
        alertLevel: 'OVERLOAD',
    },
    {
        id: 'room-b',
        name: 'Phong B',
        code: 'B',
        roomType: 'EXAM',
        capacity: 1,
        avgServiceTime: 15,
        department: baseDepartment,
        utilizationRate: 1.15,
        alertLevel: 'OVERLOAD',
    },
    {
        id: 'room-c',
        name: 'Phong C',
        code: 'C',
        roomType: 'EXAM',
        capacity: 1,
        avgServiceTime: 15,
        department: baseDepartment,
        utilizationRate: 1.25,
        alertLevel: 'OVERLOAD',
    },
];
const fullFallbackRooms = roomsForFallbackScenario.map(room => ({ ...room, utilizationRate: 1.25 }));
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
});
const installDispatchMocks = (visit, roomPool) => {
    prisma_1.prisma.visit.findUnique.mockResolvedValue(visit);
    prisma_1.prisma.room.findMany.mockImplementation(async ({ where }) => {
        const allowedTypes = where?.roomType?.in ?? ['EXAM'];
        return Object.values(roomPool)
            .filter((room) => allowedTypes.includes(room.roomType))
            .map((room) => ({ ...room }));
    });
    prisma_1.prisma.resourceLoad.findMany.mockImplementation(async ({ where }) => {
        const roomIds = where?.roomId?.in ?? [];
        return Object.values(roomPool)
            .filter((room) => roomIds.includes(room.id))
            .map((room) => ({
            roomId: room.id,
            currentLoad: room.queueLength ?? room.currentLoad ?? 0,
            queueLength: room.queueLength ?? room.currentLoad ?? 0,
            utilizationRate: room.utilizationRate ?? 0,
            waitTimeRatio: 0.2,
            queuePressure: 0.1,
            avgActualWait: room.avgServiceTime ?? 15,
            alertLevel: room.alertLevel ?? 'NORMAL',
            doctorAvailable: true,
        }));
    });
    prisma_1.prisma.queueItem.findMany.mockImplementation(async ({ where }) => {
        const roomIds = where?.targetRoomId?.in ?? [];
        return Object.values(roomPool)
            .filter((room) => roomIds.includes(room.id))
            .flatMap((room) => Array.from({ length: room.queueLength ?? 0 }, (_, index) => ({
            targetRoomId: room.id,
            order: index,
        })));
    });
    prisma_1.prisma.doctorProfile.findMany.mockResolvedValue([]);
    prisma_1.prisma.serviceRoom.findMany.mockResolvedValue([]);
};
(0, vitest_1.describe)('Luong nghiep vu & hieu qua gia lap', () => {
    (0, vitest_1.it)('KC-1: luong co ban EXAM -> CLS -> CONCLUSION', async () => {
        // Nghiep vu: benh nhan di qua day du 3 giai doan, he thong phai doi stage dung.
        const visitExam = createVisit('WAITING_EXAM');
        installDispatchMocks(visitExam, roomMap);
        const step1 = await (0, dispatch_service_1.suggestionFromVisit)(visitExam);
        (0, vitest_1.expect)((0, dispatch_service_1.getDispatchStage)(visitExam)).toBe('EXAM');
        (0, vitest_1.expect)(step1[0].room?.id).toBe('room-a');
        const visitCls = createVisit('WAITING_CLS');
        installDispatchMocks(visitCls, roomMap);
        const step2 = await (0, dispatch_service_1.suggestionFromVisit)(visitCls);
        (0, vitest_1.expect)((0, dispatch_service_1.getDispatchStage)(visitCls)).toBe('CLS');
        (0, vitest_1.expect)(step2.every(candidate => ['LAB', 'IMAGING'].includes(candidate.room?.roomType ?? ''))).toBe(true);
        const visitConclusion = createVisit('WAITING_CONCLUSION');
        installDispatchMocks(visitConclusion, roomMap);
        const step3 = await (0, dispatch_service_1.suggestionFromVisit)(visitConclusion);
        (0, vitest_1.expect)((0, dispatch_service_1.getDispatchStage)(visitConclusion)).toBe('CONCLUSION');
        (0, vitest_1.expect)(step3.every(candidate => candidate.room?.roomType === 'EXAM')).toBe(true);
    });
    (0, vitest_1.it)('KC-2: benh nhan uu tien chen ngang hang doi', async () => {
        // Nghiep vu: lane PRIORITY phai duoc xep truoc NORMAL bat ke thoi diem vao hang.
        prisma_1.prisma.queueItem.findMany.mockResolvedValueOnce([
            createQueueItem('a', 'NORMAL', 72, new Date('2026-06-01T07:30:00.000Z')),
            createQueueItem('b', 'NORMAL', 65, new Date('2026-06-01T07:40:00.000Z')),
            createQueueItem('c', 'PRIORITY', 85, new Date('2026-06-01T08:00:00.000Z')),
            createQueueItem('d', 'NORMAL', 80, new Date('2026-06-01T07:50:00.000Z')),
        ]);
        const result = await (0, queue_service_1.getQueueItems)({ page: 1, limit: 10, sort: 'desc', status: 'ALL' });
        (0, vitest_1.expect)(result.items.map(item => item.queueItemId)).toEqual(['c', 'd', 'a', 'b']);
    });
    (0, vitest_1.it)('KC-3: benh nhan quay lai sau CLS o lan AFTER_CLS', async () => {
        // Nghiep vu: sau CLS, lan AFTER_CLS phai duoc uu tien hon NORMAL va giu sameDoctorRequired.
        const visit = createVisit('WAITING_CONCLUSION', { laneType: 'AFTER_CLS', sameDoctorRequired: true });
        const rooms = {
            ...roomMap,
            examA: { ...roomMap.examA, queueLength: 1, utilizationRate: 0.35, alertLevel: 'NORMAL' },
            examB: { ...roomMap.examB, queueLength: 4, utilizationRate: 0.45, alertLevel: 'NORMAL' },
        };
        installDispatchMocks(visit, rooms);
        const result = await (0, dispatch_service_1.suggestionFromVisit)(visit);
        (0, vitest_1.expect)((0, dispatch_service_1.getDispatchStage)(visit)).toBe('CONCLUSION');
        (0, vitest_1.expect)(visit.progress.sameDoctorRequired).toBe(true);
        (0, vitest_1.expect)(result[0].room?.id).toBe('room-a');
        (0, vitest_1.expect)(result.every(candidate => candidate.room?.roomType === 'EXAM')).toBe(true);
    });
    (0, vitest_1.it)('KC-4: tat ca phong overload van con fallback cap 1', async () => {
        // Nghiep vu: khi tat ca phong deu over overload, he thong van giu fallback cap 1 va loai room vuot nguong 1.2.
        const visit = createVisit('WAITING_EXAM');
        prisma_1.prisma.visit.findUnique.mockResolvedValue(visit);
        prisma_1.prisma.room.findMany.mockResolvedValue(roomsForFallbackScenario.filter(room => room.utilizationRate < 1.2));
        prisma_1.prisma.resourceLoad.findMany.mockResolvedValue([
            { roomId: 'room-a', currentLoad: 2, queueLength: 2, utilizationRate: 1.05, waitTimeRatio: 0.2, queuePressure: 0.1, avgActualWait: 15, alertLevel: 'OVERLOAD', doctorAvailable: true },
            { roomId: 'room-b', currentLoad: 3, queueLength: 3, utilizationRate: 1.15, waitTimeRatio: 0.2, queuePressure: 0.1, avgActualWait: 15, alertLevel: 'OVERLOAD', doctorAvailable: true },
        ]);
        prisma_1.prisma.queueItem.findMany.mockResolvedValue([]);
        prisma_1.prisma.doctorProfile.findMany.mockResolvedValue([]);
        prisma_1.prisma.serviceRoom.findMany.mockResolvedValue([]);
        const result = await (0, dispatch_service_1.suggestionFromVisit)(visit);
        (0, vitest_1.expect)(result.map(candidate => candidate.room?.id)).toEqual(['room-a', 'room-b']);
        (0, vitest_1.expect)(result[0].alertLevel).toBe('OVERLOAD');
    });
    (0, vitest_1.it)('KC-5: fallback khong con phong thi tra ve mang rong', async () => {
        // Nghiep vu: neu tat ca phong de vuot nguong, he thong khong throw ma tra suggestions rong.
        const visit = createVisit('WAITING_CLS');
        prisma_1.prisma.visit.findUnique.mockResolvedValue(visit);
        prisma_1.prisma.room.findMany.mockResolvedValue([]);
        prisma_1.prisma.resourceLoad.findMany.mockResolvedValue([]);
        prisma_1.prisma.queueItem.findMany.mockResolvedValue([]);
        prisma_1.prisma.doctorProfile.findMany.mockResolvedValue([]);
        prisma_1.prisma.serviceRoom.findMany.mockResolvedValue([]);
        const result = await (0, dispatch_service_1.suggestionFromVisit)(visit);
        (0, vitest_1.expect)(result).toHaveLength(0);
    });
    (0, vitest_1.it)('KC-6: cao diem dua tren peak/off-peak va so sanh co he thong voi random', async () => {
        // Nghiep vu: khi cao diem, phuong an co he thong phai tot hon random va khong lam tang overload.
        const peakRooms = [
            { id: 'room-a', name: 'A', roomType: 'EXAM', queueLength: 8, utilizationRate: 0.95, alertLevel: 'OVERLOAD', avgServiceTime: 8, active: true, currentLoad: 8 },
            { id: 'room-b', name: 'B', roomType: 'EXAM', queueLength: 6, utilizationRate: 0.85, alertLevel: 'WARNING', avgServiceTime: 8, active: true, currentLoad: 6 },
            { id: 'room-c', name: 'C', roomType: 'EXAM', queueLength: 4, utilizationRate: 0.70, alertLevel: 'NORMAL', avgServiceTime: 8, active: true, currentLoad: 4 },
        ];
        const offPeakRooms = [
            { id: 'room-a', name: 'A', roomType: 'EXAM', queueLength: 1, utilizationRate: 0.20, alertLevel: 'NORMAL', avgServiceTime: 8, active: true, currentLoad: 1 },
            { id: 'room-b', name: 'B', roomType: 'EXAM', queueLength: 2, utilizationRate: 0.30, alertLevel: 'NORMAL', avgServiceTime: 8, active: true, currentLoad: 2 },
            { id: 'room-c', name: 'C', roomType: 'EXAM', queueLength: 0, utilizationRate: 0.10, alertLevel: 'NORMAL', avgServiceTime: 8, active: true, currentLoad: 0 },
        ];
        const peakRank = (0, dispatch_simulation_1.rankRoomSuggestions)(peakRooms, {});
        const offPeakRank = (0, dispatch_simulation_1.rankRoomSuggestions)(offPeakRooms, {});
        (0, vitest_1.expect)(peakRank[0].room.id).toBe('room-c');
        (0, vitest_1.expect)(offPeakRank[0].room.id).toBe('room-c');
        (0, vitest_1.expect)(peakRank[0].estimatedWaitMinutes).toBeGreaterThan(offPeakRank[0].estimatedWaitMinutes);
        const summary = (0, dispatch_simulation_1.runSimulation)({
            totalMinutes: 60,
            numRooms: 3,
            roomCapacity: 12,
            avgServiceTime: 8,
            arrivalRates: {
                peak: { from: 0, to: 20, rate: 0.9 },
                normal: { from: 20, to: 40, rate: 0.5 },
                offpeak: { from: 40, to: 60, rate: 0.3 },
            },
            priorityRatio: 0.15,
            numRuns: 10,
        });
        (0, vitest_1.expect)(summary.withSuggestion.avgWaitTime).toBeLessThan(summary.random.avgWaitTime);
        (0, vitest_1.expect)(summary.withSuggestion.overloadEvents).toBeLessThanOrEqual(summary.random.overloadEvents);
    });
});
