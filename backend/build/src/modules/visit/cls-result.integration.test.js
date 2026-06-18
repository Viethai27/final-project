"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_events_1 = require("node:events");
const vitest_1 = require("vitest");
const app_1 = require("../../app");
const prisma_1 = require("../../lib/prisma");
const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_EXAM_SERVICE_ID = 'svc_ntq';
const TEST_CLS_SERVICE_ID = 'svc_blood';
const TEST_DOCTOR_ID = 'doctor_bsnam';
const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;
const buildPatientPayload = (suffix) => ({
    fullName: `CLS Result Test ${suffix}`,
    gender: 'MALE',
    dateOfBirth: '1990-01-15',
    phone: `09${suffix.slice(-8)}`,
    idNumber: `079${suffix.slice(-9)}`,
    address: 'CLS result integration test address',
    insuranceNumber: `BHYT-RESULT-${suffix}`,
    isDisabled: false,
    isDisabledHeavy: false,
    isRevolutionary: false,
});
const createWalkInPayload = (suffix) => ({
    ...buildPatientPayload(suffix),
    departmentId: TEST_DEPARTMENT_ID,
    serviceId: TEST_EXAM_SERVICE_ID,
    doctorId: TEST_DOCTOR_ID,
    chiefComplaint: 'Dau nguc',
    note: 'CLS result integration test',
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
        body: JSON.stringify({ note: 'Start exam before CLS result test' }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
};
const orderCls = async (baseUrl, visitId) => {
    const response = await fetch(`${baseUrl}/cls/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            visitId,
            orderedById: TEST_DOCTOR_ID,
            serviceId: TEST_CLS_SERVICE_ID,
            priority: 'ROUTINE',
            clinicalNote: 'Doctor orders CLS before result test',
            note: 'CLS result integration test',
            updatedById: null,
        }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(201);
    (0, vitest_1.expect)(body.success).toBe(true);
    (0, vitest_1.expect)(body.data.clsOrderId).toBeTruthy();
    return body.data.clsOrderId;
};
const createStartedClsOrder = async (baseUrl, suffix) => {
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    await startExam(baseUrl, visitId);
    const clsOrderId = await orderCls(baseUrl, visitId);
    const response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/start`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Lab starts CLS' }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
    return { payload, visitId, clsOrderId };
};
const completeClsOrder = async (baseUrl, clsOrderId) => {
    const response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/complete`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            resultText: 'CBC normal',
            resultFileUrl: null,
            isAbnormal: false,
            note: 'Lab completes CLS',
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
            clinical: true,
            clsOrders: {
                include: {
                    result: true,
                },
            },
            turns: {
                include: {
                    progress: true,
                },
            },
            queueItems: {
                include: {
                    status: true,
                },
            },
        },
    });
};
(0, vitest_1.describe)('Lab CLS result workflow', () => {
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
    (0, vitest_1.it)('C1 starts a pending CLS order and moves the visit into CLS', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await startExam(baseUrl, visitId);
        const clsOrderId = await orderCls(baseUrl, visitId);
        const response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/start`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ note: 'Lab starts CLS' }),
        });
        const body = await extractJson(response);
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(body.success).toBe(true);
        (0, vitest_1.expect)(body.data.status).toBe('IN_PROGRESS');
        const visit = await getVisitClsArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('IN_CLS');
        (0, vitest_1.expect)(visit?.clsOrders[0]?.status).toBe('IN_PROGRESS');
        (0, vitest_1.expect)(visit?.stateHistories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                fromState: 'WAITING_CLS',
                toState: 'IN_CLS',
                triggerEvent: 'CLS_START',
            }),
        ]));
        (0, vitest_1.expect)(visit?.clinical?.clsStartAt).not.toBeNull();
    }, 15000);
    (0, vitest_1.it)('C2 rejects duplicate CLS start without wrong history', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, clsOrderId } = await createStartedClsOrder(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const duplicateStart = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/start`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ note: 'Duplicate CLS start' }),
        });
        const duplicateBody = await extractJson(duplicateStart);
        (0, vitest_1.expect)(duplicateStart.status).toBe(409);
        (0, vitest_1.expect)(duplicateBody.success).toBe(false);
        (0, vitest_1.expect)(duplicateBody.message).toMatch(/cannot be started/i);
        const visit = await getVisitClsArtifacts(visitId);
        const startHistories = visit?.stateHistories.filter(history => history.fromState === 'WAITING_CLS' && history.toState === 'IN_CLS');
        (0, vitest_1.expect)(startHistories).toHaveLength(1);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('IN_CLS');
        (0, vitest_1.expect)(visit?.clsOrders[0]?.status).toBe('IN_PROGRESS');
    }, 15000);
    (0, vitest_1.it)('C3 completes CLS, creates a result, and exposes a conclusion turn to DoctorPage API', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, clsOrderId } = await createStartedClsOrder(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const complete = await completeClsOrder(baseUrl, clsOrderId);
        (0, vitest_1.expect)(complete.response.status).toBe(200);
        (0, vitest_1.expect)(complete.body.success).toBe(true);
        (0, vitest_1.expect)(complete.body.data.status).toBe('COMPLETED');
        (0, vitest_1.expect)(complete.body.data.result?.clsResultId).toBeTruthy();
        const clsResultId = complete.body.data.result.clsResultId;
        const result = await prisma_1.prisma.cLSResult.findUnique({
            where: { id: clsResultId },
            include: {
                clsOrder: true,
            },
        });
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result?.clsOrderId).toBe(clsOrderId);
        (0, vitest_1.expect)(result?.clsOrder.visitId).toBe(visitId);
        (0, vitest_1.expect)(result?.clsOrder.serviceId).toBe(TEST_CLS_SERVICE_ID);
        const visit = await getVisitClsArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_CONCLUSION');
        (0, vitest_1.expect)(visit?.clsOrders[0]?.status).toBe('COMPLETED');
        (0, vitest_1.expect)(visit?.clsOrders[0]?.completedAt).not.toBeNull();
        (0, vitest_1.expect)(visit?.clsOrders[0]?.result?.id).toBe(clsResultId);
        (0, vitest_1.expect)(visit?.stateHistories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                fromState: 'IN_CLS',
                toState: 'WAITING_CONCLUSION',
                triggerEvent: 'CLS_COMPLETE',
            }),
        ]));
        const doctorTurnsResponse = await fetch(`${baseUrl}/turns?search=${encodeURIComponent(payload.fullName)}`);
        const doctorTurnsBody = await extractJson(doctorTurnsResponse);
        (0, vitest_1.expect)(doctorTurnsResponse.status).toBe(200);
        (0, vitest_1.expect)(doctorTurnsBody.success).toBe(true);
        (0, vitest_1.expect)(doctorTurnsBody.data).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                visitId,
                turnType: 'CONCLUSION',
                doctorId: TEST_DOCTOR_ID,
                visit: vitest_1.expect.objectContaining({
                    currentState: 'WAITING_CONCLUSION',
                    patient: vitest_1.expect.objectContaining({
                        fullName: payload.fullName,
                    }),
                }),
                progress: vitest_1.expect.objectContaining({
                    status: 'PENDING',
                }),
            }),
        ]));
    }, 15000);
    (0, vitest_1.it)('C4 rejects CLS complete before start without creating result', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await startExam(baseUrl, visitId);
        const clsOrderId = await orderCls(baseUrl, visitId);
        const complete = await completeClsOrder(baseUrl, clsOrderId);
        (0, vitest_1.expect)(complete.response.status).toBe(409);
        (0, vitest_1.expect)(complete.body.success).toBe(false);
        (0, vitest_1.expect)(complete.body.message).toMatch(/in progress/i);
        const visit = await getVisitClsArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_CLS');
        (0, vitest_1.expect)(visit?.clsOrders[0]?.status).toBe('PENDING');
        (0, vitest_1.expect)(visit?.clsOrders[0]?.result).toBeNull();
        (0, vitest_1.expect)(visit?.stateHistories.some(history => history.fromState === 'IN_CLS' && history.toState === 'WAITING_CONCLUSION')).toBe(false);
    }, 15000);
    (0, vitest_1.it)('C5 rejects duplicate CLS completion without duplicate result', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, clsOrderId } = await createStartedClsOrder(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const firstComplete = await completeClsOrder(baseUrl, clsOrderId);
        (0, vitest_1.expect)(firstComplete.response.status).toBe(200);
        const clsResultId = firstComplete.body.data.result.clsResultId;
        const duplicateComplete = await completeClsOrder(baseUrl, clsOrderId);
        const duplicateBody = duplicateComplete.body;
        (0, vitest_1.expect)(duplicateComplete.response.status).toBe(409);
        (0, vitest_1.expect)(duplicateBody.success).toBe(false);
        (0, vitest_1.expect)(duplicateBody.message).toMatch(/in progress|already exists/i);
        const results = await prisma_1.prisma.cLSResult.findMany({
            where: { clsOrderId },
        });
        const visit = await getVisitClsArtifacts(visitId);
        const completeHistories = visit?.stateHistories.filter(history => history.fromState === 'IN_CLS' && history.toState === 'WAITING_CONCLUSION');
        (0, vitest_1.expect)(results).toHaveLength(1);
        (0, vitest_1.expect)(results[0]?.id).toBe(clsResultId);
        (0, vitest_1.expect)(completeHistories).toHaveLength(1);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_CONCLUSION');
        (0, vitest_1.expect)(visit?.clsOrders[0]?.status).toBe('COMPLETED');
    }, 15000);
});
