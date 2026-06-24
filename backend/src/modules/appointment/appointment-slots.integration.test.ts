import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { Prisma } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const TEST_DEPARTMENT_ID = 'dept_ntq';
const TEST_DOCTOR_ID = 'doctor_bsnam';
const TEST_ROOM_ID = 'room_101';
const TEST_SERVICE_ID = 'svc_ntq';
const TEST_SECOND_DOCTOR_ID = 'doctor_bshuong';
const TEST_SECOND_ROOM_ID = 'room_102';

type PatientIdentity = {
  phone?: string | null;
  idNumber?: string | null;
  insuranceNumber?: string | null;
};

const randomSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

const extractJson = async (response: Response) => {
  const data = await response.json();
  return data as { success: boolean; data?: any; message?: string; code?: string; details?: any };
};

const dateOnlyString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const utcDateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);

const buildPatientPayload = (suffix: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  fullName: `Appointment Slot Test ${suffix}`,
  gender: 'MALE' as const,
  dateOfBirth: '1990-01-15',
  phone: `09${suffix.slice(-8)}`,
  idNumber: `079${suffix.slice(-9)}`,
  address: 'Appointment slot integration test',
  insuranceNumber: `BHYT-SLOT-${suffix}`,
  isDisabled: false,
  isDisabledHeavy: false,
  isRevolutionary: false,
  ...overrides,
});

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
    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      select: { id: true },
    });
    const appointmentIds = appointments.map(item => item.id);

    if (appointmentIds.length > 0) {
      const visits = await prisma.visit.findMany({
        where: { appointmentId: { in: appointmentIds } },
        select: { id: true },
      });
      const visitIds = visits.map(item => item.id);

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
        const turnIds = turns.map(item => item.id);

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

      await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    }

    await prisma.patient.delete({ where: { id: patient.id } });
  }
};

