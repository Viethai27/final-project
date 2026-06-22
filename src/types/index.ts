// ===== USER & AUTH =====
export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'COORDINATOR' | 'DOCTOR' | 'LAB_STAFF' | 'MANAGER';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  department?: string;
  departmentId?: string | null;
  doctorProfileId?: string | null;
  roomId?: string;
  isActive?: boolean;
  avatar?: string;
}

// ===== PATIENT =====
export type PriorityReason =
  | 'CHILD_UNDER_6'
  | 'PREGNANT'
  | 'DISABLED'
  | 'HEAVY_DISABLED'
  | 'ELDERLY_75PLUS'
  | 'VETERAN'
  | 'REVOLUTIONARY_CONTRIBUTOR'
  | 'AFTER_CLS'
  | 'APPOINTMENT'
  | 'OTHER'
  | 'EMERGENCY';

export interface Patient {
  id: string;
  patientCode: string;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  idNumber: string;
  phone: string;
  address: string;
  insurance?: string;
  email?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  priorityReason?: PriorityReason;
}

// ===== VISIT & STATUS =====
export type PatientStatus =
  | 'WAITING_EXAM'
  | 'IN_EXAM'
  | 'WAITING_CLS'
  | 'IN_CLS'
  | 'WAITING_RESULT'
  | 'WAITING_CONCLUSION'
  | 'IN_CONCLUSION'
  | 'WAITING_PAYMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type QueueLane = 'APPOINTMENT' | 'PRIORITY' | 'NORMAL' | 'AFTER_CLS';

export interface Visit {
  id: string;
  patientId: string;
  patientName: string;
  ticketNumber: string;
  visitDate: string;
  status: PatientStatus;
  lane: QueueLane;
  priorityReason?: PriorityReason;
  priorityScore: number;
  chiefComplaint?: string;
  provisionalDiagnosis?: string;
  finalDiagnosis?: string;
  conclusion?: string;
  doctorId?: string;
  roomId?: string;
  clsOrders?: string[];
  totalAmount?: number;
  checkInTime: string;
  completionTime?: string;
  appointmentId?: string;
  notes?: string;
  treatmentDirection?: string;
  treatmentPlan?: string;
}

// ===== QUEUE =====
export interface QueueItem {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'MALE' | 'FEMALE';
  ticketNumber: string;
  lane: QueueLane;
  priorityScore: number;
  priorityReason?: PriorityReason;
  status: PatientStatus;
  targetRoomId: string;
  targetDoctorId?: string;
  queuedAt: string;
  estimatedWaitMinutes: number;
  calledAt?: string;
  servedAt?: string;
  noShowCount?: number;
  mustReturnToDoctor?: boolean;
  chiefComplaint?: string;
}

// ===== ACTION LOG =====
export type ActionType =
  | 'CALL_PATIENT'
  | 'START_SERVICE'
  | 'NO_SHOW'
  | 'TRANSFER_ROOM'
  | 'ACCEPT_REALLOCATION'
  | 'DISMISS_REALLOCATION'
  | 'CANCEL_VISIT';

export interface ActionLog {
  id: string;
  actionType: ActionType;
  visitId: string;
  patientId: string;
  patientName: string;
  fromStatus?: PatientStatus;
  toStatus?: PatientStatus;
  fromRoomId?: string;
  toRoomId?: string;
  reason?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

// ===== ROOM =====
export type RoomType = 'EXAM' | 'LAB' | 'IMAGING';
export type RoomLoadLevel = 'NORMAL' | 'WARNING' | 'OVERLOAD';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  department: string;
  floor: string;
  doctorId?: string;
  capacity: number;
  currentWaiting: number;
  currentServing: number;
  avgServiceMinutes: number;
  avgWaitMinutes: number;
  loadLevel: RoomLoadLevel;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  utilizationRate: number;
  suggestionScore?: number;
}

// ===== DOCTOR =====
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  roomId: string;
  status: 'AVAILABLE' | 'BUSY' | 'BREAK' | 'OFFLINE';
  qualifications: string;
}

// ===== SERVICE =====
export interface Service {
  id: string;
  name: string;
  code: string;
  type: 'EXAM' | 'LAB' | 'IMAGING' | 'PROCEDURE';
  department: string;
  price: number;
  durationMinutes: number;
  roomIds: string[];
}

// ===== CLS ORDERS =====
export type CLSPriority = 'URGENT' | 'ROUTINE';
export type CLSStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CLSOrder {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  serviceId: string;
  serviceName: string;
  roomId: string;
  priority: CLSPriority;
  status: CLSStatus;
  orderedBy: string;
  orderedAt: string;
  clinicalNote?: string;
  completedAt?: string;
  resultId?: string;
}

export interface CLSResult {
  id: string;
  orderId: string;
  visitId: string;
  result: string;
  isAbnormal: boolean;
  performedBy: string;
  performedAt: string;
  note?: string;
  attachments?: string[];
}

// ===== INVOICE =====
export interface InvoiceItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  createdAt: string;
  paidAt?: string;
}

// ===== APPOINTMENT =====
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  roomId: string;
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'LATE' | 'NO_SHOW' | 'CANCELLED';
  note?: string;
}

// ===== HISTORY =====
export interface StatusHistoryEntry {
  id: string;
  visitId: string;
  fromStatus?: PatientStatus;
  toStatus: PatientStatus;
  timestamp: string;
  performedBy: string;
  performedByName: string;
  note?: string;
}

export interface DispatchHistoryEntry {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  fromRoomId?: string;
  toRoomId: string;
  toRoomName: string;
  followedSuggestion: boolean;
  reason: string;
  dispatchedBy: string;
  dispatchedByName: string;
  dispatchedAt: string;
}

export interface RoomSnapshot {
  id: string;
  roomId: string;
  roomName: string;
  timestamp: string;
  waitingCount: number;
  servingCount: number;
  loadLevel: RoomLoadLevel;
  avgWaitMinutes: number;
}

// ===== DASHBOARD =====
export interface DashboardStats {
  totalPatientsToday: number;
  waitingExam: number;
  waitingCLS: number;
  waitingConclusion: number;
  avgWaitMinutes: number;
  overloadedRooms: number;
  roomUtilizationRate: number;
  dispatchCount: number;
  completedToday: number;
  cancelledToday: number;
}

// ===== REPORT FILTER =====
export interface ReportFilter {
  dateFrom: string;
  dateTo: string;
  department?: string;
  roomId?: string;
  doctorId?: string;
  serviceType?: string;
}
