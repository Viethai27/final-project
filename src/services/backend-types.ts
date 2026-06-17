export type ApiSuccess<T> = {
  success: true;
  data: T;
  pagination?: ApiPagination;
};

export type ApiFailure = {
  success: false;
  message: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date?: string;
  departmentId?: string;
  orderBy?: string;
  sort?: 'asc' | 'desc';
}

export type AuthUserRole = 'ADMIN' | 'RECEPTIONIST' | 'COORDINATOR' | 'DOCTOR' | 'LAB_STAFF' | 'MANAGER';

export interface AuthUserDto {
  id: string;
  username: string;
  name: string;
  fullName: string;
  email?: string | null;
  role: AuthUserRole;
  department?: string | null;
  departmentId?: string | null;
  departmentCode?: string | null;
  doctorProfileId?: string | null;
  roomId?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
}

export interface AuthLoginResultDto {
  token: string;
  expiresIn: number;
  user: AuthUserDto;
}

export interface AuthMeResultDto {
  user: AuthUserDto;
}

export interface DepartmentDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
}

export interface RoomDto {
  id: string;
  name: string;
  code: string;
  roomType: 'EXAM' | 'LAB' | 'IMAGING' | 'OTHER';
  capacity?: number | null;
  avgServiceTime?: number | null;
  isActive?: boolean;
  department: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ServiceDto {
  id: string;
  name: string;
  code: string;
  serviceType: 'EXAM' | 'LAB' | 'IMAGING' | 'OTHER';
  roomTypeRequired?: 'EXAM' | 'LAB' | 'IMAGING' | 'OTHER' | null;
  avgDuration?: number | null;
  isActive?: boolean;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  roomIds?: string[];
}

export interface DoctorDto {
  id: string;
  name: string;
  specialty?: string | null;
  licenseNumber?: string | null;
  defaultRoomId?: string | null;
  isActive?: boolean;
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  defaultRoom?: RoomDto | null;
}

export interface PatientDto {
  id: string;
  patientCode: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  phone: string;
  idNumber?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  insuranceNumber?: string | null;
  isDisabled?: boolean;
  isDisabledHeavy?: boolean;
  isRevolutionary?: boolean;
}

export interface DashboardOverviewDto {
  totalPatients: number;
  totalDoctors: number;
  totalVisits: number;
  waitingPatients: number;
  activeQueues: number;
  completedVisits: number;
}

export interface VisitProgressDto {
  currentState: string;
  laneType: 'APPOINTMENT' | 'AFTER_CLS' | 'PRIORITY' | 'NORMAL';
  sameDoctorRequired: boolean;
}

export interface AppointmentSummaryDto {
  appointmentId: string;
  appointmentTime: string;
  status: string;
  note?: string | null;
  doctor?: DoctorDto | null;
  room?: RoomDto | null;
  service?: ServiceDto | null;
  schedule?: {
    id: string;
    workDate: string;
    shift: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface VisitListItemDto {
  visitId: string;
  queueNumber: string;
  patient: PatientDto;
  doctor: DoctorDto | null;
  department: DepartmentDto | null;
  room: RoomDto | null;
  currentState: string;
  progress: VisitProgressDto | null;
  appointment: AppointmentSummaryDto | null;
  createdAt: string;
  receivedAt: string | null;
  expectedFinishTime: string | null;
  isUrgent: boolean;
  isPregnantAtVisit: boolean;
  priorityReason: string | null;
  chiefComplaint?: string | null;
}

export interface VisitHistoryDto {
  id: string;
  fromState: string | null;
  toState: string;
  triggerEvent: string;
  transitionedAt: string;
  durationInState?: number | null;
  note?: string | null;
  triggeredBy?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;
}

export interface VisitClinicalDto {
  visitClinicalId: string;
  provisionalDiagnosis?: string | null;
  finalDiagnosis?: string | null;
  conclusion?: string | null;
  treatmentPlan?: string | null;
  clinicalNotes?: string | null;
  cancelReason?: string | null;
  examStartAt?: string | null;
  clsStartAt?: string | null;
  clsDoneAt?: string | null;
  conclusionStartAt?: string | null;
  completedAt?: string | null;
  canceledAt?: string | null;
  totalWaitMinutes?: number | null;
  totalVisitMinutes?: number | null;
}

export interface VisitAssignmentDto {
  visitAssignmentId: string;
  isCurrent: boolean;
  assignmentReason?: string | null;
  createdAt: string;
  doctor?: DoctorDto | null;
  room?: RoomDto | null;
  assignedBy?: {
    id: string;
    username: string;
    fullName: string;
  } | null;
}

export interface QueueStatusDto {
  currentStatus: string;
  priorityScore: number;
  lastScoreUpdated: string | null;
  calledAt: string | null;
  servedAt: string | null;
  dequeuedAt: string | null;
  isTimeout: boolean;
}

export interface QueueHistoryDto {
  queueItemHistoryId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  fromScore: number | null;
  toScore: number | null;
  eventTime: string;
  triggeredBy: string;
  note?: string | null;
  triggeredByUser?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;
}

export interface QueueItemSummaryDto {
  queueItemId: string;
  queueNumber: string;
  patient: PatientDto;
  visit: {
    visitId: string;
    queueNumber: string;
    chiefComplaint?: string | null;
    currentState: string;
    progress: VisitProgressDto | null;
    appointment: AppointmentSummaryDto | null;
  };
  room: RoomDto | null;
  doctor: DoctorDto | null;
  service: ServiceDto | null;
  status: QueueStatusDto;
  currentStatus: string;
  priority: {
    queueType: 'EXAM' | 'CLS' | 'CONCLUSION' | 'PAYMENT';
    laneType: 'APPOINTMENT' | 'AFTER_CLS' | 'PRIORITY' | 'NORMAL';
    priorityReason: string | null;
    initialPriorityScore: number;
    isBase: boolean;
    isUrgent: boolean;
    isAgePriority: boolean;
    isPregnantPriority: boolean;
    sameDoctorRequired: boolean;
  };
  waitingTimeMinutes: number;
  createdAt: string;
  enqueuedAt: string;
  calledAt: string | null;
  startedAt: string | null;
  histories: QueueHistoryDto[];
  turns: TurnSummaryDto[];
}

export interface TurnProgressDto {
  turnProgressId: string;
  status: string;
  calledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  timeoutAt: string | null;
  durationMinutes: number | null;
  note?: string | null;
  updatedAt?: string | null;
  updatedBy?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;
}

export interface TurnQueueItemDto {
  queueItemId: string;
  queueType: 'EXAM' | 'CLS' | 'CONCLUSION' | 'PAYMENT';
  laneType: 'APPOINTMENT' | 'AFTER_CLS' | 'PRIORITY' | 'NORMAL';
  priorityReason: string | null;
  initialPriorityScore: number;
  enqueuedAt: string;
  sameDoctorRequired: boolean;
  targetRoom: RoomDto | null;
  targetDoctor: DoctorDto | null;
  status: {
    currentStatus: string;
    priorityScore: number;
    lastScoreUpdated: string | null;
    calledAt: string | null;
    servedAt: string | null;
    dequeuedAt: string | null;
    isTimeout: boolean;
  } | null;
}

export interface TurnSummaryDto {
  turnId: string;
  visitId: string;
  roomId: string;
  doctorId?: string | null;
  queueItemId?: string | null;
  turnType: string;
  serviceId?: string | null;
  timeoutThreshold?: number | null;
  createdAt: string;
  updatedAt: string;
  visit: {
    visitId: string;
    queueNumber: string;
    currentState: string;
    patient: PatientDto;
    appointment: AppointmentSummaryDto | null;
  };
  room: RoomDto | null;
  doctor: DoctorDto | null;
  queueItem: TurnQueueItemDto | null;
  service: ServiceDto | null;
  progress: TurnProgressDto | null;
}

export interface TurnDetailDto extends Omit<TurnSummaryDto, 'visit'> {
  visit: {
    visitId: string;
    queueNumber: string;
    currentState: string;
    patient: PatientDto;
    appointment: AppointmentSummaryDto | null;
    clinical?: VisitClinicalDto | null;
    invoice?: {
      id: string;
      status: string;
      totalAmount: number;
      paidAmount: number;
      paidAt: string | null;
      items?: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        service: ServiceDto | null;
      }>;
    } | null;
  };
}

export interface CLSResultSummaryDto {
  clsResultId: string;
  clsOrderId: string;
  resultDate: string | null;
  resultFileUrl: string | null;
  resultText: string | null;
  resultAt: string | null;
  resultById: string | null;
  isAbnormal: boolean;
  note: string | null;
  clsOrder: {
    clsOrderId: string;
    status: string;
    priority: string;
    orderedAt: string;
    visit: VisitListItemDto;
    service: ServiceDto | null;
    room: RoomDto | null;
    orderedBy: DoctorDto | null;
  };
  resultBy: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;
}

export interface CLSOrderSummaryDto {
  clsOrderId: string;
  visitId: string;
  orderedById: string;
  serviceId: string;
  roomId: string | null;
  priority: 'ROUTINE' | 'URGENT';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  orderedAt: string;
  completedAt: string | null;
  clinicalNote: string | null;
  note: string | null;
  visit: VisitListItemDto;
  orderedBy: DoctorDto | null;
  service: ServiceDto | null;
  room: RoomDto | null;
  result: CLSResultSummaryDto | null;
}

export interface CLSOrderCreateInputDto {
  visitId: string;
  orderedById: string;
  serviceId: string;
  roomId?: string | null;
  priority: 'ROUTINE' | 'URGENT';
  clinicalNote?: string | null;
  note?: string | null;
  updatedById?: string | null;
}

export interface VisitConclusionInputDto {
  finalDiagnosis: string;
  conclusion: string;
  treatmentPlan?: string | null;
  updatedById?: string | null;
  note?: string | null;
}

export interface InvoiceSummaryDto {
  invoiceId: string;
  visitId: string;
  totalAmount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED';
  paymentMethod?: string | null;
  createdAt: string;
  paidAt?: string | null;
  visit: {
    visitId: string;
    queueNumber: string | null;
    currentState: string | null;
    patient: {
      id: string;
      patientCode: string;
      fullName: string;
      phone?: string | null;
    };
  };
  items: Array<{
    invoiceItemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    service: ServiceDto | null;
  }>;
}

export interface CLSOrderDetailDto extends CLSOrderSummaryDto {
  visit: VisitDetailForActionDto;
}

export interface DispatchSuggestionCandidateDto {
  room: RoomDto | null;
  doctor: DoctorDto | null;
  service: ServiceDto | null;
  resourceScore: number;
  queueLength: number;
  utilizationRate: number;
  estimatedWaitMinutes: number;
  alertLevel: 'NORMAL' | 'WARNING' | 'OVERLOAD';
  reason: string;
  wasSelected: boolean;
  rank: number;
}

export interface DispatchSuggestionDto {
  visit: VisitListItemDto;
  stage: string;
  queueItem: {
    queueItemId: string;
    queueType: string;
    laneType: string;
    priorityReason: string | null;
    initialPriorityScore: number;
    enqueuedAt: string;
    sameDoctorRequired: boolean;
  } | null;
  candidates: DispatchSuggestionCandidateDto[];
}

export interface DispatchRecommendationDto {
  dispatchRecommendationId: string;
  rank: number;
  roomId: string;
  room: RoomDto | null;
  resourceScore: number | null;
  queueLength: number | null;
  utilizationRate: number | null;
  estimatedWaitMinutes: number | null;
  alertLevel: 'NORMAL' | 'WARNING' | 'OVERLOAD' | null;
  reason: string | null;
  wasSelected: boolean;
}

export interface DispatchOutcomeDto {
  dispatchOutcomeId: string;
  serviceId: string | null;
  followedRecommendation: boolean | null;
  actualWaitMinutes: number | null;
  recommendedWaitEstimate: number | null;
  waitDifference: number | null;
  deviationNote: string | null;
  deviationReason: string | null;
}

export interface DispatchDecisionSummaryDto {
  dispatchDecisionId: string;
  visitId: string;
  queueItemId: string | null;
  decisionById: string | null;
  decisionTime: string;
  decisionType: string;
  outcomeRoomId: string | null;
  outcomeDoctorId: string | null;
  note: string | null;
  visit: VisitListItemDto;
  queueItem: {
    queueItemId: string;
    queueType: string;
    laneType: string;
  } | null;
  decisionBy: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;
  outcomeRoom: RoomDto | null;
  outcomeDoctor: DoctorDto | null;
  recommendations: DispatchRecommendationDto[];
  outcome: DispatchOutcomeDto | null;
}

export interface DispatchDecisionCreateInput {
  visitId: string;
  queueItemId?: string | null;
  decisionById?: string | null;
  decisionType?: 'SYSTEM_SUGGESTED' | 'MANUAL' | 'OVERRIDE';
  outcomeRoomId?: string | null;
  outcomeDoctorId?: string | null;
  serviceId?: string | null;
  note?: string | null;
  recommendations?: Array<{
    rank: number;
    roomId: string;
    resourceScore?: number | null;
    queueLength?: number | null;
    utilizationRate?: number | null;
    estimatedWaitMinutes?: number | null;
    alertLevel?: 'NORMAL' | 'WARNING' | 'OVERLOAD' | null;
    reason?: string | null;
    wasSelected?: boolean | null;
  }>;
  outcome?: {
    serviceId?: string | null;
    followedRecommendation?: boolean | null;
    actualWaitMinutes?: number | null;
    recommendedWaitEstimate?: number | null;
    waitDifference?: number | null;
    deviationNote?: string | null;
    deviationReason?: string | null;
  };
}

export interface AppointmentBookingInputDto {
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string | null;
  phone: string;
  idNumber?: string | null;
  address?: string | null;
  insuranceNumber?: string | null;
  departmentId?: string | null;
  serviceId: string;
  roomId?: string | null;
  doctorId?: string | null;
  appointmentTime: string;
  chiefComplaint?: string | null;
  note?: string | null;
  isPregnant?: boolean;
  isUrgent?: boolean;
  isDisabled?: boolean;
  isDisabledHeavy?: boolean;
  isRevolutionary?: boolean;
}

export interface AppointmentBookingResultDto {
  patient: PatientDto;
  appointment: AppointmentSummaryDto;
}

export interface AppointmentListItemDto extends AppointmentSummaryDto {
  createdAt: string;
  updatedAt: string;
  patient: PatientDto;
  visit?: {
    visitId: string;
    queueNumber: string | null;
    checkedInAt: string | null;
    progress: VisitProgressDto | null;
  } | null;
}

export interface AppointmentCheckInResultDto {
  patient: PatientDto;
  appointment: AppointmentSummaryDto;
  visit: {
    visitId: string;
    queueNumber: string | null;
  };
  queueItem: {
    queueItemId: string;
    queueNumber: string | null;
  };
}

export interface PatientCreateInputDto {
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string | null;
  phone: string;
  idNumber?: string | null;
  address?: string | null;
  insuranceNumber?: string | null;
  isDisabled?: boolean;
  isDisabledHeavy?: boolean;
  isRevolutionary?: boolean;
}

export interface WalkInRegistrationInputDto extends PatientCreateInputDto {
  departmentId: string;
  serviceId: string;
  doctorId?: string | null;
  chiefComplaint?: string | null;
  note?: string | null;
  isPregnant?: boolean;
  isUrgent?: boolean;
  updatedById?: string | null;
}

export interface VisitDetailForActionDto extends VisitListItemDto {
  stateHistories: VisitHistoryDto[];
  clinical: VisitClinicalDto | null;
  assignments: VisitAssignmentDto[];
  queueItems: QueueItemSummaryDto[];
  turns: TurnSummaryDto[];
  clsOrders: CLSOrderSummaryDto[];
  escalationLogs?: Array<{
    id: string;
    reason?: string | null;
    createdAt: string;
  }>;
  invoice?: {
    id: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    paidAt: string | null;
    items?: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      service: ServiceDto | null;
    }>;
  } | null;
}