const createAppointment = async (
  baseUrl: string,
  payload: Record<string, unknown>,
) => {
  const response = await fetch(`${baseUrl}/appointments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await extractJson(response);
  return { response, body };
};

const getAvailableSlots = async (
  baseUrl: string,
  query: Record<string, string | number | null | undefined>,
) => {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  });

  const response = await fetch(`${baseUrl}/appointments/available-slots?${search.toString()}`);
  const body = await extractJson(response);
  return { response, body };
};

const seedSchedule = async (
  input: {
    id: string;
    doctorId: string;
    roomId: string;
    workDate: Date;
    shift: string;
    startTime: string;
    endTime: string;
  },
) => {
  await prisma.workSchedule.create({
    data: {
      id: input.id,
      doctorId: input.doctorId,
      roomId: input.roomId,
      workDate: input.workDate,
      shift: input.shift,
      startTime: input.startTime,
      endTime: input.endTime,
      maxPatients: 20,
      isActive: true,
      note: 'Appointment slots integration test',
    },
  });
};

describe('Appointment available slots contract', () => {
  let server: Server;
  let baseUrl = '';
  let cleanupTargets: PatientIdentity[] = [];
  let scheduleIds: string[] = [];

  beforeAll(async () => {
    server = app.listen(0);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  beforeEach(() => {
    cleanupTargets = [];
    scheduleIds = [];
  });

  afterEach(async () => {
    for (const target of cleanupTargets) {
      await cleanupPatientArtifacts(target);
    }

    if (scheduleIds.length > 0) {
      await prisma.workSchedule.deleteMany({
        where: { id: { in: scheduleIds } },
      });
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
    await prisma.$disconnect();
  });

  it('rejects today and past dates', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayResponse = await getAvailableSlots(baseUrl, {
      date: dateOnlyString(today),
      doctorId: TEST_DOCTOR_ID,
    });
    expect(todayResponse.response.status).toBe(400);
    expect(todayResponse.body.success).toBe(false);
    expect(todayResponse.body.message).toContain('ngày mai');

    const pastResponse = await getAvailableSlots(baseUrl, {
      date: dateOnlyString(yesterday),
      doctorId: TEST_DOCTOR_ID,
    });
    expect(pastResponse.response.status).toBe(400);
    expect(pastResponse.body.success).toBe(false);
    expect(pastResponse.body.message).toContain('ngày mai');
  });

  it('returns 30-minute slots from tomorrow based on active work schedule', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const workDate = utcDateOnly(dateOnlyString(tomorrow));

    const scheduleId = `sched_slots_${randomSuffix()}`;
    scheduleIds.push(scheduleId);
    await seedSchedule({
      id: scheduleId,
      doctorId: TEST_DOCTOR_ID,
      roomId: TEST_ROOM_ID,
      workDate,
      shift: 'AM',
      startTime: '08:00',
      endTime: '10:00',
    });

    const result = await getAvailableSlots(baseUrl, {
      date: dateOnlyString(tomorrow),
      doctorId: TEST_DOCTOR_ID,
    });

    expect(result.response.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.date).toBe(workDate.toISOString());
    expect(result.body.data.doctorId).toBe(TEST_DOCTOR_ID);

    const slots = result.body.data.slots as Array<{ startTime: string; endTime: string; doctorId: string; roomId: string }>;
    expect(slots).toHaveLength(4);
    expect(slots.map(slot => `${slot.startTime}-${slot.endTime}`)).toEqual([
      '08:00-08:30',
      '08:30-09:00',
      '09:00-09:30',
      '09:30-10:00',
    ]);
    expect(new Set(slots.map(slot => slot.doctorId))).toEqual(new Set([TEST_DOCTOR_ID]));
    expect(new Set(slots.map(slot => slot.roomId))).toEqual(new Set([TEST_ROOM_ID]));
  });

  it('omits occupied slots when an appointment already exists', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const workDate = utcDateOnly(dateOnlyString(tomorrow));

    const scheduleId = `sched_slots_${randomSuffix()}`;
    scheduleIds.push(scheduleId);
    await seedSchedule({
      id: scheduleId,
      doctorId: TEST_DOCTOR_ID,
      roomId: TEST_ROOM_ID,
      workDate,
      shift: 'AM',
      startTime: '08:00',
      endTime: '10:00',
    });

    const bookingSuffix = randomSuffix();
    const payload = buildPatientPayload(bookingSuffix, {
      departmentId: TEST_DEPARTMENT_ID,
      serviceId: TEST_SERVICE_ID,
      doctorId: TEST_DOCTOR_ID,
      appointmentTime: `${dateOnlyString(tomorrow)}T08:30:00`,
      chiefComplaint: 'Test appointment occupancy',
      note: 'Appointment slots integration test',
    });

    const booking = await createAppointment(baseUrl, payload);
    expect(booking.response.status).toBe(201);
    expect(booking.body.success).toBe(true);

    cleanupTargets.push({
      phone: payload.phone as string,
      idNumber: payload.idNumber as string,
      insuranceNumber: payload.insuranceNumber as string,
    });

    const result = await getAvailableSlots(baseUrl, {
      date: dateOnlyString(tomorrow),
      doctorId: TEST_DOCTOR_ID,
    });

    expect(result.response.status).toBe(200);
    const slots = result.body.data.slots as Array<{ startTime: string; endTime: string }>;
    expect(slots.map(slot => `${slot.startTime}-${slot.endTime}`)).toEqual([
      '08:00-08:30',
      '09:00-09:30',
      '09:30-10:00',
    ]);
    expect(slots.some(slot => slot.startTime === '08:30')).toBe(false);
  });

  it('filters slots by doctor and date correctly', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const scheduleA = `sched_slots_a_${randomSuffix()}`;
    const scheduleB = `sched_slots_b_${randomSuffix()}`;
    scheduleIds.push(scheduleA, scheduleB);

    await Promise.all([
      seedSchedule({
        id: scheduleA,
        doctorId: TEST_DOCTOR_ID,
        roomId: TEST_ROOM_ID,
        workDate: utcDateOnly(dateOnlyString(tomorrow)),
        shift: 'AM',
        startTime: '08:00',
        endTime: '09:00',
      }),
      seedSchedule({
        id: scheduleB,
        doctorId: TEST_SECOND_DOCTOR_ID,
        roomId: TEST_SECOND_ROOM_ID,
        workDate: utcDateOnly(dateOnlyString(dayAfterTomorrow)),
        shift: 'AM',
        startTime: '09:00',
        endTime: '11:00',
      }),
    ]);

    const tomorrowSlots = await getAvailableSlots(baseUrl, {
      date: dateOnlyString(tomorrow),
      doctorId: TEST_DOCTOR_ID,
    });
    expect(tomorrowSlots.response.status).toBe(200);
    expect(tomorrowSlots.body.data.slots).toHaveLength(2);
    expect(new Set((tomorrowSlots.body.data.slots as Array<{ doctorId: string }>).map(slot => slot.doctorId))).toEqual(new Set([TEST_DOCTOR_ID]));

    const wrongDoctor = await getAvailableSlots(baseUrl, {
      date: dateOnlyString(tomorrow),
      doctorId: TEST_SECOND_DOCTOR_ID,
    });
    expect(wrongDoctor.response.status).toBe(200);
    expect(wrongDoctor.body.data.slots).toHaveLength(0);

    const wrongDate = await getAvailableSlots(baseUrl, {
      date: dateOnlyString(dayAfterTomorrow),
      doctorId: TEST_DOCTOR_ID,
    });
    expect(wrongDate.response.status).toBe(200);
    expect(wrongDate.body.data.slots).toHaveLength(0);
  });

  it('creates appointment without creating visit or queue', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const workDate = utcDateOnly(dateOnlyString(tomorrow));

    const scheduleId = `sched_slots_${randomSuffix()}`;
    scheduleIds.push(scheduleId);
    await seedSchedule({
      id: scheduleId,
      doctorId: TEST_DOCTOR_ID,
      roomId: TEST_ROOM_ID,
      workDate,
      shift: 'AM',
      startTime: '08:00',
      endTime: '10:00',
    });

    const suffix = randomSuffix();
    const payload = buildPatientPayload(suffix, {
      departmentId: TEST_DEPARTMENT_ID,
      serviceId: TEST_SERVICE_ID,
      doctorId: TEST_DOCTOR_ID,
      appointmentTime: `${dateOnlyString(tomorrow)}T08:00:00`,
      chiefComplaint: 'Appointment create contract test',
      note: 'Appointment create without visit/queue',
    });

    const created = await createAppointment(baseUrl, payload);
    expect(created.response.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.data.appointment.appointmentId).toBeTruthy();

    cleanupTargets.push({
      phone: payload.phone as string,
      idNumber: payload.idNumber as string,
      insuranceNumber: payload.insuranceNumber as string,
    });

    const patient = await prisma.patient.findFirstOrThrow({
      where: { phone: payload.phone as string },
      select: { id: true },
    });
    const appointment = await prisma.appointment.findFirstOrThrow({
      where: { patientId: patient.id },
      select: { id: true },
    });

    expect(await prisma.visit.count({ where: { appointmentId: appointment.id } })).toBe(0);
    expect(await prisma.queueItem.count({ where: { visit: { appointmentId: appointment.id } } })).toBe(0);
  });

  it('check-in still creates visit and queue item', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const workDate = utcDateOnly(dateOnlyString(tomorrow));

    const scheduleId = `sched_slots_${randomSuffix()}`;
    scheduleIds.push(scheduleId);
    await seedSchedule({
      id: scheduleId,
      doctorId: TEST_DOCTOR_ID,
      roomId: TEST_ROOM_ID,
      workDate,
      shift: 'AM',
      startTime: '08:00',
      endTime: '10:00',
    });

    const suffix = randomSuffix();
    const payload = buildPatientPayload(suffix, {
      departmentId: TEST_DEPARTMENT_ID,
      serviceId: TEST_SERVICE_ID,
      doctorId: TEST_DOCTOR_ID,
      appointmentTime: `${dateOnlyString(tomorrow)}T09:00:00`,
      chiefComplaint: 'Appointment check-in contract test',
      note: 'Appointment check-in should create visit and queue',
    });

    const created = await createAppointment(baseUrl, payload);
    expect(created.response.status).toBe(201);

    cleanupTargets.push({
      phone: payload.phone as string,
      idNumber: payload.idNumber as string,
      insuranceNumber: payload.insuranceNumber as string,
    });

    const patient = await prisma.patient.findFirstOrThrow({
      where: { phone: payload.phone as string },
      select: { id: true },
    });
    const appointment = await prisma.appointment.findFirstOrThrow({
      where: { patientId: patient.id },
      select: { id: true },
    });

    const checkInResponse = await fetch(`${baseUrl}/appointments/${appointment.id}/check-in`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'Appointment check-in integration test', updatedById: null }),
    });
    const checkInBody = await extractJson(checkInResponse);

    expect(checkInResponse.status).toBe(200);
    expect(checkInBody.success).toBe(true);
    expect(checkInBody.data.visit.visitId).toBeTruthy();
    expect(checkInBody.data.queueItem.queueItemId).toBeTruthy();

    expect(await prisma.visit.count({ where: { appointmentId: appointment.id } })).toBe(1);
    const visit = await prisma.visit.findFirstOrThrow({
      where: { appointmentId: appointment.id },
      select: { id: true },
    });
    expect(await prisma.queueItem.count({ where: { visitId: visit.id } })).toBe(1);
  });
});
