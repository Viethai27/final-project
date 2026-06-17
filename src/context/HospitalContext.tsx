import React, { createContext, useContext } from 'react';
import type {
  ActionLog,
  Appointment,
  CLSOrder,
  CLSResult,
  DashboardStats,
  DispatchHistoryEntry,
  Doctor,
  Invoice,
  Patient,
  PatientStatus,
  QueueItem,
  Room,
  Service,
  StatusHistoryEntry,
  Visit,
} from '../types';

interface HospitalContextValue {
  patients: Patient[];
  doctors: Doctor[];
  rooms: Room[];
  services: Service[];
  visits: Visit[];
  queueItems: QueueItem[];
  clsOrders: CLSOrder[];
  clsResults: CLSResult[];
  invoices: Invoice[];
  appointments: Appointment[];
  statusHistory: StatusHistoryEntry[];
  dispatchHistory: DispatchHistoryEntry[];
  dashboardStats: DashboardStats;
  actionLogs: ActionLog[];
  addPatient: (patient: Omit<Patient, 'id' | 'patientCode'>) => Patient;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  createVisit: (patientId: string, data: Partial<Visit>) => Visit;
  updateVisitStatus: (visitId: string, status: PatientStatus, note?: string, performedBy?: string, performedByName?: string) => void;
  dispatchPatient: (visitId: string, toRoomId: string, followedSuggestion: boolean, reason: string, dispatchedBy: string, dispatchedByName: string) => void;
  callPatient: (queueItemId: string, roomId: string) => void;
  completeVisit: (visitId: string, finalDiagnosis: string, conclusion: string, doctorId: string, treatmentPlan?: string, performedByName?: string) => void;
  orderCLS: (visitId: string, patientId: string, patientName: string, orders: Array<{ serviceId: string; serviceName: string; roomId: string; priority: 'URGENT' | 'ROUTINE'; clinicalNote?: string }>, orderedBy: string) => void;
  updateCLSStatus: (orderId: string, status: CLSOrder['status']) => void;
  saveCLSResult: (orderId: string, visitId: string, result: string, isAbnormal: boolean, performedBy: string, note?: string) => void;
  updateDoctorInfo: (visitId: string, data: { chiefComplaint?: string; provisionalDiagnosis?: string; notes?: string; treatmentDirection?: string }) => void;
  cancelVisit: (visitId: string, reason: string, performedBy: string, performedByName: string) => void;
  callQueuePatient: (queueItemId: string, performedBy: string, performedByName: string) => void;
  startPatientService: (visitId: string, queueItemId: string, performedBy: string, performedByName: string) => void;
  markPatientNoShow: (visitId: string, queueItemId: string, performedBy: string, performedByName: string) => void;
  transferWaitingPatient: (visitId: string, queueItemId: string, toRoomId: string, reason: string, performedBy: string, performedByName: string) => void;
  acceptReallocationSuggestion: (visitId: string, queueItemId: string, toRoomId: string, performedBy: string, performedByName: string) => void;
  dismissReallocationSuggestion: (visitId: string, reason: string, performedBy: string, performedByName: string) => void;
}

const noop = () => {};

const emptyVisit = {
  id: '',
  patientId: '',
  patientName: '',
  ticketNumber: '',
  visitDate: '',
  status: 'WAITING_EXAM' as PatientStatus,
  lane: 'NORMAL' as const,
  priorityScore: 0,
  checkInTime: '',
};

const emptyPatient = {
  id: '',
  patientCode: '',
  name: '',
  dateOfBirth: '',
  age: 0,
  gender: 'MALE' as const,
  idNumber: '',
  phone: '',
  address: '',
};

const HospitalContext = createContext<HospitalContextValue | null>(null);

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const value: HospitalContextValue = {
    patients: [],
    doctors: [],
    rooms: [],
    services: [],
    visits: [],
    queueItems: [],
    clsOrders: [],
    clsResults: [],
    invoices: [],
    appointments: [],
    statusHistory: [],
    dispatchHistory: [],
    dashboardStats: {
      totalPatientsToday: 0,
      waitingExam: 0,
      waitingCLS: 0,
      waitingConclusion: 0,
      avgWaitMinutes: 0,
      overloadedRooms: 0,
      roomUtilizationRate: 0,
      dispatchCount: 0,
      completedToday: 0,
      cancelledToday: 0,
    },
    actionLogs: [],
    addPatient: () => emptyPatient as Patient,
    updatePatient: noop,
    createVisit: () => emptyVisit as Visit,
    updateVisitStatus: noop,
    dispatchPatient: noop,
    callPatient: noop,
    completeVisit: noop,
    orderCLS: noop,
    updateCLSStatus: noop,
    saveCLSResult: noop,
    updateDoctorInfo: noop,
    cancelVisit: noop,
    callQueuePatient: noop,
    startPatientService: noop,
    markPatientNoShow: noop,
    transferWaitingPatient: noop,
    acceptReallocationSuggestion: noop,
    dismissReallocationSuggestion: noop,
  };

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospital() {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error('useHospital must be used within HospitalProvider');
  return ctx;
}
