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

type PatientSeedInput = {
  fullName: string;
  gender?: string;
  dateOfBirth?: Date | null;
  age?: number | null;
  phone?: string | null;
  idNumber?: string | null;
  address?: string | null;
  insuranceNumber?: string | null;
  isDisabled?: boolean;
  isDisabledHeavy?: boolean;
  isRevolutionary?: boolean;
};

const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

const buildPatientPayload = (suffix: string) => ({
  fullName: `Walkin Test ${suffix}`,
  gender: 'MALE',
  dateOfBirth: '1990-01-15',
  phone: `09${suffix.slice(-8)}`,
  idNumber: `079${suffix.slice(-9)}`,
  address: 'Test Address',
  insuranceNumber: `BHYT-${suffix}`,
  isDisabled: false,
  isDisabledHeavy: false,
  isRevolutionary: false,
});

type WalkInPatientOverrides = Partial<{
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string | null;
  phone: string | null;
  idNumber: string | null;
  address: string | null;
  insuranceNumber: string | null;
  isDisabled: boolean;
  isDisabledHeavy: boolean;
  isRevolutionary: boolean;
}>;

const extractJson = async (response: Response) => {
  const data = await response.json();
  return data as { success: boolean; data?: any; message?: string; code?: string; details?: any };
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
    where: {
      OR: filters,
    },
    select: {
      id: true,
    },
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
        await prisma.turnProgress.deleteMany({
          where: { turnId: { in: turnIds } },
        });
        await prisma.turn.deleteMany({
          where: { id: { in: turnIds } },
        });
      }

      if (queueItemIds.length > 0) {
        await prisma.queueItemHistory.deleteMany({
          where: { queueItemId: { in: queueItemIds } },
        });
        await prisma.queueItemStatus.deleteMany({
          where: { queueItemId: { in: queueItemIds } },
        });
        await prisma.queueItem.deleteMany({
          where: { id: { in: queueItemIds } },
        });
      }

      await prisma.visitAssignment.deleteMany({
        where: { visitId: { in: visitIds } },
      });
      await prisma.visitStateHistory.deleteMany({
        where: { visitId: { in: visitIds } },
      });
      await prisma.visitProgress.deleteMany({
        where: { visitId: { in: visitIds } },
      });
      await prisma.visitClinical.deleteMany({
        where: { visitId: { in: visitIds } },
      });
      await prisma.visit.deleteMany({
        where: { id: { in: visitIds } },
      });
    }

    await prisma.appointment.deleteMany({
      where: { patientId: patient.id },
    });

    await prisma.patient.delete({
      where: { id: patient.id },
    });
  }
};

const createSeedPatient = async (input: PatientSeedInput) => {
  const patientCode = `TEST-${randomSuffix()}`;

  return prisma.patient.create({
    data: {
      patientCode,
      fullName: input.fullName,
      gender: input.gender ?? 'MALE',
      dateOfBirth: input.dateOfBirth ?? new Date('1990-01-15T00:00:00.000Z'),
      age: input.age ?? 35,
      phone: input.phone ?? null,
      idNumber: input.idNumber ?? null,
      address: input.address ?? null,
      insuranceNumber: input.insuranceNumber ?? null,
      isDisabled: input.isDisabled ?? false,
      isDisabledHeavy: input.isDisabledHeavy ?? false,
      isRevolutionary: input.isRevolutionary ?? false,
    },
  });
};

const createWalkInPayload = (
  suffix: string,
  overrides: WalkInPatientOverrides = {},
) => ({
  ...buildPatientPayload(suffix),
  ...overrides,
  departmentId: TEST_DEPARTMENT_ID,
  serviceId: TEST_SERVICE_ID,
  doctorId: TEST_DOCTOR_ID,
  chiefComplaint: 'Sot, ho',
  note: 'Integration walk-in test',
  isPregnant: false,
  isUrgent: false,
  updatedById: null,
});

