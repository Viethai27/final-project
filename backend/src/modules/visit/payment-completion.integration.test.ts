import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { Prisma } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_EXAM_SERVICE_ID = 'svc_ntq';
const TEST_CLS_SERVICE_ID = 'svc_blood';
const TEST_DOCTOR_ID = 'doctor_bsnam';

type PatientIdentity = {
  phone?: string | null;
  idNumber?: string | null;
  insuranceNumber?: string | null;
};

const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

const buildPatientPayload = (suffix: string) => ({
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

const createWalkInPayload = (suffix: string) => ({
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

const extractJson = async (response: Response) => {
  const data = await response.json();
  return data as { success: boolean; data?: any; message?: string };
};

const cleanupPatientArtifacts = async (identity: PatientIdentity) => {
  const filters: Prisma.PatientWhereInput[] = [];
  if (identity.phone) filters.push({ phone: identity.phone });
  if (identity.idNumber) filters.push({ idNumber: identity.idNumber });
  if (identity.insuranceNumber) filters.push({ insuranceNumber: identity.insuranceNumber });
  if (filters.length === 0) return;

  const patients = await prisma.patient.findMany({
    where: { OR: filters },
    select: { id: true },
  });

  for (const patient of patients) {
    const visits = await prisma.visit.findMany({
      where: { patientId: patient.id },
      select: { id: true },
    });
    const visitIds = visits.map(visit => visit.id);

    if (visitIds.length > 0) {
      const invoices = await prisma.invoice.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const invoiceIds = invoices.map(invoice => invoice.id);

      if (invoiceIds.length > 0) {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
        await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      }

      const queueItems = await prisma.queueItem.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const queueItemIds = queueItems.map(item => item.id);

      const turns = await prisma.turn.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const turnIds = turns.map(turn => turn.id);

      const clsOrders = await prisma.cLSOrder.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const clsOrderIds = clsOrders.map(order => order.id);

      if (clsOrderIds.length > 0) {
        await prisma.cLSResult.deleteMany({ where: { clsOrderId: { in: clsOrderIds } } });
        await prisma.cLSOrder.deleteMany({ where: { id: { in: clsOrderIds } } });
      }

      if (turnIds.length > 0) {
        await prisma.turnProgress.deleteMany({ where: { turnId: { in: turnIds } } });
        await prisma.turn.deleteMany({ where: { id: { in: turnIds } } });
      }

      if (queueItemIds.length > 0) {
        await prisma.queueItemHistory.deleteMany({ where: { queueItemId: { in: queueItemIds } } });
        await prisma.queueItemStatus.deleteMany({ where: { queueItemId: { in: queueItemIds } } });
        await prisma.queueItem.deleteMany({ where: { id: { in: queueItemIds } } });
      }

      await prisma.visitAssignment.deleteMany({ where: { visitId: { in: visitIds } } });
      await prisma.visitStateHistory.deleteMany({ where: { visitId: { in: visitIds } } });
      await prisma.visitProgress.deleteMany({ where: { visitId: { in: visitIds } } });
      await prisma.visitClinical.deleteMany({ where: { visitId: { in: visitIds } } });
      await prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
    }

    await prisma.appointment.deleteMany({ where: { patientId: patient.id } });
    await prisma.patient.delete({ where: { id: patient.id } });
  }
};

const createWalkIn = async (baseUrl: string, suffix: string) => {
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

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);

  return { payload, visitId: body.data.visitId as string };
};

const startExam = async (baseUrl: string, visitId: string) => {
  const turn = await prisma.turn.findFirstOrThrow({
    where: { visitId, turnType: 'CLINICAL_EXAM' },
    select: { id: true },
  });
  const response = await fetch(`${baseUrl}/turns/${turn.id}/start`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'Start exam before payment test' }),
  });
  const body = await extractJson(response);
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
};

const orderCls = async (baseUrl: string, visitId: string) => {
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
  expect(response.status).toBe(201);
  expect(body.success).toBe(true);
  return body.data.clsOrderId as string;
};

