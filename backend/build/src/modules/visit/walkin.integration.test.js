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
        where: {
            OR: filters,
        },
        select: {
            id: true,
        },
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
                await prisma_1.prisma.turnProgress.deleteMany({
                    where: { turnId: { in: turnIds } },
                });
                await prisma_1.prisma.turn.deleteMany({
                    where: { id: { in: turnIds } },
                });
            }
            if (queueItemIds.length > 0) {
                await prisma_1.prisma.queueItemHistory.deleteMany({
                    where: { queueItemId: { in: queueItemIds } },
                });
                await prisma_1.prisma.queueItemStatus.deleteMany({
                    where: { queueItemId: { in: queueItemIds } },
                });
                await prisma_1.prisma.queueItem.deleteMany({
                    where: { id: { in: queueItemIds } },
                });
            }
            await prisma_1.prisma.visitAssignment.deleteMany({
                where: { visitId: { in: visitIds } },
            });
            await prisma_1.prisma.visitStateHistory.deleteMany({
                where: { visitId: { in: visitIds } },
            });
            await prisma_1.prisma.visitProgress.deleteMany({
                where: { visitId: { in: visitIds } },
            });
            await prisma_1.prisma.visitClinical.deleteMany({
                where: { visitId: { in: visitIds } },
            });
            await prisma_1.prisma.visit.deleteMany({
                where: { id: { in: visitIds } },
            });
        }
        await prisma_1.prisma.appointment.deleteMany({
            where: { patientId: patient.id },
        });
        await prisma_1.prisma.patient.delete({
            where: { id: patient.id },
        });
    }
};
const createSeedPatient = async (input) => {
    const patientCode = `TEST-${randomSuffix()}`;
    return prisma_1.prisma.patient.create({
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
const createWalkInPayload = (suffix, overrides = {}) => ({
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
const createWalkIn = async (payload, baseUrl) => {
    const response = await fetch(`${baseUrl}/visits/walk-in`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await extractJson(response);
    return { response, body };
};
const getPatientArtifacts = async (patientId) => {
    const [visitCount, queueItemCount, turnCount] = await Promise.all([
        prisma_1.prisma.visit.count({
            where: { patientId },
        }),
        prisma_1.prisma.queueItem.count({
            where: {
                visit: { patientId },
            },
        }),
        prisma_1.prisma.turn.count({
            where: {
                visit: { patientId },
            },
        }),
    ]);
    return { visitCount, queueItemCount, turnCount };
};
(0, vitest_1.describe)('Reception walk-in workflow', () => {
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
    (0, vitest_1.it)('POST /patients creates a real patient record in DB', async () => {
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
        const beforeCount = await prisma_1.prisma.patient.count({
            where: { idNumber: patientPayload.idNumber },
        });
        const response = await fetch(`${baseUrl}/patients`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(patientPayload),
        });
        const body = await extractJson(response);
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(body.success).toBe(true);
        (0, vitest_1.expect)(body.data?.fullName).toBe(patientPayload.fullName);
        const afterCount = await prisma_1.prisma.patient.count({
            where: { idNumber: patientPayload.idNumber },
        });
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { idNumber: patientPayload.idNumber },
        });
        (0, vitest_1.expect)(afterCount).toBe(beforeCount + 1);
        (0, vitest_1.expect)(patient).not.toBeNull();
        (0, vitest_1.expect)(patient?.phone).toBe(patientPayload.phone);
    });
    (0, vitest_1.it)('POST /visits/walk-in creates patient, visit, queue, turn and exposes the patient in queue/turn lists', async () => {
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
        (0, vitest_1.expect)(first.response.status).toBe(201);
        (0, vitest_1.expect)(first.body.success).toBe(true);
        (0, vitest_1.expect)(first.body.data.patient.fullName).toBe(patientPayload.fullName);
        (0, vitest_1.expect)(first.body.data.queueNumber).toMatch(/^N\d{3}$|^P\d{3}$/);
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { idNumber: patientPayload.idNumber },
        });
        (0, vitest_1.expect)(patient).not.toBeNull();
        const visit = await prisma_1.prisma.visit.findUnique({
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
        (0, vitest_1.expect)(visit).not.toBeNull();
        (0, vitest_1.expect)(visit?.patientId).toBe(patient?.id);
        (0, vitest_1.expect)(visit?.queueNumber).toBe(first.body.data.queueNumber);
        (0, vitest_1.expect)(visit?.progress?.currentState).toBe('WAITING_EXAM');
        (0, vitest_1.expect)(visit?.stateHistories.some(history => history.fromState === null && history.toState === 'WAITING_EXAM')).toBe(true);
        (0, vitest_1.expect)(visit?.assignments.some(assignment => assignment.isCurrent && assignment.doctorId === TEST_DOCTOR_ID)).toBe(true);
        (0, vitest_1.expect)(visit?.queueItems).toHaveLength(1);
        (0, vitest_1.expect)(visit?.queueItems[0]?.status?.status).toBe('WAITING');
        (0, vitest_1.expect)(visit?.turns).toHaveLength(1);
        (0, vitest_1.expect)(visit?.turns[0]?.doctorId).toBe(TEST_DOCTOR_ID);
        (0, vitest_1.expect)(visit?.turns[0]?.progress?.status).toBe('PENDING');
        const queueResponse = await fetch(`${baseUrl}/queue?search=${encodeURIComponent(patientPayload.fullName)}`);
        const queueBody = await extractJson(queueResponse);
        (0, vitest_1.expect)(queueResponse.status).toBe(200);
        (0, vitest_1.expect)(queueBody.success).toBe(true);
        (0, vitest_1.expect)(queueBody.data.some((item) => item.visit.visitId === first.body.data.visitId)).toBe(true);
        const turnsResponse = await fetch(`${baseUrl}/turns?search=${encodeURIComponent(patientPayload.fullName)}`);
        const turnsBody = await extractJson(turnsResponse);
        (0, vitest_1.expect)(turnsResponse.status).toBe(200);
        (0, vitest_1.expect)(turnsBody.success).toBe(true);
        (0, vitest_1.expect)(turnsBody.data.some((item) => item.visit.visitId === first.body.data.visitId && item.doctorId === TEST_DOCTOR_ID)).toBe(true);
        const artifacts = await getPatientArtifacts(patient.id);
        (0, vitest_1.expect)(artifacts.visitCount).toBe(1);
        (0, vitest_1.expect)(artifacts.queueItemCount).toBe(1);
        (0, vitest_1.expect)(artifacts.turnCount).toBe(1);
    });
    (0, vitest_1.it)('rejects duplicate CCCD for a patient already active without overwriting the patient profile', async () => {
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
        const first = await createWalkIn(createWalkInPayload(suffix, {
            fullName: patient.fullName,
            phone: patient.phone ?? basePayload.phone,
            idNumber: patient.idNumber,
            insuranceNumber: patient.insuranceNumber,
            address: patient.address,
        }), baseUrl);
        (0, vitest_1.expect)(first.response.status).toBe(201);
        const duplicate = await createWalkIn(createWalkInPayload(`${suffix}1`, {
            fullName: 'Patient A Changed',
            phone: `08${suffix.slice(-8)}`,
            idNumber: patient.idNumber,
            insuranceNumber: `BHYT-NEW-${suffix}`,
            address: 'New Address',
        }), baseUrl);
        const refreshedPatient = await prisma_1.prisma.patient.findUnique({
            where: { id: patient.id },
        });
        const artifacts = await getPatientArtifacts(patient.id);
        (0, vitest_1.expect)(duplicate.response.status).toBe(409);
        (0, vitest_1.expect)(duplicate.body.success).toBe(false);
        (0, vitest_1.expect)(duplicate.body.message?.toLowerCase()).toMatch(/hàng đợi|hoạt động|active/);
        (0, vitest_1.expect)(artifacts.visitCount).toBe(1);
        (0, vitest_1.expect)(artifacts.queueItemCount).toBe(1);
        (0, vitest_1.expect)(refreshedPatient?.fullName).toBe('Patient A Original');
        (0, vitest_1.expect)(refreshedPatient?.address).toBe('Old Address');
        (0, vitest_1.expect)(refreshedPatient?.phone).toBe(basePayload.phone);
    });
    (0, vitest_1.it)('rejects duplicate phone for a patient already active without overwriting the patient profile', async () => {
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
        const first = await createWalkIn(createWalkInPayload(suffix, {
            fullName: patient.fullName,
            phone: patient.phone ?? basePayload.phone,
            idNumber: null,
            insuranceNumber: patient.insuranceNumber,
            address: patient.address,
        }), baseUrl);
        (0, vitest_1.expect)(first.response.status).toBe(201);
        const duplicate = await createWalkIn(createWalkInPayload(`${suffix}2`, {
            fullName: 'Patient Phone Changed',
            phone: patient.phone ?? basePayload.phone,
            idNumber: `NEW-ID-${suffix}`,
            insuranceNumber: `NEW-BHYT-${suffix}`,
            address: 'Phone New Address',
        }), baseUrl);
        const refreshedPatient = await prisma_1.prisma.patient.findUnique({
            where: { id: patient.id },
        });
        const artifacts = await getPatientArtifacts(patient.id);
        (0, vitest_1.expect)(duplicate.response.status).toBe(409);
        (0, vitest_1.expect)(duplicate.body.success).toBe(false);
        (0, vitest_1.expect)(duplicate.body.message?.toLowerCase()).toMatch(/hàng đợi|hoạt động|active/);
        (0, vitest_1.expect)(artifacts.visitCount).toBe(1);
        (0, vitest_1.expect)(artifacts.queueItemCount).toBe(1);
        (0, vitest_1.expect)(refreshedPatient?.fullName).toBe('Patient Phone Original');
        (0, vitest_1.expect)(refreshedPatient?.address).toBe('Phone Old Address');
    });
    (0, vitest_1.it)('rejects duplicate insuranceNumber for a patient already active without overwriting the patient profile', async () => {
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
        const first = await createWalkIn(createWalkInPayload(suffix, {
            fullName: patient.fullName,
            phone: patient.phone ?? basePayload.phone,
            idNumber: patient.idNumber,
            insuranceNumber: patient.insuranceNumber,
            address: patient.address,
        }), baseUrl);
        (0, vitest_1.expect)(first.response.status).toBe(201);
        const duplicate = await createWalkIn(createWalkInPayload(`${suffix}3`, {
            fullName: 'Patient Insurance Changed',
            phone: `08${suffix.slice(-8)}`,
            idNumber: `OTHER-${suffix}`,
            insuranceNumber: patient.insuranceNumber,
            address: 'Insurance New Address',
        }), baseUrl);
        const allPatients = await prisma_1.prisma.patient.findMany({
            where: {
                insuranceNumber: patient.insuranceNumber,
            },
        });
        const refreshedPatient = await prisma_1.prisma.patient.findUnique({
            where: { id: patient.id },
        });
        const artifacts = await getPatientArtifacts(patient.id);
        (0, vitest_1.expect)(duplicate.response.status).toBe(409);
        (0, vitest_1.expect)(duplicate.body.success).toBe(false);
        (0, vitest_1.expect)(duplicate.body.message?.toLowerCase()).toMatch(/hàng đợi|hoạt động|active/);
        (0, vitest_1.expect)(allPatients).toHaveLength(1);
        (0, vitest_1.expect)(artifacts.visitCount).toBe(1);
        (0, vitest_1.expect)(refreshedPatient?.fullName).toBe('Patient Insurance Original');
        (0, vitest_1.expect)(refreshedPatient?.address).toBe('Insurance Old Address');
    });
    (0, vitest_1.it)('reuses existing patient for duplicate CCCD without active visit and does not overwrite demographic data', async () => {
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
        const walkIn = await createWalkIn(createWalkInPayload(`${suffix}4`, {
            fullName: 'Patient Reuse Changed',
            phone: `08${suffix.slice(-8)}`,
            idNumber: patient.idNumber,
            insuranceNumber: `NEW-BHYT-${suffix}`,
            address: 'Reuse New Address',
        }), baseUrl);
        const refreshedPatient = await prisma_1.prisma.patient.findUnique({
            where: { id: patient.id },
        });
        const allPatients = await prisma_1.prisma.patient.findMany({
            where: {
                OR: [{ idNumber: patient.idNumber }, { phone: `08${suffix.slice(-8)}` }],
            },
        });
        const artifacts = await getPatientArtifacts(patient.id);
        (0, vitest_1.expect)(walkIn.response.status).toBe(201);
        (0, vitest_1.expect)(walkIn.body.success).toBe(true);
        (0, vitest_1.expect)(walkIn.body.data.visitId).toBeTruthy();
        (0, vitest_1.expect)(walkIn.body.data.queueNumber).toMatch(/^N\d{3}$|^P\d{3}$/);
        (0, vitest_1.expect)(artifacts.visitCount).toBe(1);
        (0, vitest_1.expect)(artifacts.queueItemCount).toBe(1);
        (0, vitest_1.expect)(allPatients).toHaveLength(1);
        (0, vitest_1.expect)(refreshedPatient?.fullName).toBe('Patient Reuse Original');
        (0, vitest_1.expect)(refreshedPatient?.address).toBe('Reuse Old Address');
        (0, vitest_1.expect)(refreshedPatient?.phone).toBe(basePayload.phone);
    });
    (0, vitest_1.it)('rejects identity conflict when unique identifiers point to different patients', async () => {
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
        const conflict = await createWalkIn(createWalkInPayload(`${suffix}5`, {
            fullName: 'Identity Conflict Incoming',
            phone: patientB.phone ?? `08${suffix.slice(-8)}`,
            idNumber: patientA.idNumber,
            insuranceNumber: `BHYT-IN-${suffix}`,
            address: 'Conflict Address Incoming',
        }), baseUrl);
        const refreshedA = await prisma_1.prisma.patient.findUnique({ where: { id: patientA.id } });
        const refreshedB = await prisma_1.prisma.patient.findUnique({ where: { id: patientB.id } });
        const totalVisits = await prisma_1.prisma.visit.count({
            where: {
                patientId: {
                    in: [patientA.id, patientB.id],
                },
            },
        });
        (0, vitest_1.expect)(conflict.response.status).toBe(409);
        (0, vitest_1.expect)(conflict.body.success).toBe(false);
        (0, vitest_1.expect)(conflict.body.message?.toLowerCase()).toMatch(/xung đột|conflict|cccd|sđt|sdt|bhyt/);
        (0, vitest_1.expect)(totalVisits).toBe(0);
        (0, vitest_1.expect)(refreshedA?.phone).toBe(patientA.phone);
        (0, vitest_1.expect)(refreshedA?.fullName).toBe('Identity Conflict A');
        (0, vitest_1.expect)(refreshedB?.phone).toBe(patientB.phone);
        (0, vitest_1.expect)(refreshedB?.fullName).toBe('Identity Conflict B');
    });
    (0, vitest_1.it)('creates a new patient when only non-unique fields overlap', async () => {
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
        const walkIn = await createWalkIn(createWalkInPayload(`${suffix}6`, {
            fullName: existing.fullName,
            phone: newIdentity.phone,
            idNumber: newIdentity.idNumber,
            insuranceNumber: newIdentity.insuranceNumber,
            address: existing.address,
        }), baseUrl);
        const createdPatient = await prisma_1.prisma.patient.findUnique({
            where: { idNumber: newIdentity.idNumber },
        });
        const allPatients = await prisma_1.prisma.patient.findMany({
            where: {
                OR: [{ id: existing.id }, { idNumber: newIdentity.idNumber }],
            },
        });
        (0, vitest_1.expect)(walkIn.response.status).toBe(201);
        (0, vitest_1.expect)(walkIn.body.success).toBe(true);
        (0, vitest_1.expect)(createdPatient).not.toBeNull();
        (0, vitest_1.expect)(createdPatient?.id).not.toBe(existing.id);
        (0, vitest_1.expect)(allPatients).toHaveLength(2);
    });
});