const createWalkIn = async (payload: ReturnType<typeof createWalkInPayload>, baseUrl: string) => {
  const response = await fetch(`${baseUrl}/visits/walk-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await extractJson(response);
  return { response, body };
};

const createPatient = async (payload: Record<string, unknown>, baseUrl: string) => {
  const response = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await extractJson(response);
  return { response, body };
};

const getPatientArtifacts = async (patientId: string) => {
  const [visitCount, queueItemCount, turnCount] = await Promise.all([
    prisma.visit.count({
      where: { patientId },
    }),
    prisma.queueItem.count({
      where: {
        visit: { patientId },
      },
    }),
    prisma.turn.count({
      where: {
        visit: { patientId },
      },
    }),
  ]);

  return { visitCount, queueItemCount, turnCount };
};

describe('Reception walk-in workflow', () => {
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

  it('POST /patients creates a real patient record in DB', async () => {
    const suffix = randomSuffix();
    const patientPayload = buildPatientPayload(suffix);
    cleanupTargets.push({
      phone: patientPayload.phone,
      idNumber: patientPayload.idNumber,
      insuranceNumber: patientPayload.insuranceNumber,
    });

    await cleanupPatientArtifacts({
      phone: patientPayload.phone,
      idNumber: patientPayload.idNumber,
      insuranceNumber: patientPayload.insuranceNumber,
    });

    const beforeCount = await prisma.patient.count({
      where: { idNumber: patientPayload.idNumber },
    });

    const response = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patientPayload),
    });

    const body = await extractJson(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data?.fullName).toBe(patientPayload.fullName);

    const afterCount = await prisma.patient.count({
      where: { idNumber: patientPayload.idNumber },
    });
    const patient = await prisma.patient.findUnique({
      where: { idNumber: patientPayload.idNumber },
    });

    expect(afterCount).toBe(beforeCount + 1);
    expect(patient).not.toBeNull();
    expect(patient?.phone).toBe(patientPayload.phone);

    const artifacts = await getPatientArtifacts(patient!.id);
    expect(artifacts.visitCount).toBe(0);
    expect(artifacts.queueItemCount).toBe(0);
    expect(artifacts.turnCount).toBe(0);
  });

  it('POST /patients returns phone matches instead of creating when phone already exists', async () => {
    const suffix = randomSuffix();
    const sharedPhone = `09${suffix.slice(-8)}`;
    const existing = await createSeedPatient({
      fullName: 'Patient Create Phone Existing',
      phone: sharedPhone,
      idNumber: `PC-ID-EX-${suffix}`,
      insuranceNumber: `PC-BHYT-EX-${suffix}`,
      address: 'Existing Patient Address',
    });
    const incomingPayload = {
      ...buildPatientPayload(`${suffix}phone`),
      fullName: 'Patient Create Phone Incoming',
      phone: sharedPhone,
      idNumber: `PC-ID-IN-${suffix}`,
      insuranceNumber: `PC-BHYT-IN-${suffix}`,
    };
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: existing.idNumber,
      insuranceNumber: existing.insuranceNumber,
    });
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: incomingPayload.idNumber,
      insuranceNumber: incomingPayload.insuranceNumber,
    });

    const result = await createPatient(incomingPayload, baseUrl);
    const createdIncoming = await prisma.patient.findFirst({
      where: { idNumber: incomingPayload.idNumber },
    });

    expect(result.response.status).toBe(409);
    expect(result.body.success).toBe(false);
    expect(result.body.code).toBe('PHONE_MATCHES_FOUND');
    expect(result.body.details?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: existing.id,
          fullName: existing.fullName,
          phone: sharedPhone,
        }),
      ]),
    );
    expect(createdIncoming).toBeNull();
  });

  it('POST /patients creates a new patient with the same phone after confirmation flag', async () => {
    const suffix = randomSuffix();
    const sharedPhone = `09${suffix.slice(-8)}`;
    const existing = await createSeedPatient({
      fullName: 'Patient Create Confirm Existing',
      phone: sharedPhone,
      idNumber: `PCF-ID-EX-${suffix}`,
      insuranceNumber: `PCF-BHYT-EX-${suffix}`,
    });
    const incomingPayload = {
      ...buildPatientPayload(`${suffix}confirm`),
      fullName: 'Patient Create Confirm New',
      phone: sharedPhone,
      idNumber: `PCF-ID-IN-${suffix}`,
      insuranceNumber: `PCF-BHYT-IN-${suffix}`,
      createNewPatientOnPhoneMatch: true,
    };
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: existing.idNumber,
      insuranceNumber: existing.insuranceNumber,
    });
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: incomingPayload.idNumber,
      insuranceNumber: incomingPayload.insuranceNumber,
    });

    const result = await createPatient(incomingPayload, baseUrl);
    const patientsWithPhone = await prisma.patient.findMany({
      where: { phone: sharedPhone },
      orderBy: { fullName: 'asc' },
    });
    const artifacts = await getPatientArtifacts(result.body.data?.id);

    expect(result.response.status).toBe(201);
    expect(result.body.success).toBe(true);
    expect(result.body.data?.id).not.toBe(existing.id);
    expect(result.body.data?.phone).toBe(sharedPhone);
    expect(patientsWithPhone).toHaveLength(2);
    expect(artifacts.visitCount).toBe(0);
    expect(artifacts.queueItemCount).toBe(0);
    expect(artifacts.turnCount).toBe(0);
  });

  it('POST /patients still rejects strong CCCD or BHYT duplicates even with phone confirmation flag', async () => {
    const suffix = randomSuffix();
    const existing = await createSeedPatient({
      fullName: 'Patient Create Strong Existing',
      phone: `09${suffix.slice(-8)}`,
      idNumber: `PCS-ID-${suffix}`,
      insuranceNumber: `PCS-BHYT-${suffix}`,
    });
    const incomingPayload = {
      ...buildPatientPayload(`${suffix}strong`),
      phone: `08${suffix.slice(-8)}`,
      idNumber: existing.idNumber,
      insuranceNumber: `PCS-BHYT-IN-${suffix}`,
      createNewPatientOnPhoneMatch: true,
    };
    const bhytPayload = {
      ...buildPatientPayload(`${suffix}bhyt`),
      phone: `07${suffix.slice(-8)}`,
      idNumber: `PCS-ID-IN-${suffix}`,
      insuranceNumber: existing.insuranceNumber,
      createNewPatientOnPhoneMatch: true,
    };
    cleanupTargets.push({
      phone: existing.phone,
      idNumber: existing.idNumber,
      insuranceNumber: existing.insuranceNumber,
    });
    cleanupTargets.push({
      phone: incomingPayload.phone,
      idNumber: incomingPayload.idNumber,
      insuranceNumber: incomingPayload.insuranceNumber,
    });
    cleanupTargets.push({
      phone: bhytPayload.phone,
      idNumber: bhytPayload.idNumber,
      insuranceNumber: bhytPayload.insuranceNumber,
    });

    const result = await createPatient(incomingPayload, baseUrl);
    const bhytResult = await createPatient(bhytPayload, baseUrl);
    const patientsWithId = await prisma.patient.findMany({
      where: { idNumber: existing.idNumber },
    });
    const patientsWithBhyt = await prisma.patient.findMany({
      where: { insuranceNumber: existing.insuranceNumber },
    });

    expect(result.response.status).toBe(409);
    expect(result.body.success).toBe(false);
    expect(bhytResult.response.status).toBe(409);
    expect(bhytResult.body.success).toBe(false);
    expect(patientsWithId).toHaveLength(1);
    expect(patientsWithId[0].id).toBe(existing.id);
    expect(patientsWithBhyt).toHaveLength(1);
    expect(patientsWithBhyt[0].id).toBe(existing.id);
  });

  it('POST /visits/walk-in accepts patientId alias and creates a visit for the selected existing patient', async () => {
    const suffix = randomSuffix();
    const patientPayload = buildPatientPayload(suffix);
    const incomingIdentity = {
      phone: `08${suffix.slice(-8)}`,
      idNumber: `INCOMING-${suffix}`,
      insuranceNumber: `BHYT-INCOMING-${suffix}`,
    };
    cleanupTargets.push({
      phone: patientPayload.phone,
      idNumber: patientPayload.idNumber,
      insuranceNumber: patientPayload.insuranceNumber,
    });
    cleanupTargets.push(incomingIdentity);

    await cleanupPatientArtifacts({
      phone: patientPayload.phone,
      idNumber: patientPayload.idNumber,
      insuranceNumber: patientPayload.insuranceNumber,
    });
    await cleanupPatientArtifacts(incomingIdentity);

    const patientResponse = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patientPayload),
    });
    const patientBody = await extractJson(patientResponse);
    expect(patientResponse.status).toBe(201);
    const selectedPatientId = patientBody.data.id;

    const walkIn = await createWalkIn(
      {
        ...createWalkInPayload(`${suffix}selected`, {
          fullName: 'Incoming Should Not Create Patient',
          phone: incomingIdentity.phone,
          idNumber: incomingIdentity.idNumber,
          insuranceNumber: incomingIdentity.insuranceNumber,
          address: 'Incoming Address Should Not Overwrite',
        }),
        patientId: selectedPatientId,
      } as any,
      baseUrl,
    );

    const refreshedPatient = await prisma.patient.findUnique({
      where: { id: selectedPatientId },
    });
    const incomingPatient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: incomingIdentity.phone },
          { idNumber: incomingIdentity.idNumber },
          { insuranceNumber: incomingIdentity.insuranceNumber },
        ],
      },
    });
    const visit = await prisma.visit.findUnique({
      where: { id: walkIn.body.data?.visitId },
      include: {
        progress: true,
        stateHistories: true,
        queueItems: { include: { status: true } },
        turns: { include: { progress: true } },
      },
    });

    expect(walkIn.response.status).toBe(201);
    expect(walkIn.body.success).toBe(true);
    expect(walkIn.body.data.patient.id).toBe(selectedPatientId);
    expect(walkIn.body.data.queueNumber).toMatch(/^N\d{3}$|^P\d{3}$/);
    expect(incomingPatient).toBeNull();
    expect(refreshedPatient?.fullName).toBe(patientPayload.fullName);
    expect(refreshedPatient?.address).toBe(patientPayload.address);
    expect(visit?.patientId).toBe(selectedPatientId);
    expect(visit?.progress?.currentState).toBe('WAITING_EXAM');
    expect(visit?.stateHistories.some(history => history.fromState === null && history.toState === 'WAITING_EXAM')).toBe(true);
    expect(visit?.queueItems).toHaveLength(1);
    expect(visit?.queueItems[0]?.status?.status).toBe('WAITING');
    expect(visit?.turns).toHaveLength(1);
    expect(visit?.turns[0]?.progress?.status).toBe('PENDING');
  });

  it('rejects selectedPatientId when the selected patient already has an active walk-in', async () => {
    const suffix = randomSuffix();
    const patientPayload = buildPatientPayload(suffix);
    cleanupTargets.push({
      phone: patientPayload.phone,
      idNumber: patientPayload.idNumber,
      insuranceNumber: patientPayload.insuranceNumber,
    });

    const patientResponse = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patientPayload),
    });
    const patientBody = await extractJson(patientResponse);
    expect(patientResponse.status).toBe(201);
    const selectedPatientId = patientBody.data.id;

    const first = await createWalkIn(
      {
        ...createWalkInPayload(`${suffix}first`),
        selectedPatientId,
      } as any,
      baseUrl,
    );
    const second = await createWalkIn(
      {
        ...createWalkInPayload(`${suffix}second`),
        selectedPatientId,
      } as any,
      baseUrl,
    );
    const artifacts = await getPatientArtifacts(selectedPatientId);

    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(409);
    expect(second.body.success).toBe(false);
    expect(second.body.message?.toLowerCase()).toMatch(/hàng đợi|hoạt động|active/);
    expect(artifacts.visitCount).toBe(1);
    expect(artifacts.queueItemCount).toBe(1);
    expect(artifacts.turnCount).toBe(1);
  });

  it('rejects walk-in with a missing selectedPatientId without creating patient, visit, queue or turn', async () => {
    const suffix = randomSuffix();
    const incomingIdentity = {
      phone: `08${suffix.slice(-8)}`,
      idNumber: `MISSING-${suffix}`,
      insuranceNumber: `BHYT-MISSING-${suffix}`,
    };
    cleanupTargets.push(incomingIdentity);

    await cleanupPatientArtifacts(incomingIdentity);

    const missing = await createWalkIn(
      {
        ...createWalkInPayload(`${suffix}missing`, {
          fullName: 'Missing Selected Patient',
          phone: incomingIdentity.phone,
          idNumber: incomingIdentity.idNumber,
          insuranceNumber: incomingIdentity.insuranceNumber,
        }),
        selectedPatientId: `missing-${suffix}`,
      } as any,
      baseUrl,
    );
    const createdPatient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: incomingIdentity.phone },
          { idNumber: incomingIdentity.idNumber },
          { insuranceNumber: incomingIdentity.insuranceNumber },
        ],
      },
      select: { id: true },
    });

    expect(missing.response.status).toBe(404);
    expect(missing.body.success).toBe(false);
    expect(createdPatient).toBeNull();
  });

  it('POST /visits/walk-in creates patient, visit, queue, turn and exposes the patient in queue/turn lists', async () => {
    const suffix = randomSuffix();
    const patientPayload = buildPatientPayload(suffix);
    cleanupTargets.push({
      phone: patientPayload.phone,
      idNumber: patientPayload.idNumber,
      insuranceNumber: patientPayload.insuranceNumber,
    });

    await cleanupPatientArtifacts({
      phone: patientPayload.phone,
      idNumber: patientPayload.idNumber,
      insuranceNumber: patientPayload.insuranceNumber,
    });

    const walkInPayload = createWalkInPayload(suffix);

    const first = await createWalkIn(walkInPayload, baseUrl);

    expect(first.response.status).toBe(201);
    expect(first.body.success).toBe(true);
    expect(first.body.data.patient.fullName).toBe(patientPayload.fullName);
    expect(first.body.data.queueNumber).toMatch(/^N\d{3}$|^P\d{3}$/);

    const patient = await prisma.patient.findUnique({
      where: { idNumber: patientPayload.idNumber },
    });
    expect(patient).not.toBeNull();

    const visit = await prisma.visit.findUnique({
      where: { id: first.body.data.visitId },
      include: {
        progress: true,
        stateHistories: true,
        assignments: true,
        queueItems: {
          include: {
            status: true,
          },
        },
        turns: {
          include: {
            progress: true,
          },
        },
      },
    });

    expect(visit).not.toBeNull();
    expect(visit?.patientId).toBe(patient?.id);
    expect(visit?.queueNumber).toBe(first.body.data.queueNumber);
    expect(visit?.progress?.currentState).toBe('WAITING_EXAM');
    expect(visit?.stateHistories.some(history => history.fromState === null && history.toState === 'WAITING_EXAM')).toBe(true);
    expect(visit?.assignments.some(assignment => assignment.isCurrent && assignment.doctorId === TEST_DOCTOR_ID)).toBe(true);
    expect(visit?.queueItems).toHaveLength(1);
    expect(visit?.queueItems[0]?.status?.status).toBe('WAITING');
    expect(visit?.turns).toHaveLength(1);
    expect(visit?.turns[0]?.doctorId).toBe(TEST_DOCTOR_ID);
    expect(visit?.turns[0]?.progress?.status).toBe('PENDING');

    const queueResponse = await fetch(`${baseUrl}/queue?search=${encodeURIComponent(patientPayload.fullName)}`);
    const queueBody = await extractJson(queueResponse);

    expect(queueResponse.status).toBe(200);
    expect(queueBody.success).toBe(true);
    expect(queueBody.data.some((item: any) => item.visit.visitId === first.body.data.visitId)).toBe(true);

    const turnsResponse = await fetch(`${baseUrl}/turns?search=${encodeURIComponent(patientPayload.fullName)}`);
    const turnsBody = await extractJson(turnsResponse);

    expect(turnsResponse.status).toBe(200);
    expect(turnsBody.success).toBe(true);
    expect(turnsBody.data.some((item: any) => item.visit.visitId === first.body.data.visitId && item.doctorId === TEST_DOCTOR_ID)).toBe(true);

    const artifacts = await getPatientArtifacts(patient!.id);
    expect(artifacts.visitCount).toBe(1);
    expect(artifacts.queueItemCount).toBe(1);
    expect(artifacts.turnCount).toBe(1);
  });

  it('rejects duplicate CCCD for a patient already active without overwriting the patient profile', async () => {
    const suffix = randomSuffix();
    const basePayload = buildPatientPayload(suffix);
    cleanupTargets.push({
      phone: basePayload.phone,
      idNumber: basePayload.idNumber,
      insuranceNumber: basePayload.insuranceNumber,
    });

    const patient = await createSeedPatient({
      fullName: 'Patient A Original',
      phone: basePayload.phone,
      idNumber: basePayload.idNumber,
      insuranceNumber: basePayload.insuranceNumber,
      address: 'Old Address',
    });

    const first = await createWalkIn(
      createWalkInPayload(suffix, {
        fullName: patient.fullName,
        phone: patient.phone ?? basePayload.phone,
        idNumber: patient.idNumber,
        insuranceNumber: patient.insuranceNumber,
        address: patient.address,
      }),
      baseUrl,
    );
    expect(first.response.status).toBe(201);

    const duplicate = await createWalkIn(
      createWalkInPayload(`${suffix}1`, {
        fullName: 'Patient A Changed',
        phone: `08${suffix.slice(-8)}`,
        idNumber: patient.idNumber,
        insuranceNumber: `BHYT-NEW-${suffix}`,
        address: 'New Address',
      }),
      baseUrl,
    );

    const refreshedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    });
    const artifacts = await getPatientArtifacts(patient.id);

    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body.success).toBe(false);
    expect(duplicate.body.message?.toLowerCase()).toMatch(/hàng đợi|hoạt động|active/);
    expect(artifacts.visitCount).toBe(1);
    expect(artifacts.queueItemCount).toBe(1);
    expect(refreshedPatient?.fullName).toBe('Patient A Original');
    expect(refreshedPatient?.address).toBe('Old Address');
    expect(refreshedPatient?.phone).toBe(basePayload.phone);
  });

  it('returns phone matches instead of auto-selecting when only phone matches an active patient', async () => {
    const suffix = randomSuffix();
    const basePayload = buildPatientPayload(suffix);
    cleanupTargets.push({
      phone: basePayload.phone,
      idNumber: basePayload.idNumber,
      insuranceNumber: basePayload.insuranceNumber,
    });

    const patient = await createSeedPatient({
      fullName: 'Patient Phone Original',
      phone: basePayload.phone,
      idNumber: null,
      insuranceNumber: basePayload.insuranceNumber,
      address: 'Phone Old Address',
    });

    const first = await createWalkIn(
      createWalkInPayload(suffix, {
        fullName: patient.fullName,
        phone: patient.phone ?? basePayload.phone,
        idNumber: null,
        insuranceNumber: patient.insuranceNumber,
        address: patient.address,
      }),
      baseUrl,
    );
    expect(first.response.status).toBe(201);

    const duplicate = await createWalkIn(
      createWalkInPayload(`${suffix}2`, {
        fullName: 'Patient Phone Changed',
        phone: patient.phone ?? basePayload.phone,
        idNumber: `NEW-ID-${suffix}`,
        insuranceNumber: `NEW-BHYT-${suffix}`,
        address: 'Phone New Address',
      }),
      baseUrl,
    );

    const refreshedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    });
    const artifacts = await getPatientArtifacts(patient.id);

    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body.success).toBe(false);
    expect(duplicate.body.code).toBe('PHONE_MATCHES_FOUND');
    expect(duplicate.body.details?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: patient.id,
          fullName: 'Patient Phone Original',
          phone: basePayload.phone,
          hasActiveVisitOrQueue: true,
        }),
      ]),
    );
    expect(duplicate.body.message?.toLowerCase()).toMatch(/phone|active|số điện thoại/);
    const createdIncoming = await prisma.patient.findFirst({
      where: { idNumber: `NEW-ID-${suffix}` },
    });
    expect(artifacts.visitCount).toBe(1);
    expect(artifacts.queueItemCount).toBe(1);
    expect(refreshedPatient?.fullName).toBe('Patient Phone Original');
    expect(refreshedPatient?.address).toBe('Phone Old Address');
    expect(createdIncoming).toBeNull();
  });

  it('allows creating a new patient with the same phone after receptionist confirmation', async () => {
    const suffix = randomSuffix();
    const sharedPhone = `09${suffix.slice(-8)}`;
    const existing = await createSeedPatient({
      fullName: 'Shared Phone Existing',
      phone: sharedPhone,
      idNumber: `EXIST-PHONE-${suffix}`,
      insuranceNumber: `BHYT-EXIST-PHONE-${suffix}`,
      address: 'Shared Phone Old Address',
    });
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: existing.idNumber,
      insuranceNumber: existing.insuranceNumber,
    });
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: `NEW-PHONE-${suffix}`,
      insuranceNumber: `BHYT-NEW-PHONE-${suffix}`,
    });

    const walkIn = await createWalkIn(
      {
        ...createWalkInPayload(`${suffix}phone-new`, {
          fullName: 'Shared Phone New Patient',
          phone: sharedPhone,
          idNumber: `NEW-PHONE-${suffix}`,
          insuranceNumber: `BHYT-NEW-PHONE-${suffix}`,
          address: 'Shared Phone New Address',
        }),
        createNewPatientOnPhoneMatch: true,
      } as any,
      baseUrl,
    );

    const patients = await prisma.patient.findMany({
      where: { phone: sharedPhone },
      orderBy: [{ createdAt: 'asc' }],
    });
    const existingArtifacts = await getPatientArtifacts(existing.id);
    const createdPatient = patients.find(patient => patient.idNumber === `NEW-PHONE-${suffix}`);

    expect(walkIn.response.status).toBe(201);
    expect(walkIn.body.success).toBe(true);
    expect(patients).toHaveLength(2);
    expect(createdPatient).not.toBeNull();
    expect(walkIn.body.data.patient.id).toBe(createdPatient?.id);
    expect(existingArtifacts.visitCount).toBe(0);
  });

  it('uses an existing phone-matched patient only when receptionist selects that profile', async () => {
    const suffix = randomSuffix();
    const sharedPhone = `09${suffix.slice(-8)}`;
    const existing = await createSeedPatient({
      fullName: 'Selected Phone Existing',
      phone: sharedPhone,
      idNumber: null,
      insuranceNumber: null,
      address: 'Selected Phone Old Address',
    });
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: existing.idNumber,
      insuranceNumber: existing.insuranceNumber,
    });

    const walkIn = await createWalkIn(
      {
        ...createWalkInPayload(`${suffix}phone-selected`, {
          fullName: 'Selected Phone Incoming Changed',
          phone: sharedPhone,
          idNumber: null,
          insuranceNumber: null,
          address: 'Selected Phone New Address',
        }),
        selectedPatientId: existing.id,
      } as any,
      baseUrl,
    );

    const refreshedPatient = await prisma.patient.findUnique({ where: { id: existing.id } });
    const artifacts = await getPatientArtifacts(existing.id);
    const patients = await prisma.patient.findMany({ where: { phone: sharedPhone } });

    expect(walkIn.response.status).toBe(201);
    expect(walkIn.body.success).toBe(true);
    expect(walkIn.body.data.patient.id).toBe(existing.id);
    expect(artifacts.visitCount).toBe(1);
    expect(refreshedPatient?.fullName).toBe('Selected Phone Existing');
    expect(refreshedPatient?.address).toBe('Selected Phone Old Address');
    expect(patients).toHaveLength(1);
  });

  it('returns all patients sharing a phone number and does not pick one automatically', async () => {
    const suffix = randomSuffix();
    const sharedPhone = `09${suffix.slice(-8)}`;
    const patientA = await createSeedPatient({
      fullName: 'Shared Phone A',
      phone: sharedPhone,
      idNumber: `SHARED-A-${suffix}`,
      insuranceNumber: `BHYT-SHARED-A-${suffix}`,
    });
    const patientB = await createSeedPatient({
      fullName: 'Shared Phone B',
      phone: sharedPhone,
      idNumber: `SHARED-B-${suffix}`,
      insuranceNumber: `BHYT-SHARED-B-${suffix}`,
    });
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: patientA.idNumber,
      insuranceNumber: patientA.insuranceNumber,
    });
    cleanupTargets.push({
      phone: sharedPhone,
      idNumber: patientB.idNumber,
      insuranceNumber: patientB.insuranceNumber,
    });

    const match = await createWalkIn(
      createWalkInPayload(`${suffix}phone-many`, {
        fullName: 'Shared Phone Incoming',
        phone: sharedPhone,
        idNumber: null,
        insuranceNumber: null,
      }),
      baseUrl,
    );

    const totalVisits = await prisma.visit.count({
      where: { patientId: { in: [patientA.id, patientB.id] } },
    });

    expect(match.response.status).toBe(409);
    expect(match.body.success).toBe(false);
    expect(match.body.code).toBe('PHONE_MATCHES_FOUND');
    expect(match.body.details?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: patientA.id, fullName: 'Shared Phone A' }),
        expect.objectContaining({ id: patientB.id, fullName: 'Shared Phone B' }),
      ]),
    );
    expect(match.body.details?.matches).toHaveLength(2);
    expect(totalVisits).toBe(0);
  });

  it('rejects duplicate insuranceNumber for a patient already active without overwriting the patient profile', async () => {
    const suffix = randomSuffix();
    const basePayload = buildPatientPayload(suffix);
    cleanupTargets.push({
      phone: basePayload.phone,
      idNumber: basePayload.idNumber,
      insuranceNumber: basePayload.insuranceNumber,
    });
    cleanupTargets.push({
      phone: `08${suffix.slice(-8)}`,
      idNumber: `OTHER-${suffix}`,
      insuranceNumber: basePayload.insuranceNumber,
    });

    const patient = await createSeedPatient({
      fullName: 'Patient Insurance Original',
      phone: basePayload.phone,
      idNumber: basePayload.idNumber,
      insuranceNumber: basePayload.insuranceNumber,
      address: 'Insurance Old Address',
    });

    const first = await createWalkIn(
      createWalkInPayload(suffix, {
        fullName: patient.fullName,
        phone: patient.phone ?? basePayload.phone,
        idNumber: patient.idNumber,
        insuranceNumber: patient.insuranceNumber,
        address: patient.address,
      }),
      baseUrl,
    );
    expect(first.response.status).toBe(201);

    const duplicate = await createWalkIn(
      createWalkInPayload(`${suffix}3`, {
        fullName: 'Patient Insurance Changed',
        phone: `08${suffix.slice(-8)}`,
        idNumber: `OTHER-${suffix}`,
        insuranceNumber: patient.insuranceNumber,
        address: 'Insurance New Address',
      }),
      baseUrl,
    );

    const allPatients = await prisma.patient.findMany({
      where: {
        insuranceNumber: patient.insuranceNumber,
      },
    });
    const refreshedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    });
    const artifacts = await getPatientArtifacts(patient.id);

    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body.success).toBe(false);
    expect(duplicate.body.message?.toLowerCase()).toMatch(/hàng đợi|hoạt động|active/);
    expect(allPatients).toHaveLength(1);
    expect(artifacts.visitCount).toBe(1);
    expect(refreshedPatient?.fullName).toBe('Patient Insurance Original');
    expect(refreshedPatient?.address).toBe('Insurance Old Address');
  });

  it('reuses existing patient for duplicate CCCD without active visit and does not overwrite demographic data', async () => {
    const suffix = randomSuffix();
    const basePayload = buildPatientPayload(suffix);
    cleanupTargets.push({
      phone: basePayload.phone,
      idNumber: basePayload.idNumber,
      insuranceNumber: basePayload.insuranceNumber,
    });
    cleanupTargets.push({
      phone: `08${suffix.slice(-8)}`,
      idNumber: basePayload.idNumber,
      insuranceNumber: `NEW-BHYT-${suffix}`,
    });

    const patient = await createSeedPatient({
      fullName: 'Patient Reuse Original',
      phone: basePayload.phone,
      idNumber: basePayload.idNumber,
      insuranceNumber: basePayload.insuranceNumber,
      address: 'Reuse Old Address',
    });

    const walkIn = await createWalkIn(
      createWalkInPayload(`${suffix}4`, {
        fullName: 'Patient Reuse Changed',
        phone: `08${suffix.slice(-8)}`,
        idNumber: patient.idNumber,
        insuranceNumber: `NEW-BHYT-${suffix}`,
        address: 'Reuse New Address',
      }),
      baseUrl,
    );

    const refreshedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    });
    const allPatients = await prisma.patient.findMany({
      where: {
        OR: [{ idNumber: patient.idNumber }, { phone: `08${suffix.slice(-8)}` }],
      },
    });
    const artifacts = await getPatientArtifacts(patient.id);

    expect(walkIn.response.status).toBe(201);
    expect(walkIn.body.success).toBe(true);
    expect(walkIn.body.data.visitId).toBeTruthy();
    expect(walkIn.body.data.queueNumber).toMatch(/^N\d{3}$|^P\d{3}$/);
    expect(artifacts.visitCount).toBe(1);
    expect(artifacts.queueItemCount).toBe(1);
    expect(allPatients).toHaveLength(1);
    expect(refreshedPatient?.fullName).toBe('Patient Reuse Original');
    expect(refreshedPatient?.address).toBe('Reuse Old Address');
    expect(refreshedPatient?.phone).toBe(basePayload.phone);
  });

  it('rejects identity conflict when unique identifiers point to different patients', async () => {
    const suffix = randomSuffix();
    const patientA = await createSeedPatient({
      fullName: 'Identity Conflict A',
      phone: `09${suffix.slice(-8)}`,
      idNumber: `ID-A-${suffix}`,
      insuranceNumber: `BHYT-A-${suffix}`,
      address: 'Conflict Address A',
    });
    const patientB = await createSeedPatient({
      fullName: 'Identity Conflict B',
      phone: `08${suffix.slice(-8)}`,
      idNumber: `ID-B-${suffix}`,
      insuranceNumber: `BHYT-B-${suffix}`,
      address: 'Conflict Address B',
    });
    cleanupTargets.push({
      phone: patientA.phone,
      idNumber: patientA.idNumber,
      insuranceNumber: patientA.insuranceNumber,
    });
    cleanupTargets.push({
      phone: patientB.phone,
      idNumber: patientB.idNumber,
      insuranceNumber: patientB.insuranceNumber,
    });

    const conflict = await createWalkIn(
      createWalkInPayload(`${suffix}5`, {
        fullName: 'Identity Conflict Incoming',
        phone: `07${suffix.slice(-8)}`,
        idNumber: patientA.idNumber,
        insuranceNumber: patientB.insuranceNumber,
        address: 'Conflict Address Incoming',
      }),
      baseUrl,
    );

    const refreshedA = await prisma.patient.findUnique({ where: { id: patientA.id } });
    const refreshedB = await prisma.patient.findUnique({ where: { id: patientB.id } });
    const totalVisits = await prisma.visit.count({
      where: {
        patientId: {
          in: [patientA.id, patientB.id],
        },
      },
    });

    expect(conflict.response.status).toBe(409);
    expect(conflict.body.success).toBe(false);
    expect(conflict.body.message?.toLowerCase()).toMatch(/xung đột|conflict|cccd|sđt|sdt|bhyt/);
    expect(totalVisits).toBe(0);
    expect(refreshedA?.phone).toBe(patientA.phone);
    expect(refreshedA?.fullName).toBe('Identity Conflict A');
    expect(refreshedB?.phone).toBe(patientB.phone);
    expect(refreshedB?.fullName).toBe('Identity Conflict B');
  });

  it('creates a new patient when only non-unique fields overlap', async () => {
    const suffix = randomSuffix();
    const existing = await createSeedPatient({
      fullName: 'Same Name',
      phone: `09${suffix.slice(-8)}`,
      idNumber: `ID-EXIST-${suffix}`,
      insuranceNumber: `BHYT-EXIST-${suffix}`,
      address: 'Same Address',
    });
    cleanupTargets.push({
      phone: existing.phone,
      idNumber: existing.idNumber,
      insuranceNumber: existing.insuranceNumber,
    });

    const newIdentity = {
      phone: `08${suffix.slice(-8)}`,
      idNumber: `ID-NEW-${suffix}`,
      insuranceNumber: `BHYT-NEW-${suffix}`,
    };
    cleanupTargets.push(newIdentity);

    const walkIn = await createWalkIn(
      createWalkInPayload(`${suffix}6`, {
        fullName: existing.fullName,
        phone: newIdentity.phone,
        idNumber: newIdentity.idNumber,
        insuranceNumber: newIdentity.insuranceNumber,
        address: existing.address,
      }),
      baseUrl,
    );

    const createdPatient = await prisma.patient.findUnique({
      where: { idNumber: newIdentity.idNumber },
    });
    const allPatients = await prisma.patient.findMany({
      where: {
        OR: [{ id: existing.id }, { idNumber: newIdentity.idNumber }],
      },
    });

    expect(walkIn.response.status).toBe(201);
    expect(walkIn.body.success).toBe(true);
    expect(createdPatient).not.toBeNull();
    expect(createdPatient?.id).not.toBe(existing.id);
    expect(allPatients).toHaveLength(2);
  });
});
