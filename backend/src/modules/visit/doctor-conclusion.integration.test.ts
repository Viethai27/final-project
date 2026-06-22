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
const uniqueDigits = (suffix: string, length: number) => suffix.replace(/\D/g, '').slice(-length).padStart(length, '0');

const buildPatientPayload = (suffix: string) => ({
  fullName: `Doctor Conclusion Test ${suffix}`,
  gender: 'MALE',
  dateOfBirth: '1990-01-15',
  phone: `071${uniqueDigits(suffix, 7)}`,
  idNumber: `971${uniqueDigits(suffix, 9)}`,
  address: 'Doctor conclusion integration test address',
  insuranceNumber: `BHYT-CONCLUSION-${suffix}`,
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
  note: 'Doctor conclusion integration test',
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

  expect(response.status, body.message).toBe(201);
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
    body: JSON.stringify({ note: 'Start exam before conclusion test' }),
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
      clinicalNote: 'Doctor orders CLS before conclusion test',
      note: 'Doctor conclusion integration test',
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
    body: JSON.stringify({ note: 'Lab starts CLS before conclusion test' }),
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
      resultText: 'Result ready for doctor conclusion',
      isAbnormal: false,
      note: 'Lab completes CLS before conclusion test',
      updatedById: null,
    }),
  });
  const body = await extractJson(response);
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
};

const prepareWaitingConclusionVisit = async (baseUrl: string, suffix: string) => {
  const { payload, visitId } = await createWalkIn(baseUrl, suffix);
  await startExam(baseUrl, visitId);
  const clsOrderId = await orderCls(baseUrl, visitId);
  await startCls(baseUrl, clsOrderId);
  await completeCls(baseUrl, clsOrderId);
  const conclusionTurn = await prisma.turn.findFirstOrThrow({
    where: { visitId, turnType: 'CONCLUSION' },
    select: { id: true },
  });
  return { payload, visitId, conclusionTurnId: conclusionTurn.id };
};

const startConclusion = async (baseUrl: string, conclusionTurnId: string) => {
  const response = await fetch(`${baseUrl}/turns/${conclusionTurnId}/start`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'Doctor starts conclusion' }),
  });
  const body = await extractJson(response);
  return { response, body };
};

const completeConclusion = async (baseUrl: string, visitId: string) => {
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

const getVisitConclusionArtifacts = async (visitId: string) => {
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
      turns: {
        include: {
          progress: true,
        },
      },
    },
  });
};

