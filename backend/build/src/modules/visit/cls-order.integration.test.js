"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_events_1 = require("node:events");
const vitest_1 = require("vitest");
const app_1 = require("../../app");
const prisma_1 = require("../../lib/prisma");
const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_CLS_DEPARTMENT_ID = 'dept_cls';
const TEST_EXAM_SERVICE_ID = 'svc_ntq';
const TEST_CLS_SERVICE_ID = 'svc_blood';
const TEST_DOCTOR_ID = 'doctor_bsnam';
const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;
const buildPatientPayload = (suffix) => ({
    fullName: `CLS Order Test ${suffix}`,
    gender: 'MALE',
    dateOfBirth: '1990-01-15',
    phone: `09${suffix.slice(-8)}`,
    idNumber: `079${suffix.slice(-9)}`,
    address: 'CLS order integration test address',
    insuranceNumber: `BHYT-CLS-${suffix}`,
    isDisabled: false,
    isDisabledHeavy: false,
    isRevolutionary: false,
});
const createWalkInPayload = (suffix) => ({
    ...buildPatientPayload(suffix),
    departmentId: TEST_DEPARTMENT_ID,
    serviceId: TEST_EXAM_SERVICE_ID,
    doctorId: TEST_DOCTOR_ID,
    chiefComplaint: 'Dau bung',
    note: 'CLS order integration test',
    isPregnant: false,
    isUrgent: false,
    updatedById: null,
});
const extractJson = async (response) => {
    const data = await response.json();
    return data;
};
const cleanupPatientArtifacts = async (identity) => {
    const filters = [];
    if (identity.phone) {
        filters.push({ phone: identity.phone });
    }
    if (identity.idNumber) {
        filters.push({ idNumber: identity.idNumber });
    }
    if (identity.insuranceNumber) {
        filters.push({ insuranceNumber: identity.insuranceNumber });
    }
    if (filters.length === 0) {
        return;
    }
    const patients = await prisma_1.prisma.patient.findMany({
        where: { OR: filters },
        select: { id: true },
    });
    for (const patient of patients) {
        const visits = await prisma_1.prisma.visit.findMany({
            where: { patientId: patient.id },
            select: { id: true },
        });
        const visitIds = visits.map(visit => visit.id);
        if (visitIds.length > 0) {
            const queueItems = await prisma_1.prisma.queueItem.findMany({
                where: { visitId: { in: visitIds } },
                select: { id: true },
            });
            const queueItemIds = queueItems.map(item => item.id);
            const turns = await prisma_1.prisma.turn.findMany({
                where: { visitId: { in: visitIds } },
                select: { id: true },
            });
            const turnIds = turns.map(turn => turn.id);
            const clsOrders = await prisma_1.prisma.cLSOrder.findMany({
                where: { visitId: { in: visitIds } },
                select: { id: true },
            });
            const clsOrderIds = clsOrders.map(order => order.id);
            if (clsOrderIds.length > 0) {
                await prisma_1.prisma.cLSResult.deleteMany({ where: { clsOrderId: { in: clsOrderIds } } });
                await prisma_1.prisma.cLSOrder.deleteMany({ where: { id: { in: clsOrderIds } } });
            }
            if (turnIds.length > 0) {
                await prisma_1.prisma.turnProgress.deleteMany({ where: { turnId: { in: turnIds } } });
                await prisma_1.prisma.turn.deleteMany({ where: { id: { in: turnIds } } });
            }
            if (queueItemIds.length > 0) {
                await prisma_1.prisma.queueItemHistory.deleteMany({ where: { queueItemId: { in: queueItemIds } } });
                await prisma_1.prisma.queueItemStatus.deleteMany({ where: { queueItemId: { in: queueItemIds } } });
                await prisma_1.prisma.queueItem.deleteMany({ where: { id: { in: queueItemIds } } });
            }
            await prisma_1.prisma.visitAssignment.deleteMany({ where: { visitId: { in: visitIds } } });
            await prisma_1.prisma.visitStateHistory.deleteMany({ where: { visitId: { in: visitIds } } });
            await prisma_1.prisma.visitProgress.deleteMany({ where: { visitId: { in: visitIds } } });
            await prisma_1.prisma.visitClinical.deleteMany({ where: { visitId: { in: visitIds } } });
            await prisma_1.prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
        }
        await prisma_1.prisma.appointment.deleteMany({ where: { patientId: patient.id } });
        await prisma_1.prisma.patient.delete({ where: { id: patient.id } });
    }
};
const createWalkIn = async (baseUrl, suffix) => {
    const payload = createWalkInPayload(suffix);
    await cleanupPatientArtifacts({
        phone: payload.phone,
        idNumber: payload.idNumber,
        insuranceNumber: payload.insuranceNumber,
    });
    const response = await fetch(`${baseUrl}/visits/walk-in`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(201);
    (0, vitest_1.expect)(body.success).toBe(true);
    return { payload, visitId: body.data.visitId };
};
const startExam = async (baseUrl, visitId) => {
    const turn = await prisma_1.prisma.turn.findFirstOrThrow({
        where: { visitId, turnType: 'CLINICAL_EXAM' },
        select: { id: true },
    });
    const response = await fetch(`${baseUrl}/turns/${turn.id}/start`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Start exam before CLS order' }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
    return turn.id;
};
const createClsOrder = async (baseUrl, input) => {
    const response = await fetch(`${baseUrl}/cls/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            visitId: input.visitId,
            orderedById: TEST_DOCTOR_ID,
            serviceId: input.serviceId ?? TEST_CLS_SERVICE_ID,
            priority: 'ROUTINE',
            clinicalNote: 'Doctor orders CLS from integration test',
            note: input.note ?? 'CLS order integration test',
            updatedById: null,
        }),
    });
    const body = await extractJson(response);
    return { response, body };
};
const getVisitClsArtifacts = async (visitId) => {
    return prisma_1.prisma.visit.findUnique({
        where: { id: visitId },
        include: {
            progress: true,
            stateHistories: {
                orderBy: { transitionedAt: 'asc' },
            },
            clsOrders: true,
            queueItems: {
                include: {
                    status: true,
                    histories: {
                        orderBy: { eventTime: 'asc' },
                    },
                },
            },
            turns: {
                include: {
                    progress: true,
                },
            },
        },
    });
};
(0, vitest_1.describe)('Doctor CLS order workflow', () => {
    let server;
    let baseUrl = '';
    let cleanupTargets = [];
    (0, vitest_1.beforeAll)(async () => {
        server = app_1.app.listen(0);
        await (0, node_events_1.once)(server, 'listening');
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}/api`;
    });
    (0, vitest_1.beforeEach)(() => {
        cleanupTargets = [];
    });
    (0, vitest_1.afterEach)(async () => {
        for (const target of cleanupTargets) {
            await cleanupPatientArtifacts(target);
        }
    });
    (0, vitest_1.afterAll)(async () => {
        await new Promise((resolve, reject) => {
            server.close(error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        await prisma_1.prisma.$disconnect();
    });
    (0, vitest_1.it)('B1 creates a CLS order from an IN_EXAM walk-in visit and exposes it to LabPage API', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await startExam(baseUrl, visitId);
        const order = await createClsOrder(baseUrl, { visitId });
        (0, vitest_1.expect)(order.response.status).toBe(201);
        (0, vitest_1.expect)(order.body.success).toBe(true);
        (0, vitest_1.expect)(order.body.data.clsOrderId).toBeTruthy();
        (0, vitest_1.expect)(order.body.data.visitId).toBe(visitId);
        (0, vitest_1.expect)(order.body.data.serviceId).toBe(TEST_CLS_SERVICE_ID);
        (0, vitest_1.expect)(order.body.data.orderedById).toBe(TEST_DOCTOR_ID);
        (0, vitest_1.expect)(order.body.data.status).toBe('PENDING');
        const clsOrderId = order.body.data.clsOrderId;
        const visit = await getVisitClsArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_CLS');
        (0, vitest_1.expect)(visit?.stateHistories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                fromState: 'IN_EXAM',
                toState: 'WAITING_CLS',
                triggerEvent: 'ORDER_CLS',
            }),
        ]));
        (0, vitest_1.expect)(visit?.clsOrders).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                id: clsOrderId,
                visitId,
                serviceId: TEST_CLS_SERVICE_ID,
                orderedById: TEST_DOCTOR_ID,
                status: 'PENDING',
            }),
        ]));
        const clsQueue = visit?.queueItems.find(item => item.queueType === 'CLS');
        (0, vitest_1.expect)(clsQueue).toEqual(vitest_1.expect.objectContaining({
            visitId,
            queueType: 'CLS',
            targetDoctorId: null,
        }));
        (0, vitest_1.expect)(clsQueue?.status?.status).toBe('WAITING');
        (0, vitest_1.expect)(clsQueue?.histories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                eventType: 'ORDER_CLS',
                fromStatus: null,
                toStatus: 'WAITING',
            }),
        ]));
        const clsTurns = visit?.turns.filter(turn => ['CLS_LAB', 'CLS_IMAGING'].includes(turn.turnType));
        (0, vitest_1.expect)(clsTurns).toHaveLength(0);
        const labListResponse = await fetch(`${baseUrl}/cls/orders?status=PENDING&search=${encodeURIComponent(payload.fullName)}`);
        const labListBody = await extractJson(labListResponse);
        (0, vitest_1.expect)(labListResponse.status).toBe(200);
        (0, vitest_1.expect)(labListBody.success).toBe(true);
        (0, vitest_1.expect)(labListBody.data).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                clsOrderId,
                visitId,
                serviceId: TEST_CLS_SERVICE_ID,
                status: 'PENDING',
                visit: vitest_1.expect.objectContaining({
                    visitId,
                    currentState: 'WAITING_CLS',
                    patient: vitest_1.expect.objectContaining({
                        fullName: payload.fullName,
                    }),
                }),
            }),
        ]));
    });
    (0, vitest_1.it)('B2 rejects CLS order when visit has not started exam', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const order = await createClsOrder(baseUrl, { visitId });
        (0, vitest_1.expect)(order.response.status).toBe(409);
        (0, vitest_1.expect)(order.body.success).toBe(false);
        (0, vitest_1.expect)(order.body.message).toMatch(/IN_EXAM/i);
        const visit = await getVisitClsArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_EXAM');
        (0, vitest_1.expect)(visit?.clsOrders).toHaveLength(0);
        (0, vitest_1.expect)(visit?.stateHistories.some(history => history.fromState === 'IN_EXAM' && history.toState === 'WAITING_CLS')).toBe(false);
    });
    (0, vitest_1.it)('B3 does not create a duplicate active CLS order when submitted twice', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await startExam(baseUrl, visitId);
        const firstOrder = await createClsOrder(baseUrl, { visitId, note: 'First CLS order' });
        (0, vitest_1.expect)(firstOrder.response.status).toBe(201);
        const duplicateOrder = await createClsOrder(baseUrl, { visitId, note: 'Duplicate CLS order' });
        const statusAllowsIdempotency = duplicateOrder.response.status === 200 || duplicateOrder.response.status === 201;
        (0, vitest_1.expect)([200, 201, 400, 409]).toContain(duplicateOrder.response.status);
        if (statusAllowsIdempotency) {
            (0, vitest_1.expect)(duplicateOrder.body.data.clsOrderId).toBe(firstOrder.body.data.clsOrderId);
        }
        else {
            (0, vitest_1.expect)(duplicateOrder.body.success).toBe(false);
        }
        const orders = await prisma_1.prisma.cLSOrder.findMany({
            where: {
                visitId,
                serviceId: TEST_CLS_SERVICE_ID,
                status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
            },
        });
        const clsQueues = await prisma_1.prisma.queueItem.findMany({
            where: {
                visitId,
                queueType: 'CLS',
                status: {
                    is: {
                        status: { in: ['WAITING', 'CALLED', 'SERVING'] },
                    },
                },
            },
        });
        const clsTurns = await prisma_1.prisma.turn.findMany({
            where: {
                visitId,
                turnType: { in: ['CLS_LAB', 'CLS_IMAGING'] },
            },
        });
        (0, vitest_1.expect)(orders).toHaveLength(1);
        (0, vitest_1.expect)(clsQueues).toHaveLength(1);
        (0, vitest_1.expect)(clsTurns).toHaveLength(0);
    });
    (0, vitest_1.it)('B4 rejects non-CLS services for CLS ordering', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await startExam(baseUrl, visitId);
        const order = await createClsOrder(baseUrl, {
            visitId,
            serviceId: TEST_EXAM_SERVICE_ID,
        });
        (0, vitest_1.expect)(order.response.status).toBe(400);
        (0, vitest_1.expect)(order.body.success).toBe(false);
        (0, vitest_1.expect)(order.body.message).toMatch(/not a CLS service/i);
        const visit = await getVisitClsArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('IN_EXAM');
        (0, vitest_1.expect)(visit?.clsOrders).toHaveLength(0);
        (0, vitest_1.expect)(visit?.queueItems.filter(item => item.queueType === 'CLS')).toHaveLength(0);
    });
    (0, vitest_1.it)('B5 rejects CLS services in walk-in registration because only doctor workflow may order CLS', async () => {
        const suffix = randomSuffix();
        const payload = {
            ...createWalkInPayload(suffix),
            departmentId: TEST_CLS_DEPARTMENT_ID,
            serviceId: TEST_CLS_SERVICE_ID,
            doctorId: null,
        };
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await cleanupPatientArtifacts({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const response = await fetch(`${baseUrl}/visits/walk-in`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await extractJson(response);
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(body.success).toBe(false);
        (0, vitest_1.expect)(body.message).toMatch(/khám|exam|cls/i);
        const patient = await prisma_1.prisma.patient.findFirst({
            where: {
                OR: [
                    { phone: payload.phone },
                    { idNumber: payload.idNumber },
                    { insuranceNumber: payload.insuranceNumber },
                ],
            },
            select: { id: true },
        });
        const visitCount = patient
            ? await prisma_1.prisma.visit.count({
                where: { patientId: patient.id },
            })
            : 0;
        const clsOrderCount = patient
            ? await prisma_1.prisma.cLSOrder.count({
                where: {
                    visit: { patientId: patient.id },
                },
            })
            : 0;
        (0, vitest_1.expect)(visitCount).toBe(0);
        (0, vitest_1.expect)(clsOrderCount).toBe(0);
    });
});
