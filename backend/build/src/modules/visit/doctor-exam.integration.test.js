"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_events_1 = require("node:events");
const vitest_1 = require("vitest");
const app_1 = require("../../app");
const prisma_1 = require("../../lib/prisma");
const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_SERVICE_ID = 'svc_ntq';
const TEST_DOCTOR_ID = 'doctor_bsnam';
const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;
const buildPatientPayload = (suffix) => ({
    fullName: `Doctor Exam Test ${suffix}`,
    gender: 'MALE',
    dateOfBirth: '1990-01-15',
    phone: `09${suffix.slice(-8)}`,
    idNumber: `079${suffix.slice(-9)}`,
    address: 'Doctor exam integration test address',
    insuranceNumber: `BHYT-EXAM-${suffix}`,
    isDisabled: false,
    isDisabledHeavy: false,
    isRevolutionary: false,
});
const createWalkInPayload = (suffix) => ({
    ...buildPatientPayload(suffix),
    departmentId: TEST_DEPARTMENT_ID,
    serviceId: TEST_SERVICE_ID,
    doctorId: TEST_DOCTOR_ID,
    chiefComplaint: 'Dau dau',
    note: 'Doctor exam integration test',
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
const getVisitExamArtifacts = async (visitId) => {
    return prisma_1.prisma.visit.findUnique({
        where: { id: visitId },
        include: {
            progress: true,
            stateHistories: {
                orderBy: { transitionedAt: 'asc' },
            },
            clinical: true,
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
(0, vitest_1.describe)('Doctor exam workflow', () => {
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
    (0, vitest_1.it)('A1 starts a clinical exam from a walk-in visit', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const beforeStart = await getVisitExamArtifacts(visitId);
        (0, vitest_1.expect)(beforeStart?.progress?.currentState).toBe('WAITING_EXAM');
        const turnId = beforeStart?.turns[0]?.id;
        (0, vitest_1.expect)(turnId).toBeTruthy();
        const response = await fetch(`${baseUrl}/turns/${turnId}/start`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ note: 'Doctor starts exam' }),
        });
        const body = await extractJson(response);
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(body.success).toBe(true);
        const afterStart = await getVisitExamArtifacts(visitId);
        (0, vitest_1.expect)(afterStart?.progress?.currentState).toBe('IN_EXAM');
        (0, vitest_1.expect)(afterStart?.stateHistories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                fromState: 'WAITING_EXAM',
                toState: 'IN_EXAM',
                triggerEvent: 'TURN_START',
            }),
        ]));
        (0, vitest_1.expect)(afterStart?.turns[0]?.progress?.status).toBe('IN_PROGRESS');
        (0, vitest_1.expect)(afterStart?.turns[0]?.progress?.startedAt).not.toBeNull();
        (0, vitest_1.expect)(afterStart?.queueItems[0]?.status?.status).toBe('SERVING');
        (0, vitest_1.expect)(afterStart?.queueItems[0]?.status?.calledAt).not.toBeNull();
        (0, vitest_1.expect)(afterStart?.queueItems[0]?.status?.servedAt).not.toBeNull();
        (0, vitest_1.expect)(afterStart?.queueItems[0]?.histories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                eventType: 'TURN_START',
                fromStatus: 'WAITING',
                toStatus: 'SERVING',
            }),
        ]));
        (0, vitest_1.expect)(afterStart?.clinical?.examStartAt).not.toBeNull();
    });
    (0, vitest_1.it)('A2 rejects start exam when the visit is not WAITING_EXAM and does not write wrong history', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const visit = await getVisitExamArtifacts(visitId);
        const turnId = visit?.turns[0]?.id;
        (0, vitest_1.expect)(turnId).toBeTruthy();
        await prisma_1.prisma.visitProgress.update({
            where: { visitId },
            data: { currentState: 'WAITING_CLS' },
        });
        const response = await fetch(`${baseUrl}/turns/${turnId}/start`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ note: 'Invalid start' }),
        });
        const body = await extractJson(response);
        (0, vitest_1.expect)(response.status).toBe(409);
        (0, vitest_1.expect)(body.success).toBe(false);
        (0, vitest_1.expect)(body.message).toMatch(/Visit state does not allow/i);
        const afterStartAttempt = await getVisitExamArtifacts(visitId);
        (0, vitest_1.expect)(afterStartAttempt?.progress?.currentState).toBe('WAITING_CLS');
        (0, vitest_1.expect)(afterStartAttempt?.turns[0]?.progress?.status).toBe('PENDING');
        (0, vitest_1.expect)(afterStartAttempt?.queueItems[0]?.status?.status).toBe('WAITING');
        (0, vitest_1.expect)(afterStartAttempt?.stateHistories.some(history => history.fromState === 'WAITING_EXAM' && history.toState === 'IN_EXAM')).toBe(false);
    });
    (0, vitest_1.it)('A3 rejects duplicate start exam without duplicate history', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const visit = await getVisitExamArtifacts(visitId);
        const turnId = visit?.turns[0]?.id;
        (0, vitest_1.expect)(turnId).toBeTruthy();
        const firstResponse = await fetch(`${baseUrl}/turns/${turnId}/start`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ note: 'First start' }),
        });
        (0, vitest_1.expect)(firstResponse.status).toBe(200);
        const duplicateResponse = await fetch(`${baseUrl}/turns/${turnId}/start`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ note: 'Duplicate start' }),
        });
        const duplicateBody = await extractJson(duplicateResponse);
        (0, vitest_1.expect)(duplicateResponse.status).toBe(409);
        (0, vitest_1.expect)(duplicateBody.success).toBe(false);
        (0, vitest_1.expect)(duplicateBody.message).toMatch(/Turn cannot be started/i);
        const afterDuplicate = await getVisitExamArtifacts(visitId);
        const examStartHistories = afterDuplicate?.stateHistories.filter(history => history.fromState === 'WAITING_EXAM' && history.toState === 'IN_EXAM');
        const queueStartHistories = afterDuplicate?.queueItems[0]?.histories.filter(history => history.eventType === 'TURN_START' && history.toStatus === 'SERVING');
        (0, vitest_1.expect)(examStartHistories).toHaveLength(1);
        (0, vitest_1.expect)(queueStartHistories).toHaveLength(1);
        (0, vitest_1.expect)(afterDuplicate?.turns[0]?.progress?.status).toBe('IN_PROGRESS');
        (0, vitest_1.expect)(afterDuplicate?.queueItems[0]?.status?.status).toBe('SERVING');
    });
});