describe('Doctor conclusion workflow', () => {
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

  it('D1 starts a conclusion turn from WAITING_CONCLUSION', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const start = await startConclusion(baseUrl, conclusionTurnId);
    expect(start.response.status).toBe(200);
    expect(start.body.success).toBe(true);
    expect(start.body.data.progress.status).toBe('IN_PROGRESS');

    const visit = await getVisitConclusionArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('IN_CONCLUSION');
    expect(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('IN_PROGRESS');
    expect(visit?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'WAITING_CONCLUSION',
          toState: 'IN_CONCLUSION',
          triggerEvent: 'TURN_START',
        }),
      ]),
    );
    expect(visit?.clinical?.conclusionStartAt).not.toBeNull();
  }, 15000);

  it('D2 rejects conclusion start when visit is not WAITING_CONCLUSION', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });
    await prisma.visitProgress.update({
      where: { visitId },
      data: { currentState: 'IN_EXAM' },
    });

    const start = await startConclusion(baseUrl, conclusionTurnId);
    expect(start.response.status).toBe(409);
    expect(start.body.success).toBe(false);
    expect(start.body.message).toMatch(/Visit state does not allow/i);

    const visit = await getVisitConclusionArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('IN_EXAM');
    expect(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('PENDING');
    expect(visit?.stateHistories.some(history => history.fromState === 'WAITING_CONCLUSION' && history.toState === 'IN_CONCLUSION')).toBe(false);
  }, 15000);

  it('D3 completes conclusion, creates invoice, and exposes the visit to Payment API', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });
    const start = await startConclusion(baseUrl, conclusionTurnId);
    expect(start.response.status).toBe(200);

    const complete = await completeConclusion(baseUrl, visitId);
    expect(complete.response.status).toBe(200);
    expect(complete.body.success).toBe(true);
    expect(complete.body.data.currentState).toBe('WAITING_PAYMENT');

    const visit = await getVisitConclusionArtifacts(visitId);
    expect(visit?.clinical?.id).toBeTruthy();
    expect(visit?.clinical?.finalDiagnosis).toBe('Viem hong cap');
    expect(visit?.clinical?.conclusion).toBe('Dieu tri ngoai tru');
    expect(visit?.clinical?.treatmentPlan).toBe('Uong thuoc 5 ngay');
    expect(visit?.progress?.currentState).toBe('WAITING_PAYMENT');
    expect(visit?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'IN_CONCLUSION',
          toState: 'WAITING_PAYMENT',
          triggerEvent: 'COMPLETE_CONCLUSION',
        }),
      ]),
    );
    expect(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('COMPLETED');
    expect(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.endedAt).not.toBeNull();
    expect(visit?.invoice?.id).toBeTruthy();
    expect(visit?.invoice?.status).toBe('UNPAID');

    const invoicesResponse = await fetch(`${baseUrl}/invoices?visitId=${encodeURIComponent(visitId)}`);
    const invoicesBody = await extractJson(invoicesResponse);
    expect(invoicesResponse.status).toBe(200);
    expect(invoicesBody.success).toBe(true);
    expect(invoicesBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
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
  }, 15000);

  it('D-noCLS-1 completes an IN_EXAM visit without creating CLS artifacts', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });
    await startExam(baseUrl, visitId);

    const complete = await completeConclusion(baseUrl, visitId);
    expect(complete.response.status).toBe(200);
    expect(complete.body.success).toBe(true);
    expect(complete.body.data.currentState).toBe('WAITING_PAYMENT');

    const visit = await getVisitConclusionArtifacts(visitId);
    const clinicalTurn = visit?.turns.find(turn => turn.turnType === 'CLINICAL_EXAM');
    const conclusionTurns = visit?.turns.filter(turn => turn.turnType === 'CONCLUSION') ?? [];
    const clsOrders = await prisma.cLSOrder.findMany({
      where: { visitId },
      include: { result: true },
    });

    expect(visit?.clinical?.id).toBeTruthy();
    expect(visit?.clinical?.finalDiagnosis).toBe('Viem hong cap');
    expect(visit?.clinical?.conclusion).toBe('Dieu tri ngoai tru');
    expect(visit?.clinical?.treatmentPlan).toBe('Uong thuoc 5 ngay');
    expect(visit?.progress?.currentState).toBe('WAITING_PAYMENT');
    expect(visit?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'IN_EXAM',
          toState: 'WAITING_PAYMENT',
          triggerEvent: 'COMPLETE_EXAM_WITHOUT_CLS',
        }),
      ]),
    );
    expect(clinicalTurn?.progress?.status).toBe('COMPLETED');
    expect(clinicalTurn?.progress?.endedAt).not.toBeNull();
    expect(conclusionTurns).toHaveLength(0);
    expect(clsOrders).toHaveLength(0);
    expect(visit?.invoice?.id).toBeTruthy();
    expect(visit?.invoice?.status).toBe('UNPAID');
  }, 15000);

  it('D4 rejects conclusion completion before IN_CONCLUSION', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const complete = await completeConclusion(baseUrl, visitId);
    expect(complete.response.status).toBe(409);
    expect(complete.body.success).toBe(false);
    expect(complete.body.message).toMatch(/IN_CONCLUSION/i);

    const visit = await getVisitConclusionArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('WAITING_CONCLUSION');
    expect(visit?.clinical?.finalDiagnosis).toBeNull();
    expect(visit?.invoice).toBeNull();
    expect(visit?.stateHistories.some(history => history.fromState === 'IN_CONCLUSION' && history.toState === 'WAITING_PAYMENT')).toBe(false);
  }, 15000);

  it('D5 rejects duplicate conclusion completion without duplicate history or invoice', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, conclusionTurnId } = await prepareWaitingConclusionVisit(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });
    const start = await startConclusion(baseUrl, conclusionTurnId);
    expect(start.response.status).toBe(200);

    const firstComplete = await completeConclusion(baseUrl, visitId);
    expect(firstComplete.response.status).toBe(200);
    const duplicateComplete = await completeConclusion(baseUrl, visitId);
    expect(duplicateComplete.response.status).toBe(409);
    expect(duplicateComplete.body.success).toBe(false);

    const visit = await getVisitConclusionArtifacts(visitId);
    const paymentHistories = visit?.stateHistories.filter(
      history => history.fromState === 'IN_CONCLUSION' && history.toState === 'WAITING_PAYMENT',
    );
    const invoices = await prisma.invoice.findMany({ where: { visitId } });

    expect(paymentHistories).toHaveLength(1);
    expect(invoices).toHaveLength(1);
    expect(visit?.progress?.currentState).toBe('WAITING_PAYMENT');
    expect(visit?.turns.find(turn => turn.id === conclusionTurnId)?.progress?.status).toBe('COMPLETED');
  }, 15000);
});
