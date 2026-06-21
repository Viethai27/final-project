import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { Prisma } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_CLS_DEPARTMENT_ID = 'dept_cls';
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

const createWalkInPayload = (suffix: string) => ({
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
    body: JSON.stringify({ note: 'Start exam before CLS order' }),
  });
  const body = await extractJson(response);

  expect(response.status).toBe(200);
  expect(body.success).toBe(true);

  return turn.id;
};

const createClsOrder = async (
  baseUrl: string,
  input: { visitId: string; serviceId?: string; note?: string },
) => {
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

const getVisitClsArtifacts = async (visitId: string) => {
  return prisma.visit.findUnique({
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

describe('Doctor CLS order workflow', () => {
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

  it('B1 creates a CLS order from an IN_EXAM walk-in visit and exposes it to LabPage API', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });
    await startExam(baseUrl, visitId);

    const beforeOrder = await getVisitClsArtifacts(visitId);
    const clinicalTurnBefore = beforeOrder?.turns.find(turn => turn.turnType === 'CLINICAL_EXAM');
    const examQueueBefore = beforeOrder?.queueItems.find(item => item.queueType === 'EXAM');
    expect(beforeOrder?.progress?.currentState).toBe('IN_EXAM');
    expect(clinicalTurnBefore?.progress?.status).toBe('IN_PROGRESS');
    expect(examQueueBefore?.status?.status).toBe('SERVING');

    const order = await createClsOrder(baseUrl, { visitId });

    expect(order.response.status).toBe(201);
    expect(order.body.success).toBe(true);
    expect(order.body.data.clsOrderId).toBeTruthy();
    expect(order.body.data.visitId).toBe(visitId);
    expect(order.body.data.serviceId).toBe(TEST_CLS_SERVICE_ID);
    expect(order.body.data.orderedById).toBe(TEST_DOCTOR_ID);
    expect(order.body.data.status).toBe('PENDING');
    const clsOrderId = order.body.data.clsOrderId as string;

    const visit = await getVisitClsArtifacts(visitId);
    const clinicalTurn = visit?.turns.find(turn => turn.turnType === 'CLINICAL_EXAM');
    const examQueue = visit?.queueItems.find(item => item.queueType === 'EXAM');
    expect(visit?.progress?.currentState).toBe('WAITING_CLS');
    expect(visit?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'IN_EXAM',
          toState: 'WAITING_CLS',
          triggerEvent: 'ORDER_CLS',
        }),
      ]),
    );
    expect(visit?.clsOrders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: clsOrderId,
          visitId,
          serviceId: TEST_CLS_SERVICE_ID,
          orderedById: TEST_DOCTOR_ID,
          status: 'PENDING',
        }),
      ]),
    );
    expect(clinicalTurn?.progress?.status).toBe('COMPLETED');
    expect(clinicalTurn?.progress?.endedAt).not.toBeNull();
    expect(clinicalTurn?.progress?.durationMinutes).not.toBeNull();
    expect(examQueue?.status?.status).toBe('DONE');

    const clsQueue = visit?.queueItems.find(item => item.queueType === 'CLS');
    expect(clsQueue).toEqual(
      expect.objectContaining({
        visitId,
        queueType: 'CLS',
        targetDoctorId: null,
      }),
    );
    expect(clsQueue?.status?.status).toBe('WAITING');
    expect(clsQueue?.histories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'ORDER_CLS',
          fromStatus: null,
          toStatus: 'WAITING',
        }),
      ]),
    );

    const clsTurns = visit?.turns.filter(turn => ['CLS_LAB', 'CLS_IMAGING'].includes(turn.turnType));
    expect(clsTurns).toHaveLength(0);
    expect(visit?.turns.filter(turn => turn.turnType === 'CONCLUSION')).toHaveLength(0);
    expect(visit?.progress?.currentState).not.toBe('WAITING_CONCLUSION');

    const labListResponse = await fetch(`${baseUrl}/cls/orders?status=PENDING&search=${encodeURIComponent(payload.fullName)}`);
    const labListBody = await extractJson(labListResponse);

    expect(labListResponse.status).toBe(200);
    expect(labListBody.success).toBe(true);
    expect(labListBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clsOrderId,
          visitId,
          serviceId: TEST_CLS_SERVICE_ID,
          status: 'PENDING',
          visit: expect.objectContaining({
            visitId,
            currentState: 'WAITING_CLS',
            patient: expect.objectContaining({
              fullName: payload.fullName,
            }),
          }),
        }),
      ]),
    );
  });

  it('B2 rejects CLS order when visit has not started exam', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const order = await createClsOrder(baseUrl, { visitId });

    expect(order.response.status).toBe(409);
    expect(order.body.success).toBe(false);
    expect(order.body.message).toMatch(/IN_EXAM/i);

    const visit = await getVisitClsArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('WAITING_EXAM');
    expect(visit?.clsOrders).toHaveLength(0);
    expect(visit?.stateHistories.some(history => history.fromState === 'IN_EXAM' && history.toState === 'WAITING_CLS')).toBe(false);
  });

  it('B3 does not create a duplicate active CLS order when submitted twice', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });
    await startExam(baseUrl, visitId);

    const firstOrder = await createClsOrder(baseUrl, { visitId, note: 'First CLS order' });
    expect(firstOrder.response.status).toBe(201);

    const duplicateOrder = await createClsOrder(baseUrl, { visitId, note: 'Duplicate CLS order' });
    const statusAllowsIdempotency = duplicateOrder.response.status === 200 || duplicateOrder.response.status === 201;
    expect([200, 201, 400, 409]).toContain(duplicateOrder.response.status);
    if (statusAllowsIdempotency) {
      expect(duplicateOrder.body.data.clsOrderId).toBe(firstOrder.body.data.clsOrderId);
    } else {
      expect(duplicateOrder.body.success).toBe(false);
    }

    const orders = await prisma.cLSOrder.findMany({
      where: {
        visitId,
        serviceId: TEST_CLS_SERVICE_ID,
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
      },
    });
    const clsQueues = await prisma.queueItem.findMany({
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
    const clsTurns = await prisma.turn.findMany({
      where: {
        visitId,
        turnType: { in: ['CLS_LAB', 'CLS_IMAGING'] },
      },
    });

    expect(orders).toHaveLength(1);
    expect(clsQueues).toHaveLength(1);
    expect(clsTurns).toHaveLength(0);
  });

  it('B4 rejects non-CLS services for CLS ordering', async () => {
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

    expect(order.response.status).toBe(400);
    expect(order.body.success).toBe(false);
    expect(order.body.message).toMatch(/not a CLS service/i);

    const visit = await getVisitClsArtifacts(visitId);
    expect(visit?.progress?.currentState).toBe('IN_EXAM');
    expect(visit?.clsOrders).toHaveLength(0);
    expect(visit?.queueItems.filter(item => item.queueType === 'CLS')).toHaveLength(0);
  });

  it('B5 rejects CLS services in walk-in registration because only doctor workflow may order CLS', async () => {
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

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/khám|exam|cls/i);

    const patient = await prisma.patient.findFirst({
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
      ? await prisma.visit.count({
          where: { patientId: patient.id },
        })
      : 0;
    const clsOrderCount = patient
      ? await prisma.cLSOrder.count({
          where: {
            visit: { patientId: patient.id },
          },
        })
      : 0;

    expect(visitCount).toBe(0);
    expect(clsOrderCount).toBe(0);
  });
});
