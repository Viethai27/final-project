import type { AppointmentAvailableSlotDto, QueueItemSummaryDto } from '../services/backend-types';

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_SLOT_RANGES = [
  ['08:00', '08:30'],
  ['08:30', '09:00'],
  ['09:00', '09:30'],
  ['09:30', '10:00'],
  ['13:30', '14:00'],
  ['14:00', '14:30'],
] as const;

export const createDemoAppointmentSlots = (doctorId: string): AppointmentAvailableSlotDto[] =>
  DEMO_SLOT_RANGES.map(([startTime, endTime], index) => ({
    startTime,
    endTime,
    available: true,
    doctorId,
    roomId: `demo-room-${index + 1}`,
    scheduleId: `demo-schedule-${index + 1}`,
  }));

type ReceptionQueueItem = Pick<
  QueueItemSummaryDto,
  'queueItemId' | 'queueNumber' | 'patient' | 'room' | 'visit' | 'currentStatus' | 'priority'
>;

const createDemoQueueItem = (
  queueNumber: string,
  fullName: string,
  laneType: QueueItemSummaryDto['priority']['laneType'],
  currentStatus: string,
): ReceptionQueueItem => ({
  queueItemId: `demo-queue-${queueNumber}`,
  queueNumber,
  patient: {
    id: `demo-patient-${queueNumber}`,
    patientCode: `BN-${queueNumber}`,
    fullName,
    gender: 'OTHER',
    age: 0,
    phone: '',
  },
  room: null,
  visit: {
    visitId: `demo-visit-${queueNumber}`,
    queueNumber,
    currentState: currentStatus === 'CALLED' ? 'Đã gọi' : 'Đang chờ',
    progress: null,
    appointment: null,
  },
  currentStatus,
  priority: {
    queueType: 'EXAM',
    laneType,
    priorityReason: laneType === 'PRIORITY' ? 'OTHER' : laneType === 'APPOINTMENT' ? 'APPOINTMENT' : laneType === 'AFTER_CLS' ? 'AFTER_CLS' : null,
    initialPriorityScore: 0,
    isBase: laneType === 'NORMAL',
    isUrgent: false,
    isAgePriority: false,
    isPregnantPriority: false,
    sameDoctorRequired: laneType === 'AFTER_CLS',
  },
});

// Display-only fallback. These records are never sent to create/update APIs.
export const RECEPTION_DEMO_QUEUE: ReceptionQueueItem[] = [
  createDemoQueueItem('A001', 'Nguyễn Văn An', 'NORMAL', 'WAITING'),
  createDemoQueueItem('A002', 'Trần Thị Bình', 'PRIORITY', 'WAITING'),
  createDemoQueueItem('A003', 'Lê Minh Châu', 'APPOINTMENT', 'CALLED'),
  createDemoQueueItem('A004', 'Phạm Hoàng Dũng', 'NORMAL', 'WAITING'),
  createDemoQueueItem('A005', 'Hoàng Thu Hà', 'AFTER_CLS', 'WAITING'),
];

export type { ReceptionQueueItem };
