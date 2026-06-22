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
const TEST_ROOM_ID = 'room_101';

type PatientIdentity = {
  phone?: string | null;
  idNumber?: string | null;
  insuranceNumber?: string | null;
};

type QueueLane = 'PRIORITY' | 'APPOINTMENT' | 'AFTER_CLS' | 'NORMAL';

const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

const buildPatientPayload = (suffix: string, fullName = `Queue Phase 3A ${suffix}`) => ({
  fullName,
  gender: 'MALE' as const,
  dateOfBirth: '1990-01-15',
  phone: `09${suffix.slice(-8)}`,
  idNumber: `079${suffix.slice(-9)}`,
  address: 'Queue Phase 3A integration test',
  insuranceNumber: `BHYT-Q3A-${suffix}`,
  isDisabled: false,
  isDisabledHeavy: false,
  isRevolutionary: false,
});

const extractJson = async (response: Response) => {
  const data = await response.json();
  return data as {
    success: boolean;
    data?: any;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    message?: string;
  };
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

      const decisions = await prisma.dispatchDecision.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const decisionIds = decisions.map(decision => decision.id);
      if (decisionIds.length > 0) {
        await prisma.dispatchRecommendation.deleteMany({ where: { decisionId: { in: decisionIds } } });
        await prisma.dispatchOutcome.deleteMany({ where: { decisionId: { in: decisionIds } } });
        await prisma.dispatchDecision.deleteMany({ where: { id: { in: decisionIds } } });
      }

      const clsOrders = await prisma.cLSOrder.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const clsOrderIds = clsOrders.map(order => order.id);
      if (clsOrderIds.length > 0) {
        await prisma.cLSResult.deleteMany({ where: { clsOrderId: { in: clsOrderIds } } });
        await prisma.cLSOrder.deleteMany({ where: { id: { in: clsOrderIds } } });
      }

      const turns = await prisma.turn.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const turnIds = turns.map(turn => turn.id);
      if (turnIds.length > 0) {
        await prisma.turnProgress.deleteMany({ where: { turnId: { in: turnIds } } });
        await prisma.turn.deleteMany({ where: { id: { in: turnIds } } });
      }

      const queueItems = await prisma.queueItem.findMany({
        where: { visitId: { in: visitIds } },
        select: { id: true },
      });
      const queueItemIds = queueItems.map(item => item.id);
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

const identityOf = (payload: ReturnType<typeof buildPatientPayload>): PatientIdentity => ({
  phone: payload.phone,
  idNumber: payload.idNumber,
  insuranceNumber: payload.insuranceNumber,
});

const createWalkIn = async (
  baseUrl: string,
  suffix: string,
  overrides: Partial<ReturnType<typeof buildPatientPayload> & { isUrgent: boolean; isPregnant: boolean }> = {},
) => {
  const payload = {
    ...buildPatientPayload(suffix),
    ...overrides,
    departmentId: TEST_DEPARTMENT_ID,
    serviceId: TEST_EXAM_SERVICE_ID,
    doctorId: TEST_DOCTOR_ID,
    chiefComplaint: 'Queue Phase 3A test',
    note: 'Queue Phase 3A integration test',
    isPregnant: overrides.isPregnant ?? false,
    isUrgent: overrides.isUrgent ?? false,
    updatedById: null,
  };

  const response = await fetch(`${baseUrl}/visits/walk-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await extractJson(response);
  expect(response.status).toBe(201);
  expect(body.success).toBe(true);

  const visitId = body.data.visitId as string;
  const queueItem = await prisma.queueItem.findFirstOrThrow({
    where: { visitId, queueType: 'EXAM' },
    select: { id: true },
  });

  return { payload, visitId, queueItemId: queueItem.id };
};

const getQueue = async (baseUrl: string, query: Record<string, string | number>) => {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => search.set(key, String(value)));
  const response = await fetch(`${baseUrl}/queue?${search.toString()}`);
  const body = await extractJson(response);
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
  return body;
};

const patchQueue = async (baseUrl: string, queueItemId: string, action: string) => {
  const response = await fetch(`${baseUrl}/queue/${queueItemId}/${action}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: `Queue ${action} integration test`, updatedById: null }),
  });
  const body = await extractJson(response);
  return { response, body };
};

