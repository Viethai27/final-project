"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_events_1 = require("node:events");
const client_1 = require("@prisma/client");
const vitest_1 = require("vitest");
const app_1 = require("../../app");
const prisma_1 = require("../../lib/prisma");
const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_EXAM_SERVICE_ID = 'svc_ntq';
const TEST_CLS_SERVICE_ID = 'svc_blood';
const TEST_DOCTOR_ID = 'doctor_bsnam';
const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;
const buildPatientPayload = (suffix) => ({
    fullName: `Payment Completion Test ${suffix}`,
    gender: 'MALE',
    dateOfBirth: '1990-01-15',
    phone: `08${suffix.slice(-8)}`,
    idNumber: `068${suffix.slice(-9)}`,
    address: 'Payment completion integration test address',
    insuranceNumber: `BHYT-PAYMENT-${suffix}`,
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
    note: 'Payment completion integration test',
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
        body: JSON.stringify({ note: 'Start exam before payment test' }),
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
            clinicalNote: 'Doctor orders CLS before payment test',
            note: 'Payment completion integration test',
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
        body: JSON.stringify({ note: 'Lab starts CLS before payment test' }),
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
            resultText: 'Result ready before payment',
            isAbnormal: false,
            note: 'Lab completes CLS before payment test',
            updatedById: null,
        }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
};
const startConclusion = async (baseUrl, visitId) => {
    const conclusionTurn = await prisma_1.prisma.turn.findFirstOrThrow({
        where: { visitId, turnType: 'CONCLUSION' },
        select: { id: true },
    });
    const response = await fetch(`${baseUrl}/turns/${conclusionTurn.id}/start`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Doctor starts conclusion before payment' }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
};
const completeConclusion = async (baseUrl, visitId) => {
    const response = await fetch(`${baseUrl}/visits/${visitId}/conclusion`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            finalDiagnosis: 'Viem hong cap',
            conclusion: 'Dieu tri ngoai tru',
            treatmentPlan: 'Uong thuoc 5 ngay',
            note: 'Doctor completes conclusion before payment',
            updatedById: null,
        }),
    });
    const body = await extractJson(response);
    (0, vitest_1.expect)(response.status).toBe(200);
    (0, vitest_1.expect)(body.success).toBe(true);
};
const prepareWaitingPaymentVisit = async (baseUrl, suffix) => {
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    await startExam(baseUrl, visitId);
    const clsOrderId = await orderCls(baseUrl, visitId);
    await startCls(baseUrl, clsOrderId);
    await completeCls(baseUrl, clsOrderId);
    await startConclusion(baseUrl, visitId);
    await completeConclusion(baseUrl, visitId);
    const invoice = await prisma_1.prisma.invoice.findUniqueOrThrow({
        where: { visitId },
        select: { id: true, status: true },
    });
    (0, vitest_1.expect)(invoice.status).toBe('UNPAID');
    return { payload, visitId, invoiceId: invoice.id };
};
const payInvoice = async (baseUrl, invoiceId) => {
    const response = await fetch(`${baseUrl}/invoices/${invoiceId}/pay`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            paymentMethod: 'CASH',
            paidById: null,
            note: 'Cashier confirms payment',
        }),
    });
    const body = await extractJson(response);
    return { response, body };
};
const getPaymentArtifacts = async (visitId) => {
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
        },
    });
};
const createInvoiceBeforePaymentState = async (visitId) => {
    const service = await prisma_1.prisma.serviceCatalog.findUniqueOrThrow({
        where: { id: TEST_EXAM_SERVICE_ID },
        select: { id: true, name: true, price: true },
    });
    const unitPrice = service.price ?? new client_1.Prisma.Decimal(0);
    const invoice = await prisma_1.prisma.invoice.create({
        data: {
            visitId,
            totalAmount: unitPrice,
            paidAmount: new client_1.Prisma.Decimal(0),
            status: 'UNPAID',
            items: {
                create: [
                    {
                        serviceId: service.id,
                        description: service.name,
                        quantity: 1,
                        unitPrice,
                        totalPrice: unitPrice,
                    },
                ],
            },
        },
        select: { id: true },
    });
    return invoice.id;
};
(0, vitest_1.describe)('Payment completion workflow', () => {
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
    (0, vitest_1.it)('E1 exposes a WAITING_PAYMENT visit in the PaymentPage invoice list', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const response = await fetch(`${baseUrl}/invoices`);
        const body = await extractJson(response);
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(body.success).toBe(true);
        (0, vitest_1.expect)(body.data).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                invoiceId,
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
        const listedInvoice = body.data.find((invoice) => invoice.invoiceId === invoiceId);
        (0, vitest_1.expect)(listedInvoice.items.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(listedInvoice.totalAmount).toBeGreaterThan(0);
    }, 20000);
    (0, vitest_1.it)('E2 pays an invoice and completes the visit', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const payment = await payInvoice(baseUrl, invoiceId);
        (0, vitest_1.expect)(payment.response.status).toBe(200);
        (0, vitest_1.expect)(payment.body.success).toBe(true);
        (0, vitest_1.expect)(payment.body.data.status).toBe('PAID');
        (0, vitest_1.expect)(payment.body.data.paymentMethod).toBe('CASH');
        (0, vitest_1.expect)(payment.body.data.paidAt).toBeTruthy();
        (0, vitest_1.expect)(payment.body.data.paidAmount).toBe(payment.body.data.totalAmount);
        (0, vitest_1.expect)(payment.body.data.visit.currentState).toBe('COMPLETED');
        const visit = await getPaymentArtifacts(visitId);
        (0, vitest_1.expect)(visit?.invoice?.id).toBe(invoiceId);
        (0, vitest_1.expect)(visit?.invoice?.status).toBe('PAID');
        (0, vitest_1.expect)(visit?.invoice?.paidAt).not.toBeNull();
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('COMPLETED');
        (0, vitest_1.expect)(visit?.clinical?.completedAt).not.toBeNull();
        (0, vitest_1.expect)(visit?.stateHistories).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                fromState: 'WAITING_PAYMENT',
                toState: 'COMPLETED',
                triggerEvent: 'PAYMENT_DONE',
            }),
        ]));
    }, 20000);
    (0, vitest_1.it)('E3 rejects payment when the visit is not WAITING_PAYMENT', async () => {
        const suffix = randomSuffix();
        const { payload, visitId } = await createWalkIn(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        await startExam(baseUrl, visitId);
        const invoiceId = await createInvoiceBeforePaymentState(visitId);
        const payment = await payInvoice(baseUrl, invoiceId);
        (0, vitest_1.expect)(payment.response.status).toBe(409);
        (0, vitest_1.expect)(payment.body.success).toBe(false);
        (0, vitest_1.expect)(payment.body.message).toMatch(/WAITING_PAYMENT/i);
        const visit = await getPaymentArtifacts(visitId);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('IN_EXAM');
        (0, vitest_1.expect)(visit?.invoice?.status).toBe('UNPAID');
        (0, vitest_1.expect)(visit?.invoice?.paidAt).toBeNull();
        (0, vitest_1.expect)(visit?.stateHistories.some(history => history.fromState === 'WAITING_PAYMENT' && history.toState === 'COMPLETED')).toBe(false);
    }, 20000);
    (0, vitest_1.it)('E4 rejects duplicate payment without duplicate invoice or history', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const firstPayment = await payInvoice(baseUrl, invoiceId);
        (0, vitest_1.expect)(firstPayment.response.status).toBe(200);
        const duplicatePayment = await payInvoice(baseUrl, invoiceId);
        (0, vitest_1.expect)(duplicatePayment.response.status).toBe(409);
        (0, vitest_1.expect)(duplicatePayment.body.success).toBe(false);
        const visit = await getPaymentArtifacts(visitId);
        const invoices = await prisma_1.prisma.invoice.findMany({ where: { visitId } });
        const paymentHistories = visit?.stateHistories.filter(history => history.fromState === 'WAITING_PAYMENT' && history.toState === 'COMPLETED');
        (0, vitest_1.expect)(invoices).toHaveLength(1);
        (0, vitest_1.expect)(paymentHistories).toHaveLength(1);
        (0, vitest_1.expect)(visit?.invoice?.id).toBe(invoiceId);
        (0, vitest_1.expect)(visit?.invoice?.status).toBe('PAID');
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('COMPLETED');
    }, 20000);
    (0, vitest_1.it)('E5 rejects payment for a missing invoice without changing the visit', async () => {
        const suffix = randomSuffix();
        const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
        cleanupTargets.push({
            phone: payload.phone,
            idNumber: payload.idNumber,
            insuranceNumber: payload.insuranceNumber,
        });
        const payment = await payInvoice(baseUrl, `missing-${invoiceId}`);
        (0, vitest_1.expect)(payment.response.status).toBe(404);
        (0, vitest_1.expect)(payment.body.success).toBe(false);
        (0, vitest_1.expect)(payment.body.message).toMatch(/Invoice not found/i);
        const visit = await getPaymentArtifacts(visitId);
        (0, vitest_1.expect)(visit?.invoice?.id).toBe(invoiceId);
        (0, vitest_1.expect)(visit?.invoice?.status).toBe('UNPAID');
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_PAYMENT');
        (0, vitest_1.expect)(visit?.stateHistories.some(history => history.fromState === 'WAITING_PAYMENT' && history.toState === 'COMPLETED')).toBe(false);
    }, 20000);
});
