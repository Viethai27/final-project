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

const createWalkInPayload = (suffix: string) => ({
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

const extractJson = async (response: Response) => {
  const data = await response.json();
  return data as { success: boolean; data?: any; message?: string };
};

const cleanupPatientArtifacts = async (identity: PatientIdentity) => {
  const filters: Prisma.PatientWhereInput[] = [];
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
    body: JSON.stringify({ note: 'Start exam before CLS result test' }),
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
      clinicalNote: 'Doctor orders CLS before result test',
      note: 'CLS result integration test',
      updatedById: null,
    }),
  });
  const body = await extractJson(response);

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);
  expect(body.data.clsOrderId).toBeTruthy();

  return body.data.clsOrderId as string;
};

const createStartedClsOrder = async (baseUrl: string, suffix: string) => {
  const { payload, visitId } = await createWalkIn(baseUrl, suffix);
  await startExam(baseUrl, visitId);
  const clsOrderId = await orderCls(baseUrl, visitId);

  const response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/start`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'Lab starts CLS' }),
  });
  const body = await extractJson(response);

  expect(response.status).toBe(200);
  expect(body.success).toBe(true);

  return { payload, visitId, clsOrderId };
};

const completeClsOrder = async (baseUrl: string, clsOrderId: string) => {
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

const getVisitClsArtifacts = async (visitId: string) => {
  return prisma.visit.findUnique({
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

describe('Lab CLS result workflow', () => {
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

  it('C1 starts a pending CLS order and moves the visit into CLS', async () => {
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

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('IN_PROGRESS');

    const visit = await getVisitClsArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('IN_CLS');
    expect(visit?.clsOrders[0]?.status).toBe('IN_PROGRESS');
    expect(visit?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'WAITING_CLS',
          toState: 'IN_CLS',
          triggerEvent: 'CLS_START',
        }),
      ]),
    );
    expect(visit?.clinical?.clsStartAt).not.toBeNull();
  }, 15000);

  it('C2 rejects duplicate CLS start without wrong history', async () => {
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

    expect(duplicateStart.status).toBe(409);
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.message).toMatch(/cannot be started/i);

    const visit = await getVisitClsArtifacts(visitId);
    const startHistories = visit?.stateHistories.filter(
      history => history.fromState === 'WAITING_CLS' && history.toState === 'IN_CLS',
    );
    expect(startHistories).toHaveLength(1);
    expect(visit?.progress?.currentState).toBe('IN_CLS');
    expect(visit?.clsOrders[0]?.status).toBe('IN_PROGRESS');
  }, 15000);

  it('C3 completes CLS, creates a result, and exposes a conclusion turn to DoctorPage API', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, clsOrderId } = await createStartedClsOrder(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const complete = await completeClsOrder(baseUrl, clsOrderId);

    expect(complete.response.status).toBe(200);
    expect(complete.body.success).toBe(true);
    expect(complete.body.data.status).toBe('COMPLETED');
    expect(complete.body.data.result?.clsResultId).toBeTruthy();
    const clsResultId = complete.body.data.result.clsResultId as string;

    const result = await prisma.cLSResult.findUnique({
      where: { id: clsResultId },
      include: {
        clsOrder: true,
      },
    });
    expect(result).not.toBeNull();
    expect(result?.clsOrderId).toBe(clsOrderId);
    expect(result?.clsOrder.visitId).toBe(visitId);
    expect(result?.clsOrder.serviceId).toBe(TEST_CLS_SERVICE_ID);

    const visit = await getVisitClsArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('WAITING_CONCLUSION');
    expect(visit?.clsOrders[0]?.status).toBe('COMPLETED');
    expect(visit?.clsOrders[0]?.completedAt).not.toBeNull();
    expect(visit?.clsOrders[0]?.result?.id).toBe(clsResultId);
    expect(visit?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'IN_CLS',
          toState: 'WAITING_CONCLUSION',
          triggerEvent: 'CLS_COMPLETE',
        }),
      ]),
    );

    const doctorTurnsResponse = await fetch(`${baseUrl}/turns?search=${encodeURIComponent(payload.fullName)}`);
    const doctorTurnsBody = await extractJson(doctorTurnsResponse);

    expect(doctorTurnsResponse.status).toBe(200);
    expect(doctorTurnsBody.success).toBe(true);
    expect(doctorTurnsBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          visitId,
          turnType: 'CONCLUSION',
          doctorId: TEST_DOCTOR_ID,
          visit: expect.objectContaining({
            currentState: 'WAITING_CONCLUSION',
            patient: expect.objectContaining({
              fullName: payload.fullName,
            }),
          }),
          progress: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      ]),
    );
  }, 15000);

  it('C4 rejects CLS complete before start without creating result', async () => {
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

    expect(complete.response.status).toBe(409);
    expect(complete.body.success).toBe(false);
    expect(complete.body.message).toMatch(/in progress/i);

    const visit = await getVisitClsArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('WAITING_CLS');
    expect(visit?.clsOrders[0]?.status).toBe('PENDING');
    expect(visit?.clsOrders[0]?.result).toBeNull();
    expect(visit?.stateHistories.some(history => history.fromState === 'IN_CLS' && history.toState === 'WAITING_CONCLUSION')).toBe(false);
  }, 15000);

  it('C5 rejects duplicate CLS completion without duplicate result', async () => {
    const suffix = randomSuffix();
    const { payload, visitId, clsOrderId } = await createStartedClsOrder(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const firstComplete = await completeClsOrder(baseUrl, clsOrderId);
    expect(firstComplete.response.status).toBe(200);
    const clsResultId = firstComplete.body.data.result.clsResultId as string;

    const duplicateComplete = await completeClsOrder(baseUrl, clsOrderId);
    const duplicateBody = duplicateComplete.body;

    expect(duplicateComplete.response.status).toBe(409);
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.message).toMatch(/in progress|already exists/i);

    const results = await prisma.cLSResult.findMany({
      where: { clsOrderId },
    });
    const visit = await getVisitClsArtifacts(visitId);
    const completeHistories = visit?.stateHistories.filter(
      history => history.fromState === 'IN_CLS' && history.toState === 'WAITING_CONCLUSION',
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(clsResultId);
    expect(completeHistories).toHaveLength(1);
    expect(visit?.progress?.currentState).toBe('WAITING_CONCLUSION');
    expect(visit?.clsOrders[0]?.status).toBe('COMPLETED');
  }, 15000);
});