const startCls = async (baseUrl: string, clsOrderId: string) => {
  const response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/start`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'Lab starts CLS before payment test' }),
  });
  const body = await extractJson(response);
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
};

const completeCls = async (baseUrl: string, clsOrderId: string) => {
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
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
};

const startConclusion = async (baseUrl: string, visitId: string) => {
  const conclusionTurn = await prisma.turn.findFirstOrThrow({
    where: { visitId, turnType: 'CONCLUSION' },
    select: { id: true },
  });
  const response = await fetch(`${baseUrl}/turns/${conclusionTurn.id}/start`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'Doctor starts conclusion before payment' }),
  });
  const body = await extractJson(response);
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
};

const completeConclusion = async (baseUrl: string, visitId: string) => {
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
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
};

const prepareWaitingPaymentVisit = async (baseUrl: string, suffix: string) => {
  const { payload, visitId } = await createWalkIn(baseUrl, suffix);
  await startExam(baseUrl, visitId);
  const clsOrderId = await orderCls(baseUrl, visitId);
  await startCls(baseUrl, clsOrderId);
  await completeCls(baseUrl, clsOrderId);
  await startConclusion(baseUrl, visitId);
  await completeConclusion(baseUrl, visitId);

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { visitId },
    select: { id: true, status: true },
  });
  expect(invoice.status).toBe('UNPAID');

  return { payload, visitId, invoiceId: invoice.id };
};

const payInvoice = async (baseUrl: string, invoiceId: string) => {
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

const getPaymentArtifacts = async (visitId: string) => {
  return prisma.visit.findUnique({
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

const createInvoiceBeforePaymentState = async (visitId: string) => {
  const service = await prisma.serviceCatalog.findUniqueOrThrow({
    where: { id: TEST_EXAM_SERVICE_ID },
    select: { id: true, name: true, price: true },
  });
  const unitPrice = service.price ?? new Prisma.Decimal(0);
  const invoice = await prisma.invoice.create({
    data: {
      visitId,
      totalAmount: unitPrice,
      paidAmount: new Prisma.Decimal(0),
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

describe('Payment completion workflow', () => {
  let server: Server;
  let baseUrl = '';
  let cleanupTargets: PatientIdentity[] = [];

  beforeAll(async () => {
    server = app.listen(0);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  beforeEach(() => {
    cleanupTargets = [];
  });

  afterEach(async () => {
    for (const target of cleanupTargets) {
      await cleanupPatientArtifacts(target);
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await prisma.$disconnect();
  });

  it('E1 exposes a WAITING_PAYMENT visit in the PaymentPage invoice list', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const response = await fetch(`${baseUrl}/invoices`);
    const body = await extractJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          invoiceId,
          visitId,
          status: 'UNPAID',
          visit: expect.objectContaining({
            currentState: 'WAITING_PAYMENT',
            patient: expect.objectContaining({
              fullName: payload.fullName,
            }),
          }),
        }),
      ]),
    );

    const listedInvoice = body.data.find((invoice: any) => invoice.invoiceId === invoiceId);
    expect(listedInvoice.items.length).toBeGreaterThan(0);
    expect(listedInvoice.totalAmount).toBeGreaterThan(0);
  }, 20000);

  it('E2 pays an invoice and completes the visit', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const payment = await payInvoice(baseUrl, invoiceId);

    expect(payment.response.status).toBe(200);
    expect(payment.body.success).toBe(true);
    expect(payment.body.data.status).toBe('PAID');
    expect(payment.body.data.paymentMethod).toBe('CASH');
    expect(payment.body.data.paidAt).toBeTruthy();
    expect(payment.body.data.paidAmount).toBe(payment.body.data.totalAmount);
    expect(payment.body.data.visit.currentState).toBe('COMPLETED');

    const visit = await getPaymentArtifacts(visitId);
    expect(visit?.invoice?.id).toBe(invoiceId);
    expect(visit?.invoice?.status).toBe('PAID');
    expect(visit?.invoice?.paidAt).not.toBeNull();
    expect(visit?.progress?.currentState).toBe('COMPLETED');
    expect(visit?.clinical?.completedAt).not.toBeNull();
    expect(visit?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'WAITING_PAYMENT',
          toState: 'COMPLETED',
          triggerEvent: 'PAYMENT_DONE',
        }),
      ]),
    );
  }, 20000);

  it('E3 rejects payment when the visit is not WAITING_PAYMENT', async () => {
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

    expect(payment.response.status).toBe(409);
    expect(payment.body.success).toBe(false);
    expect(payment.body.message).toMatch(/WAITING_PAYMENT/i);

    const visit = await getPaymentArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('IN_EXAM');
    expect(visit?.invoice?.status).toBe('UNPAID');
    expect(visit?.invoice?.paidAt).toBeNull();
    expect(visit?.stateHistories.some(history => history.fromState === 'WAITING_PAYMENT' && history.toState === 'COMPLETED')).toBe(false);
  }, 20000);

  it('E4 rejects duplicate payment without duplicate invoice or history', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const firstPayment = await payInvoice(baseUrl, invoiceId);
    expect(firstPayment.response.status).toBe(200);

    const duplicatePayment = await payInvoice(baseUrl, invoiceId);
    expect(duplicatePayment.response.status).toBe(409);
    expect(duplicatePayment.body.success).toBe(false);

    const visit = await getPaymentArtifacts(visitId);
    const invoices = await prisma.invoice.findMany({ where: { visitId } });
    const paymentHistories = visit?.stateHistories.filter(
      history => history.fromState === 'WAITING_PAYMENT' && history.toState === 'COMPLETED',
    );

    expect(invoices).toHaveLength(1);
    expect(paymentHistories).toHaveLength(1);
    expect(visit?.invoice?.id).toBe(invoiceId);
    expect(visit?.invoice?.status).toBe('PAID');
    expect(visit?.progress?.currentState).toBe('COMPLETED');
  }, 20000);

  it('E5 rejects payment for a missing invoice without changing the visit', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, invoiceId } = await prepareWaitingPaymentVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const payment = await payInvoice(baseUrl, `missing-${invoiceId}`);

    expect(payment.response.status).toBe(404);
    expect(payment.body.success).toBe(false);
    expect(payment.body.message).toMatch(/Invoice not found/i);

    const visit = await getPaymentArtifacts(visitId);
    expect(visit?.invoice?.id).toBe(invoiceId);
    expect(visit?.invoice?.status).toBe('UNPAID');
    expect(visit?.progress?.currentState).toBe('WAITING_PAYMENT');
    expect(visit?.stateHistories.some(history => history.fromState === 'WAITING_PAYMENT' && history.toState === 'COMPLETED')).toBe(false);
  }, 20000);
});
