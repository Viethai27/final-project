import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { Prisma } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_SERVICE_ID = 'svc_ntq';
const TEST_DOCTOR_ID = 'doctor_bsnam';

type PatientIdentity = {
  phone?: string | null;
  idNumber?: string | null;
  insuranceNumber?: string | null;
};

const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

const buildPatientPayload = (suffix: string) => ({
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

const createWalkInPayload = (suffix: string) => ({
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

const getVisitExamArtifacts = async (visitId: string) => {
  return prisma.visit.findUnique({
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

describe('Doctor exam workflow', () => {
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

  it('A1 starts a clinical exam from a walk-in visit', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const beforeStart = await getVisitExamArtifacts(visitId);
    expect(beforeStart?.progress?.currentState).toBe('WAITING_EXAM');

    const turnId = beforeStart?.turns[0]?.id;
    expect(turnId).toBeTruthy();

    const response = await fetch(`${baseUrl}/turns/${turnId}/start`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'Doctor starts exam' }),
    });
    const body = await extractJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const afterStart = await getVisitExamArtifacts(visitId);
    expect(afterStart?.progress?.currentState).toBe('IN_EXAM');
    expect(afterStart?.stateHistories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromState: 'WAITING_EXAM',
          toState: 'IN_EXAM',
          triggerEvent: 'TURN_START',
        }),
      ]),
    );
    expect(afterStart?.turns[0]?.progress?.status).toBe('IN_PROGRESS');
    expect(afterStart?.turns[0]?.progress?.startedAt).not.toBeNull();
    expect(afterStart?.queueItems[0]?.status?.status).toBe('SERVING');
    expect(afterStart?.queueItems[0]?.status?.calledAt).not.toBeNull();
    expect(afterStart?.queueItems[0]?.status?.servedAt).not.toBeNull();
    expect(afterStart?.queueItems[0]?.histories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'TURN_START',
          fromStatus: 'WAITING',
          toStatus: 'SERVING',
        }),
      ]),
    );
    expect(afterStart?.clinical?.examStartAt).not.toBeNull();
  });

  it('A2 rejects start exam when the visit is not WAITING_EXAM and does not write wrong history', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const visit = await getVisitExamArtifacts(visitId);
    const turnId = visit?.turns[0]?.id;
    expect(turnId).toBeTruthy();

    await prisma.visitProgress.update({
      where: { visitId },
      data: { currentState: 'WAITING_CLS' },
    });

    const response = await fetch(`${baseUrl}/turns/${turnId}/start`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'Invalid start' }),
    });
    const body = await extractJson(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/Visit state does not allow/i);

    const afterStartAttempt = await getVisitExamArtifacts(visitId);
    expect(afterStartAttempt?.progress?.currentState).toBe('WAITING_CLS');
    expect(afterStartAttempt?.turns[0]?.progress?.status).toBe('PENDING');
    expect(afterStartAttempt?.queueItems[0]?.status?.status).toBe('WAITING');
    expect(
      afterStartAttempt?.stateHistories.some(
        history => history.fromState === 'WAITING_EXAM' && history.toState === 'IN_EXAM',
      ),
    ).toBe(false);
  });

  it('A3 rejects duplicate start exam without duplicate history', async () => {
    const suffix = randomSuffix();
    const { payload, visitId } = await createWalkIn(baseUrl, suffix);
    cleanupTargets.push({
      phone: payload.phone,
      idNumber: payload.idNumber,
      insuranceNumber: payload.insuranceNumber,
    });

    const visit = await getVisitExamArtifacts(visitId);
    const turnId = visit?.turns[0]?.id;
    expect(turnId).toBeTruthy();

    const firstResponse = await fetch(`${baseUrl}/turns/${turnId}/start`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'First start' }),
    });
    expect(firstResponse.status).toBe(200);

    const duplicateResponse = await fetch(`${baseUrl}/turns/${turnId}/start`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'Duplicate start' }),
    });
    const duplicateBody = await extractJson(duplicateResponse);

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.message).toMatch(/Turn cannot be started/i);

    const afterDuplicate = await getVisitExamArtifacts(visitId);
    const examStartHistories = afterDuplicate?.stateHistories.filter(
      history => history.fromState === 'WAITING_EXAM' && history.toState === 'IN_EXAM',
    );
    const queueStartHistories = afterDuplicate?.queueItems[0]?.histories.filter(
      history => history.eventType === 'TURN_START' && history.toStatus === 'SERVING',
    );

    expect(examStartHistories).toHaveLength(1);
    expect(queueStartHistories).toHaveLength(1);
    expect(afterDuplicate?.turns[0]?.progress?.status).toBe('IN_PROGRESS');
    expect(afterDuplicate?.queueItems[0]?.status?.status).toBe('SERVING');
  });
});
