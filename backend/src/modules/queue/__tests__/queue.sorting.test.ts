import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../__mocks__/prisma';

vi.mock('../../../lib/prisma', () => ({ prisma }));

import { getQueueItemById, getQueueItems } from '../queue.service';

const baseDepartment = {
  id: 'dep-1',
  name: 'Khoa Kham',
  code: 'KHAM',
};

const createRoom = (id: string) => ({
  id,
  name: `Phong ${id}`,
  code: id.toUpperCase(),
  roomType: 'EXAM',
  department: baseDepartment,
});

const createDoctor = (id: string) => ({
  id,
  name: `Bac si ${id}`,
  specialty: 'Noi tong quat',
  licenseNumber: `LIC-${id}`,
  department: baseDepartment,
});

const createQueueItem = (overrides: Partial<any> = {}) => ({
  id: 'qi-1',
  queueType: 'EXAM',
  laneType: 'NORMAL',
  isBase: true,
  isUrgent: false,
  isAgePriority: false,
  isPregnantPriority: false,
  priorityReason: null,
  initialPriorityScore: 50,
  appointmentTime: null,
  enqueuedAt: new Date('2026-06-01T08:05:00.000Z'),
  sameDoctorRequired: false,
  visit: {
    id: 'visit-1',
    queueNumber: 'V-001',
    chiefComplaint: 'Sot',
    patient: {
      id: 'patient-1',
      patientCode: 'BN001',
      fullName: 'Nguyen Van A',
      gender: 'MALE',
      age: 32,
      phone: '0900000000',
    },
    appointment: null,
    progress: {
      currentState: 'WAITING_EXAM',
      laneType: 'NORMAL',
      sameDoctorRequired: false,
    },
  },
  targetRoom: createRoom('room-1'),
  targetDoctor: createDoctor('doctor-1'),
  status: {
    status: 'WAITING',
    priorityScore: 50,
    lastScoreUpdated: null,
    calledAt: null,
    servedAt: null,
    dequeuedAt: null,
    isTimeout: false,
  },
  histories: [],
  turns: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TC-Q1..TC-Q7: queue sorting and filtering', () => {
  it('TC-Q1: WAITING luon nam truoc DONE', async () => {
    // Nghiep vu: hang dang cho phai uu tien truoc item da xong.
    prisma.queueItem.findMany.mockResolvedValueOnce([
      createQueueItem({
        id: 'done-item',
        laneType: 'PRIORITY',
        initialPriorityScore: 100,
        enqueuedAt: new Date('2026-06-01T08:01:00.000Z'),
        status: {
          status: 'DONE',
          priorityScore: 100,
          lastScoreUpdated: null,
          calledAt: null,
          servedAt: null,
          dequeuedAt: null,
          isTimeout: false,
        },
      }),
      createQueueItem({
        id: 'waiting-item',
        laneType: 'NORMAL',
        initialPriorityScore: 10,
        enqueuedAt: new Date('2026-06-01T08:02:00.000Z'),
      }),
    ]);

    const result = await getQueueItems({ page: 1, limit: 10, sort: 'desc', status: 'ALL' });

    expect(result.items[0].queueItemId).toBe('waiting-item');
    expect(result.items[1].queueItemId).toBe('done-item');
  });

  it('TC-Q2: trong cung WAITING, PRIORITY nam truoc NORMAL', async () => {
    // Nghiep vu: lane PRIORITY phai duoc xep tren lane NORMAL.
    prisma.queueItem.findMany.mockResolvedValueOnce([
      createQueueItem({
        id: 'normal-item',
        laneType: 'NORMAL',
        initialPriorityScore: 90,
      }),
      createQueueItem({
        id: 'priority-item',
        laneType: 'PRIORITY',
        initialPriorityScore: 50,
      }),
    ]);

    const result = await getQueueItems({ page: 1, limit: 10, sort: 'desc', status: 'ALL' });

    expect(result.items[0].queueItemId).toBe('priority-item');
    expect(result.items[1].queueItemId).toBe('normal-item');
  });

  it('TC-Q3: thu tu lane PRIORITY > APPOINTMENT > AFTER_CLS > NORMAL', async () => {
    // Nghiep vu: thu tu lane phai di theo map uu tien da dinh nghia.
    prisma.queueItem.findMany.mockResolvedValueOnce([
      createQueueItem({ id: 'normal-item', laneType: 'NORMAL', initialPriorityScore: 50 }),
      createQueueItem({ id: 'after-cls-item', laneType: 'AFTER_CLS', initialPriorityScore: 50 }),
      createQueueItem({ id: 'priority-item', laneType: 'PRIORITY', initialPriorityScore: 50 }),
      createQueueItem({ id: 'appointment-item', laneType: 'APPOINTMENT', initialPriorityScore: 50 }),
    ]);

    const result = await getQueueItems({ page: 1, limit: 10, sort: 'desc', status: 'ALL' });

    expect(result.items.map(item => item.queueItemId)).toEqual([
      'priority-item',
      'appointment-item',
      'after-cls-item',
      'normal-item',
    ]);
  });

  it('TC-Q4: trong cung lane, diem cao hon len truoc', async () => {
    // Nghiep vu: neu cung lane thi priorityScore cao hon phai len tren.
    prisma.queueItem.findMany.mockResolvedValueOnce([
      createQueueItem({ id: 'score-80', laneType: 'PRIORITY', initialPriorityScore: 80, status: { status: 'WAITING', priorityScore: 80, lastScoreUpdated: null, calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false } }),
      createQueueItem({ id: 'score-95', laneType: 'PRIORITY', initialPriorityScore: 95, status: { status: 'WAITING', priorityScore: 95, lastScoreUpdated: null, calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false } }),
    ]);

    const result = await getQueueItems({ page: 1, limit: 10, sort: 'desc', status: 'ALL' });

    expect(result.items[0].queueItemId).toBe('score-95');
    expect(result.items[1].queueItemId).toBe('score-80');
  });

  it('TC-Q5: pagination dung voi page=2 limit=2', async () => {
    // Nghiep vu: page 2 limit 2 phai tra dung 2 item trong tong 5 item.
    prisma.queueItem.findMany.mockResolvedValueOnce([
      createQueueItem({ id: 'item-1', laneType: 'PRIORITY', initialPriorityScore: 100 }),
      createQueueItem({ id: 'item-2', laneType: 'PRIORITY', initialPriorityScore: 90 }),
      createQueueItem({ id: 'item-3', laneType: 'PRIORITY', initialPriorityScore: 80 }),
      createQueueItem({ id: 'item-4', laneType: 'PRIORITY', initialPriorityScore: 70 }),
      createQueueItem({ id: 'item-5', laneType: 'PRIORITY', initialPriorityScore: 60 }),
    ]);

    const result = await getQueueItems({ page: 2, limit: 2, sort: 'desc', status: 'ALL' });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  it("TC-Q6: filter status='WAITING' chi lay WAITING items", async () => {
    // Nghiep vu: filter theo trang thai phai truyen dung where.status.
    prisma.queueItem.findMany.mockResolvedValueOnce([
      createQueueItem({ id: 'waiting-item', status: { status: 'WAITING', priorityScore: 50, lastScoreUpdated: null, calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false } }),
    ]);

    await getQueueItems({ page: 1, limit: 10, sort: 'desc', status: 'WAITING' });

    const call = prisma.queueItem.findMany.mock.calls[0][0];
    expect(call.where.status.is.status).toBe('WAITING');
  });

  it('TC-Q7: getQueueItemById voi id khong ton tai phai throw 404', async () => {
    // Nghiep vu: tim queue item khong co phai tra loi 404 ro rang.
    prisma.queueItem.findUnique.mockResolvedValueOnce(null);

    await expect(getQueueItemById('missing-id')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