const setQueueFixture = async (
  visitId: string,
  queueItemId: string,
  input: { lane: QueueLane; score: number; enqueuedAt: Date; queueNumber: string },
) => {
  await prisma.$transaction([
    prisma.visit.update({
      where: { id: visitId },
      data: { queueNumber: input.queueNumber },
    }),
    prisma.visitProgress.update({
      where: { visitId },
      data: { laneType: input.lane },
    }),
    prisma.queueItem.update({
      where: { id: queueItemId },
      data: {
        laneType: input.lane,
        initialPriorityScore: input.score,
        enqueuedAt: input.enqueuedAt,
        priorityReason:
          input.lane === 'PRIORITY'
            ? 'EMERGENCY'
            : input.lane === 'APPOINTMENT'
              ? 'APPOINTMENT'
              : input.lane === 'AFTER_CLS'
                ? 'AFTER_CLS'
                : null,
      },
    }),
    prisma.queueItemStatus.update({
      where: { queueItemId },
      data: { status: 'WAITING', priorityScore: input.score },
    }),
  ]);
};

describe('Phase 3A queue lanes and actions', () => {
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
      server.close(error => (error ? reject(error) : resolve()));
    });
    await prisma.$disconnect();
  });

  it('Q3A-1 creates a normal walk-in in the NORMAL lane', async () => {
    const suffix = randomSuffix();
    const created = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push(identityOf(created.payload));

    const queueItem = await prisma.queueItem.findUniqueOrThrow({
      where: { id: created.queueItemId },
      include: { status: true },
    });
    expect(queueItem.laneType).toBe('NORMAL');
    expect(queueItem.status?.status).toBe('WAITING');

    const listed = await getQueue(baseUrl, {
      lane: 'NORMAL',
      status: 'WAITING',
      search: created.payload.fullName,
      page: 1,
      limit: 10,
    });
    expect(listed.data.map((item: any) => item.queueItemId)).toContain(created.queueItemId);
  });

  it('Q3A-2 creates an urgent walk-in in PRIORITY ahead of NORMAL', async () => {
    const group = `Q3A priority ${randomSuffix()}`;
    const normal = await createWalkIn(baseUrl, randomSuffix(), { fullName: `${group} normal` });
    const priority = await createWalkIn(baseUrl, randomSuffix(), { fullName: `${group} priority`, isUrgent: true });
    cleanupTargets.push(identityOf(normal.payload), identityOf(priority.payload));

    const priorityItem = await prisma.queueItem.findUniqueOrThrow({
      where: { id: priority.queueItemId },
      include: { status: true },
    });
    expect(priorityItem.laneType).toBe('PRIORITY');
    expect(priorityItem.priorityReason).toBe('EMERGENCY');
    expect(priorityItem.status?.priorityScore).toBeGreaterThan(0);

    const listed = await getQueue(baseUrl, {
      status: 'WAITING',
      search: group,
      page: 1,
      limit: 10,
    });
    expect(listed.data.map((item: any) => item.queueItemId)).toEqual([
      priority.queueItemId,
      normal.queueItemId,
    ]);
    expect(listed.data[0].status.priorityScore).toBe(priorityItem.status?.priorityScore);
  });

  it('Q3A-3 checks an appointment into the APPOINTMENT lane', async () => {
    const suffix = randomSuffix();
    const patientPayload = buildPatientPayload(suffix, `Q3A appointment ${suffix}`);
    cleanupTargets.push(identityOf(patientPayload));

    const patient = await prisma.patient.create({
      data: {
        patientCode: `Q3A-APT-${suffix}`,
        fullName: patientPayload.fullName,
        gender: patientPayload.gender,
        dateOfBirth: new Date(`${patientPayload.dateOfBirth}T00:00:00.000Z`),
        age: 36,
        phone: patientPayload.phone,
        idNumber: patientPayload.idNumber,
        address: patientPayload.address,
        insuranceNumber: patientPayload.insuranceNumber,
      },
    });
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: TEST_DOCTOR_ID,
        roomId: TEST_ROOM_ID,
        serviceId: TEST_EXAM_SERVICE_ID,
        appointmentTime: new Date(Date.now() + 60 * 60 * 1000),
        status: 'CONFIRMED',
        note: 'Queue Phase 3A appointment',
      },
    });

    const response = await fetch(`${baseUrl}/appointments/${appointment.id}/check-in`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'Phase 3A appointment check-in' }),
    });
    const body = await extractJson(response);
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const queueItem = await prisma.queueItem.findUniqueOrThrow({
      where: { id: body.data.queueItem.queueItemId },
      include: { status: true },
    });
    expect(queueItem.laneType).toBe('APPOINTMENT');
    expect(queueItem.priorityReason).toBe('APPOINTMENT');
    expect(queueItem.status?.status).toBe('WAITING');
  });

  it('Q3A-4 creates a real AFTER_CLS conclusion queue after CLS completion', async () => {
    const suffix = randomSuffix();
    const created = await createWalkIn(baseUrl, suffix, { fullName: `Q3A after CLS ${suffix}` });
    cleanupTargets.push(identityOf(created.payload));

    const clinicalTurn = await prisma.turn.findFirstOrThrow({
      where: { visitId: created.visitId, turnType: 'CLINICAL_EXAM' },
      select: { id: true },
    });
    let response = await fetch(`${baseUrl}/turns/${clinicalTurn.id}/start`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'Start exam for AFTER_CLS test' }),
    });
    expect(response.status).toBe(200);

    response = await fetch(`${baseUrl}/cls/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        visitId: created.visitId,
        orderedById: TEST_DOCTOR_ID,
        serviceId: TEST_CLS_SERVICE_ID,
        priority: 'ROUTINE',
        clinicalNote: 'Phase 3A CLS order',
        note: 'Phase 3A AFTER_CLS test',
      }),
    });
    let body = await extractJson(response);
    expect(response.status).toBe(201);
    const clsOrderId = body.data.clsOrderId as string;

    response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/start`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'Start Phase 3A CLS' }),
    });
    expect(response.status).toBe(200);

    response = await fetch(`${baseUrl}/cls/orders/${clsOrderId}/complete`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resultText: 'Normal result', isAbnormal: false, note: 'Complete Phase 3A CLS' }),
    });
    body = await extractJson(response);
    expect(response.status).toBe(200);
    expect(body.data.status).toBe('COMPLETED');

    const visit = await prisma.visit.findUniqueOrThrow({
      where: { id: created.visitId },
      include: {
        progress: true,
        queueItems: { include: { status: true } },
        turns: { include: { progress: true } },
      },
    });
    const conclusionQueue = visit.queueItems.find(item => item.queueType === 'CONCLUSION');
    const conclusionTurn = visit.turns.find(turn => turn.turnType === 'CONCLUSION');
    expect(visit.progress?.currentState).toBe('WAITING_CONCLUSION');
    expect(conclusionQueue?.laneType).toBe('AFTER_CLS');
    expect(conclusionQueue?.status?.status).toBe('WAITING');
    expect(conclusionTurn?.progress?.status).toBe('PENDING');

    const listed = await getQueue(baseUrl, {
      lane: 'AFTER_CLS',
      status: 'WAITING',
      search: created.payload.fullName,
      page: 1,
      limit: 10,
    });
    expect(listed.data.map((item: any) => item.queueItemId)).toContain(conclusionQueue?.id);
  }, 20000);

  it('Q3A-5 sorts active queue items by PRIORITY, APPOINTMENT, AFTER_CLS, NORMAL', async () => {
    const group = `Q3A lane order ${randomSuffix()}`;
    const fixtures: Array<{ lane: QueueLane; created: Awaited<ReturnType<typeof createWalkIn>> }> = [];
    for (const lane of ['NORMAL', 'AFTER_CLS', 'APPOINTMENT', 'PRIORITY'] as QueueLane[]) {
      const created = await createWalkIn(baseUrl, randomSuffix(), { fullName: `${group} ${lane}` });
      cleanupTargets.push(identityOf(created.payload));
      await setQueueFixture(created.visitId, created.queueItemId, {
        lane,
        score: 70,
        enqueuedAt: new Date('2026-06-21T08:00:00.000Z'),
        queueNumber: `${lane.slice(0, 1)}700`,
      });
      fixtures.push({ lane, created });
    }

    const listed = await getQueue(baseUrl, { status: 'WAITING', search: group, page: 1, limit: 10 });
    expect(listed.data.map((item: any) => item.priority.laneType)).toEqual([
      'PRIORITY',
      'APPOINTMENT',
      'AFTER_CLS',
      'NORMAL',
    ]);
    expect(listed.data).toHaveLength(fixtures.length);
  });

  it('Q3A-6 sorts within a lane by score, enqueue time, then queue number', async () => {
    const group = `Q3A tie break ${randomSuffix()}`;
    const high = await createWalkIn(baseUrl, randomSuffix(), { fullName: `${group} high` });
    const laterNumber = await createWalkIn(baseUrl, randomSuffix(), { fullName: `${group} later number` });
    const lowerNumber = await createWalkIn(baseUrl, randomSuffix(), { fullName: `${group} lower number` });
    cleanupTargets.push(identityOf(high.payload), identityOf(laterNumber.payload), identityOf(lowerNumber.payload));

    await setQueueFixture(high.visitId, high.queueItemId, {
      lane: 'PRIORITY',
      score: 95,
      enqueuedAt: new Date('2026-06-21T09:00:00.000Z'),
      queueNumber: 'P003',
    });
    await setQueueFixture(laterNumber.visitId, laterNumber.queueItemId, {
      lane: 'PRIORITY',
      score: 80,
      enqueuedAt: new Date('2026-06-21T08:00:00.000Z'),
      queueNumber: 'P002',
    });
    await setQueueFixture(lowerNumber.visitId, lowerNumber.queueItemId, {
      lane: 'PRIORITY',
      score: 80,
      enqueuedAt: new Date('2026-06-21T08:00:00.000Z'),
      queueNumber: 'P001',
    });

    const listed = await getQueue(baseUrl, {
      lane: 'PRIORITY',
      status: 'WAITING',
      search: group,
      sort: 'desc',
      page: 1,
      limit: 10,
    });
    expect(listed.data.map((item: any) => item.queueItemId)).toEqual([
      high.queueItemId,
      lowerNumber.queueItemId,
      laterNumber.queueItemId,
    ]);
  });

  it('Q3A-7 filters lane on the backend before pagination', async () => {
    const group = `Q3A page lane ${randomSuffix()}`;
    for (let index = 0; index < 6; index += 1) {
      const created = await createWalkIn(baseUrl, randomSuffix(), { fullName: `${group} ${index}` });
      cleanupTargets.push(identityOf(created.payload));
      const lane: QueueLane = index < 3 ? 'PRIORITY' : 'NORMAL';
      await setQueueFixture(created.visitId, created.queueItemId, {
        lane,
        score: lane === 'PRIORITY' ? 90 : 50,
        enqueuedAt: new Date(`2026-06-21T08:0${index}:00.000Z`),
        queueNumber: `${lane === 'PRIORITY' ? 'P' : 'N'}${String(index).padStart(3, '0')}`,
      });
    }

    const listed = await getQueue(baseUrl, {
      lane: 'NORMAL',
      status: 'WAITING',
      search: group,
      page: 1,
      limit: 2,
    });
    expect(listed.data).toHaveLength(2);
    expect(listed.data.every((item: any) => item.priority.laneType === 'NORMAL')).toBe(true);
    expect(listed.pagination).toEqual(expect.objectContaining({ total: 3, totalPages: 2 }));
  });

  it('Q3A-8 applies call, start, timeout, and cancel with queue and turn history', async () => {
    const serving = await createWalkIn(baseUrl, randomSuffix(), { fullName: `Q3A serving ${randomSuffix()}` });
    const timedOut = await createWalkIn(baseUrl, randomSuffix(), { fullName: `Q3A timeout ${randomSuffix()}` });
    const cancelled = await createWalkIn(baseUrl, randomSuffix(), { fullName: `Q3A cancel ${randomSuffix()}` });
    cleanupTargets.push(identityOf(serving.payload), identityOf(timedOut.payload), identityOf(cancelled.payload));

    const call = await patchQueue(baseUrl, serving.queueItemId, 'call');
    expect(call.response.status).toBe(200);
    expect(call.body.data.currentStatus).toBe('CALLED');

    const start = await patchQueue(baseUrl, serving.queueItemId, 'start');
    expect(start.response.status).toBe(200);
    expect(start.body.data.currentStatus).toBe('SERVING');

    const servingArtifacts = await prisma.queueItem.findUniqueOrThrow({
      where: { id: serving.queueItemId },
      include: { status: true, histories: true, turns: { include: { progress: true } }, visit: { include: { progress: true } } },
    });
    expect(servingArtifacts.status?.status).toBe('SERVING');
    expect(servingArtifacts.turns[0]?.progress?.status).toBe('IN_PROGRESS');
    expect(servingArtifacts.visit.progress?.currentState).toBe('IN_EXAM');
    expect(servingArtifacts.histories.map(history => history.eventType)).toEqual(
      expect.arrayContaining(['QUEUE_CALL', 'TURN_START']),
    );

    const timeoutCall = await patchQueue(baseUrl, timedOut.queueItemId, 'call');
    expect(timeoutCall.response.status).toBe(200);
    const timeout = await patchQueue(baseUrl, timedOut.queueItemId, 'timeout');
    expect(timeout.response.status).toBe(200);
    expect(timeout.body.data.currentStatus).toBe('TIMEOUT');

    const timeoutArtifacts = await prisma.queueItem.findUniqueOrThrow({
      where: { id: timedOut.queueItemId },
      include: { status: true, histories: true, turns: { include: { progress: true } }, visit: { include: { progress: true } } },
    });
    expect(timeoutArtifacts.status).toEqual(expect.objectContaining({ status: 'TIMEOUT', isTimeout: true }));
    expect(timeoutArtifacts.turns[0]?.progress?.status).toBe('TIMEOUT');
    expect(timeoutArtifacts.visit.progress?.currentState).toBe('WAITING_EXAM');
    expect(timeoutArtifacts.histories.map(history => history.eventType)).toContain('QUEUE_TIMEOUT');

    const cancel = await patchQueue(baseUrl, cancelled.queueItemId, 'cancel');
    expect(cancel.response.status).toBe(200);
    expect(cancel.body.data.currentStatus).toBe('CANCELLED');

    const cancelArtifacts = await prisma.queueItem.findUniqueOrThrow({
      where: { id: cancelled.queueItemId },
      include: { status: true, histories: true, turns: { include: { progress: true } }, visit: { include: { progress: true } } },
    });
    expect(cancelArtifacts.status?.status).toBe('CANCELLED');
    expect(cancelArtifacts.turns[0]?.progress?.status).toBe('CANCELLED');
    expect(cancelArtifacts.visit.progress?.currentState).toBe('WAITING_EXAM');
    expect(cancelArtifacts.histories.map(history => history.eventType)).toContain('QUEUE_CANCEL');

    const invalidTimeout = await patchQueue(baseUrl, serving.queueItemId, 'timeout');
    expect(invalidTimeout.response.status).toBe(409);
    const invalidCancel = await patchQueue(baseUrl, serving.queueItemId, 'cancel');
    expect(invalidCancel.response.status).toBe(409);
  }, 20000);
});
