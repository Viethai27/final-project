import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../__mocks__/prisma';

vi.mock('../../../lib/prisma', () => ({ prisma }));

import { getDispatchSuggestionByVisitId } from '../dispatch.service';

const baseDepartment = {
  id: 'dep-1',
  name: 'Khoa Kham',
  code: 'KHAM',
};

const createRoom = (id: string, roomType: 'EXAM' | 'LAB' | 'IMAGING' = 'EXAM', avgServiceTime = 15) => ({
  id,
  name: `Phong ${id}`,
  code: id.toUpperCase(),
  roomType,
  capacity: 1,
  avgServiceTime,
  department: baseDepartment,
});

const createService = (id: string, avgDuration = 15) => ({
  id,
  name: `Dich vu ${id}`,
  code: id.toUpperCase(),
  serviceType: 'EXAM',
  avgDuration,
});

const createDoctor = (id: string, defaultRoomId = 'room-current') => ({
  id,
  name: `Bac si ${id}`,
  specialty: 'Noi tong quat',
  licenseNumber: `LIC-${id}`,
  defaultRoomId,
  department: baseDepartment,
});

const createVisit = (overrides: Partial<any> = {}) => ({
  id: 'visit-1',
  queueNumber: 'V-001',
  createdAt: new Date('2026-06-01T08:00:00.000Z'),
  chiefComplaint: 'Sot',
  isUrgent: false,
  isPregnantAtVisit: false,
  priorityReason: null,
  patient: {
    id: 'patient-1',
    patientCode: 'BN001',
    fullName: 'Nguyen Van A',
    gender: 'MALE',
    age: 32,
    phone: '0900000000',
  },
  appointment: {
    id: 'app-1',
    appointmentTime: '2026-06-01T07:30:00.000Z',
    status: 'SCHEDULED',
    service: createService('svc-1', 15),
    doctor: createDoctor('doctor-current'),
    room: createRoom('room-current'),
  },
  progress: {
    currentState: 'WAITING_EXAM',
    laneType: 'NORMAL',
    sameDoctorRequired: false,
  },
  queueItems: [
    {
      id: 'qi-1',
      queueType: 'EXAM',
      laneType: 'NORMAL',
      priorityReason: null,
      initialPriorityScore: 50,
      enqueuedAt: new Date('2026-06-01T08:05:00.000Z'),
      sameDoctorRequired: false,
      targetRoom: createRoom('room-current'),
      targetDoctor: createDoctor('doctor-current'),
      status: {
        status: 'WAITING',
        priorityScore: 50,
        lastScoreUpdated: null,
        calledAt: null,
        servedAt: null,
        dequeuedAt: null,
        isTimeout: false,
      },
    },
  ],
  turns: [
    {
      id: 'turn-1',
      turnType: 'EXAM',
      createdAt: new Date('2026-06-01T08:10:00.000Z'),
      room: createRoom('room-current'),
      doctor: createDoctor('doctor-current'),
      service: createService('svc-1', 15),
      progress: {
        status: 'PENDING',
        calledAt: null,
        startedAt: null,
        endedAt: null,
        timeoutAt: null,
        durationMinutes: null,
      },
    },
  ],
  clsOrders: [
    {
      id: 'cls-1',
      status: 'PENDING',
      priority: 'ROUTINE',
      orderedAt: new Date('2026-06-01T08:15:00.000Z'),
      service: createService('svc-2', 20),
      room: createRoom('room-lab', 'LAB', 20),
    },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TC-D1..TC-D7: dispatch suggestion scoring', () => {
  it('TC-D1: phong co queue ngan hon duoc xep cao hon', async () => {
    // Nghiep vu: phong co hang cho ngan hon phai co diem cao hon.
    prisma.visit.findUnique.mockResolvedValueOnce(createVisit());
    prisma.room.findMany.mockResolvedValueOnce([
      createRoom('room-a'),
      createRoom('room-b'),
    ]);
    prisma.resourceLoad.findMany.mockResolvedValueOnce([
      {
        roomId: 'room-a',
        currentLoad: 1,
        queueLength: 1,
        utilizationRate: 0.4,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'NORMAL',
        doctorAvailable: true,
      },
      {
        roomId: 'room-b',
        currentLoad: 5,
        queueLength: 5,
        utilizationRate: 0.4,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'NORMAL',
        doctorAvailable: true,
      },
    ]);
    prisma.queueItem.findMany.mockResolvedValueOnce([]);
    prisma.doctorProfile.findMany.mockResolvedValueOnce([]);
    prisma.serviceRoom.findMany.mockResolvedValueOnce([
      { roomId: 'room-a', service: createService('svc-a') },
      { roomId: 'room-b', service: createService('svc-b') },
    ]);

    const result = await getDispatchSuggestionByVisitId('visit-1');

    expect(result.candidates[0].room?.id).toBe('room-a');
    expect(result.candidates[0].resourceScore).toBeGreaterThan(result.candidates[1].resourceScore);
  });

  it('TC-D2: penalty overload lam giam diem manh hon normal', async () => {
    // Nghiep vu: phong OVERLOAD bi tru diem manh hon phong NORMAL.
    prisma.visit.findUnique.mockResolvedValueOnce(createVisit());
    prisma.room.findMany.mockResolvedValueOnce([
      createRoom('room-a'),
      createRoom('room-b'),
    ]);
    prisma.resourceLoad.findMany.mockResolvedValueOnce([
      {
        roomId: 'room-a',
        currentLoad: 2,
        queueLength: 2,
        utilizationRate: 0.5,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'NORMAL',
        doctorAvailable: true,
      },
      {
        roomId: 'room-b',
        currentLoad: 2,
        queueLength: 2,
        utilizationRate: 0.5,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'OVERLOAD',
        doctorAvailable: true,
      },
    ]);
    prisma.queueItem.findMany.mockResolvedValueOnce([]);
    prisma.doctorProfile.findMany.mockResolvedValueOnce([]);
    prisma.serviceRoom.findMany.mockResolvedValueOnce([
      { roomId: 'room-a', service: createService('svc-a') },
      { roomId: 'room-b', service: createService('svc-b') },
    ]);

    const result = await getDispatchSuggestionByVisitId('visit-1');
    const normal = result.candidates.find(candidate => candidate.room?.id === 'room-a')!;
    const overload = result.candidates.find(candidate => candidate.room?.id === 'room-b')!;

    expect(normal.resourceScore).toBeGreaterThan(overload.resourceScore);
    expect(Math.round((normal.resourceScore - overload.resourceScore) * 100)).toBeGreaterThanOrEqual(18);
  });

  it('TC-D3: WARNING nhe hon OVERLOAD', async () => {
    // Nghiep vu: canh bao phai nhe hon qua tai.
    prisma.visit.findUnique.mockResolvedValueOnce(createVisit());
    prisma.room.findMany.mockResolvedValueOnce([
      createRoom('room-a'),
      createRoom('room-b'),
      createRoom('room-c'),
    ]);
    prisma.resourceLoad.findMany.mockResolvedValueOnce([
      {
        roomId: 'room-a',
        currentLoad: 2,
        queueLength: 2,
        utilizationRate: 0.3,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'NORMAL',
        doctorAvailable: true,
      },
      {
        roomId: 'room-b',
        currentLoad: 2,
        queueLength: 2,
        utilizationRate: 0.3,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'WARNING',
        doctorAvailable: true,
      },
      {
        roomId: 'room-c',
        currentLoad: 2,
        queueLength: 2,
        utilizationRate: 0.3,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'OVERLOAD',
        doctorAvailable: true,
      },
    ]);
    prisma.queueItem.findMany.mockResolvedValueOnce([]);
    prisma.doctorProfile.findMany.mockResolvedValueOnce([]);
    prisma.serviceRoom.findMany.mockResolvedValueOnce([
      { roomId: 'room-a', service: createService('svc-a') },
      { roomId: 'room-b', service: createService('svc-b') },
      { roomId: 'room-c', service: createService('svc-c') },
    ]);

    const result = await getDispatchSuggestionByVisitId('visit-1');
    const normal = result.candidates.find(candidate => candidate.room?.id === 'room-a')!;
    const warning = result.candidates.find(candidate => candidate.room?.id === 'room-b')!;
    const overload = result.candidates.find(candidate => candidate.room?.id === 'room-c')!;

    expect(normal.resourceScore).toBeGreaterThan(warning.resourceScore);
    expect(warning.resourceScore).toBeGreaterThan(overload.resourceScore);
  });

  it('TC-D4: phong hien tai nhan bonus quay lai dung phong', async () => {
    // Nghiep vu: neu benh nhan quay lai dung phong hien tai thi duoc bonus diem.
    prisma.visit.findUnique.mockResolvedValueOnce(
      createVisit({
        turns: [
          {
            id: 'turn-current',
            turnType: 'EXAM',
            createdAt: new Date('2026-06-01T08:10:00.000Z'),
            room: createRoom('room-a'),
            doctor: createDoctor('doctor-current', 'room-a'),
            service: createService('svc-1', 15),
            progress: {
              status: 'PENDING',
              calledAt: null,
              startedAt: null,
              endedAt: null,
              timeoutAt: null,
              durationMinutes: null,
            },
          },
        ],
      }),
    );
    prisma.room.findMany.mockResolvedValueOnce([
      createRoom('room-a'),
      createRoom('room-b'),
    ]);
    prisma.resourceLoad.findMany.mockResolvedValueOnce([
      {
        roomId: 'room-a',
        currentLoad: 3,
        queueLength: 3,
        utilizationRate: 0.4,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'NORMAL',
        doctorAvailable: true,
      },
      {
        roomId: 'room-b',
        currentLoad: 4,
        queueLength: 4,
        utilizationRate: 0.4,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: 15,
        alertLevel: 'NORMAL',
        doctorAvailable: true,
      },
    ]);
    prisma.queueItem.findMany.mockResolvedValueOnce([]);
    prisma.doctorProfile.findMany.mockResolvedValueOnce([]);
    prisma.serviceRoom.findMany.mockResolvedValueOnce([
      { roomId: 'room-a', service: createService('svc-a') },
      { roomId: 'room-b', service: createService('svc-b') },
    ]);

    const result = await getDispatchSuggestionByVisitId('visit-1');

    expect(result.candidates[0].room?.id).toBe('room-a');
    expect(result.candidates[0].resourceScore).toBeGreaterThan(result.candidates[1].resourceScore);
  });

  it('TC-D5: estimated wait tinh dung theo cong thuc', async () => {
    // Nghiep vu: thoi gian cho uoc tinh phai dung cong thuc cua service.
    prisma.visit.findUnique.mockResolvedValueOnce(createVisit());
    prisma.room.findMany.mockResolvedValueOnce([createRoom('room-a', 'EXAM', 15)]);
    prisma.resourceLoad.findMany.mockResolvedValueOnce([
      {
        roomId: 'room-a',
        currentLoad: 4,
        queueLength: 4,
        utilizationRate: 0.4,
        waitTimeRatio: 0.2,
        queuePressure: 0.1,
        avgActualWait: null,
        alertLevel: 'NORMAL',
        doctorAvailable: true,
      },
    ]);
    prisma.queueItem.findMany.mockResolvedValueOnce([]);
    prisma.doctorProfile.findMany.mockResolvedValueOnce([]);
    prisma.serviceRoom.findMany.mockResolvedValueOnce([
      { roomId: 'room-a', service: createService('svc-a', 15) },
    ]);

    const result = await getDispatchSuggestionByVisitId('visit-1');

    expect(result.candidates[0].estimatedWaitMinutes).toBe(38);
  });

  it('TC-D6: score khong bao gio am', async () => {
    // Nghiep vu: diem dieu phoi khong duoc am.
    prisma.visit.findUnique.mockResolvedValueOnce(createVisit());
    prisma.room.findMany.mockResolvedValueOnce([createRoom('room-a')]);
    prisma.resourceLoad.findMany.mockResolvedValueOnce([
      {
        roomId: 'room-a',
        currentLoad: 20,
        queueLength: 20,
        utilizationRate: 1,
        waitTimeRatio: 0.9,
        queuePressure: 0.8,
        avgActualWait: 60,
        alertLevel: 'OVERLOAD',
        doctorAvailable: false,
      },
    ]);
    prisma.queueItem.findMany.mockResolvedValueOnce([]);
    prisma.doctorProfile.findMany.mockResolvedValueOnce([]);
    prisma.serviceRoom.findMany.mockResolvedValueOnce([
      { roomId: 'room-a', service: createService('svc-a', 15) },
    ]);

    const result = await getDispatchSuggestionByVisitId('visit-1');

    expect(result.candidates[0].resourceScore).toBeGreaterThanOrEqual(0);
  });

  it('TC-D7: khong co candidate room thi tra ve mang rong', async () => {
    // Nghiep vu: neu khong co phong phu hop thi danh sach goi y rong.
    prisma.visit.findUnique.mockResolvedValueOnce(createVisit());
    prisma.room.findMany.mockResolvedValueOnce([]);
    prisma.resourceLoad.findMany.mockResolvedValueOnce([]);
    prisma.queueItem.findMany.mockResolvedValueOnce([]);
    prisma.doctorProfile.findMany.mockResolvedValueOnce([]);
    prisma.serviceRoom.findMany.mockResolvedValueOnce([]);

    const result = await getDispatchSuggestionByVisitId('visit-1');

    expect(result.candidates).toHaveLength(0);
  });
});
