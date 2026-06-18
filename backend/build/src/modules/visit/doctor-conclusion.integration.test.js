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
    fullName: `Doctor Conclusion Test ${suffix}`,
    gender: 'MALE',
    dateOfBirth: '1990-01-15',
    phone: `09${suffix.slice(-8)}`,
    idNumber: `079${suffix.slice(-9)}`,
    address: 'Doctor conclusion integration test address',
    insuranceNumber: `BHYT-CONCLUSION-${suffix}`,
    isDisabled: false,
    isDisabledHeavy: false,
    isRevolutionary: false,
});
const createWalkInPayload = (suffix) => ({
    ...buildPatientPayload(suffix),
    departmentId: TEST_DEPARTMENT_ID,
    serviceId: TEST_EXAM_SERVICE_ID,
    doctorId: TEST_DOCTOR_ID,
    chiefComplaint: 'Met moi',
    note: 'Doctor conclusion integration test',
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
    if (identity.phone)
        filters.push({ phone: identity.phone });
    if (identity.idNumber)
        filters.push({ idNumber: identity.idNumber });
    if (identity.insuranceNumber)
        filters.push({ insuranceNumber: identity.insuranceNumber });
    if (filters.length === 0)
        return;
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
            const invoices = await prisma_1.prisma.invoice.findMany({
                where: { visitId: { in: visitIds } },
                select: { id: true },
            });
            const invoiceIds = invoices.map(invoice => invoice.id);
            if (invoiceIds.length > 0) {
                await prisma_1.prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
                await prisma_1.prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
            }
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
        body: JSON.stringify({ note: 'Start exam before conclusion test' }),
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
            clinicalNote: 'Doctor orders CLS before conclusion test',
            note: 'Doctor conclusion integration test',
            updatedById: null,
        }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(201);
    (0, vitest_1.expect)(body.success).toBe(true);
    return body.data.clsOrderId;
};
const startCls = async (baseUrl, clsOrderId) => {
    const response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/start`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Lab starts CLS before conclusion test' }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
};
const completeCls = async (baseUrl, clsOrderId) => {
    const response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/complete`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            resultText: 'Result ready for doctor conclusion',
            isAbnormal: false,
            note: 'Lab completes CLS before conclusion test',
            updatedById: null,
        }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
};
const prepareWaitingConclusionVisit = async (baseUrl, suffix) => {
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    await startExam(baseUrl, visitId);
    const clsOrderId = await orderCls(baseUrl, visitId);
    await startCls(baseUrl, clsOrderId);
    await completeCls(baseUrl, clsOrderId);
    const conclusionTurn = await prisma_1.prisma.turn.findFirstOrThrow({
        where: { visitId, turnType: 'CONCLUSION' },
        select: { id: true },
    });
    return { payload, visitId, conclusionTurnId: conclusionTurn.id };
};
const startConclusion = async (baseUrl, conclusionTurnId) => {
    const response = await fetch(`${baseUrl}/turns/${conclusionTurnId}/start`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Doctor starts conclusion' }),
    });
    const body = await extractJson(response);
    return { response, body };
};
const completeConclusion = async (baseUrl, visitId) => {
    const response = await fetch(`${baseUrl}/visits/${visitId}/conclusion`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            finalDiagnosis: 'Viem hong cap',
            conclusion: 'Dieu tri ngoai tru',
            treatmentPlan: 'Uong thuoc 5 ngay',
            note: 'Doctor completes conclusion',
            updatedById: null,
        }),
    });
    const body = await extractJson(response);
    return { response, body };
};
const getVisitConclusionArtifacts = async (visitId) => {
    return prisma_1.prisma.visit.findUnique({
        where: { id: visitId },
        include: {
            progress: true,
            clinical: true,
            invoice: {
                include: {
                    items: true,
                },
            },
            stateHistories: {
                orderBy: { transitionedAt: 'asc' },
            },
            turns: {
                include: {
                    progress: true,
                },
            },
        },
    });
};
(0, vitest_1.describe)('Doctor conclusion workflow', () => {
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
    (0, vitest_1.it)('D1 starts a conclusion turn from WAITING_CONCLUSION', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const start = await startConclusion(baseUrl, conclusionTurnId);
        (0, vitest_1.expect)(start.response.status).toBe(200);
        (0, vitest_1.expect)(start.body.success).toBe(true);
        (0, vitest_1.expect)(start.body.data.progress.status).toBe('IN_PROGRESS');
        const visit = await getVisitConclusionArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('IN_CONCLUSION');
        (0, vitest_1.expect)(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('IN_PROGRESS');
        (0, vitest_1.expect)(visit?.stateHistories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                fromState: 'WAITING_CONCLUSION',
                toState: 'IN_CONCLUSION',
                triggerEvent: 'TURN_START',
            }),
        ]));
        (0, vitest_1.expect)(visit?.clinical?.conclusionStartAt).not.toBeNull();
    }, 15000);
    (0, vitest_1.it)('D2 rejects conclusion start when visit is not WAITING_CONCLUSION', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await prisma_1.prisma.visitProgress.update({
            where: { visitId },
            data: { currentState: 'IN_EXAM' },
        });
        const start = await startConclusion(baseUrl, conclusionTurnId);
        (0, vitest_1.expect)(start.response.status).toBe(409);
        (0, vitest_1.expect)(start.body.success).toBe(false);
        (0, vitest_1.expect)(start.body.message).toMatch(/Visit state does not allow/i);
        const visit = await getVisitConclusionArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('IN_EXAM');
        (0, vitest_1.expect)(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('PENDING');
        (0, vitest_1.expect)(visit?.stateHistories.some(history => history.fromState === 'WAITING_CONCLUSION' && history.toState === 'IN_CONCLUSION')).toBe(false);
    }, 15000);
    (0, vitest_1.it)('D3 completes conclusion, creates invoice, and exposes the visit to Payment API', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const start = await startConclusion(baseUrl, conclusionTurnId);
        (0, vitest_1.expect)(start.response.status).toBe(200);
        const complete = await completeConclusion(baseUrl, visitId);
        (0, vitest_1.expect)(complete.response.status).toBe(200);
        (0, vitest_1.expect)(complete.body.success).toBe(true);
        (0, vitest_1.expect)(complete.body.data.currentState).toBe('WAITING_PAYMENT');
        const visit = await getVisitConclusionArtifacts(visitId);
        (0, vitest_1.expect)(visit?.clinical?.id).toBeTruthy();
        (0, vitest_1.expect)(visit?.clinical?.finalDiagnosis).toBe('Viem hong cap');
        (0, vitest_1.expect)(visit?.clinical?.conclusion).toBe('Dieu tri ngoai tru');
        (0, vitest_1.expect)(visit?.clinical?.treatmentPlan).toBe('Uong thuoc 5 ngay');
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_PAYMENT');
        (0, vitest_1.expect)(visit?.stateHistories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                fromState: 'IN_CONCLUSION',
                toState: 'WAITING_PAYMENT',
                triggerEvent: 'COMPLETE_CONCLUSION',
            }),
        ]));
        (0, vitest_1.expect)(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('COMPLETED');
        (0, vitest_1.expect)(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.endedAt).not.toBeNull();
        (0, vitest_1.expect)(visit?.invoice?.id).toBeTruthy();
        (0, vitest_1.expect)(visit?.invoice?.status).toBe('UNPAID');
        const invoicesResponse = await fetch(`${baseUrl}/invoices?visitId=${encodeURIComponent(visitId)}`);
        const invoicesBody = await extractJson(invoicesResponse);
        (0, vitest_1.expect)(invoicesResponse.status).toBe(200);
        (0, vitest_1.expect)(invoicesBody.success).toBe(true);
        (0, vitest_1.expect)(invoicesBody.data).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                visitId,
                status: 'UNPAID',
                visit: vitest_1.expect.objectContaining({
                    currentState: 'WAITING_PAYMENT',
                    patient: vitest_1.expect.objectContaining({
                        fullName: payload.fullName,
                    }),
                }),
            }),
        ]));
    }, 15000);
    (0, vitest_1.it)('D4 rejects conclusion completion before IN_CONCLUSION', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const complete = await completeConclusion(baseUrl, visitId);
        (0, vitest_1.expect)(complete.response.status).toBe(409);
        (0, vitest_1.expect)(complete.body.success).toBe(false);
        (0, vitest_1.expect)(complete.body.message).toMatch(/IN_CONCLUSION/i);
        const visit = await getVisitConclusionArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_CONCLUSION');
        (0, vitest_1.expect)(visit?.clinical?.finalDiagnosis).toBeNull();
        (0, vitest_1.expect)(visit?.invoice).toBeNull();
        (0, vitest_1.expect)(visit?.stateHistories.some(history => history.fromState === 'IN_CONCLUSION' && history.toState === 'WAITING_PAYMENT')).toBe(false);
    }, 15000);
    (0, vitest_1.it)('D5 rejects duplicate conclusion completion without duplicate history or invoice', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const start = await startConclusion(baseUrl, conclusionTurnId);
        (0, vitest_1.expect)(start.response.status).toBe(200);
        const firstComplete = await completeConclusion(baseUrl, visitId);
        (0, vitest_1.expect)(firstComplete.response.status).toBe(200);
        const duplicateComplete = await completeConclusion(baseUrl, visitId);
        (0, vitest_1.expect)(duplicateComplete.response.status).toBe(409);
        (0, vitest_1.expect)(duplicateComplete.body.success).toBe(false);
        const visit = await getVisitConclusionArtifacts(visitId);
        const paymentHistories = visit?.stateHistories.filter(history => history.fromState === 'IN_CONCLUSION' && history.toState === 'WAITING_PAYMENT');
        const invoices = await prisma_1.prisma.invoice.findMany({ where: { visitId } });
        (0, vitest_1.expect)(paymentHistories).toHaveLength(1);
        (0, vitest_1.expect)(invoices).toHaveLength(1);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_PAYMENT');
        (0, vitest_1.expect)(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('COMPLETED');
    }, 15000);
});
