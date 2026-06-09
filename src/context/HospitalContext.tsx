import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  Patient, Doctor, Room, Service, Visit, QueueItem,
  CLSOrder, CLSResult, Invoice, Appointment, StatusHistoryEntry,
  DispatchHistoryEntry, PatientStatus, DashboardStats
} from '../types';
import {
  MOCK_PATIENTS, MOCK_DOCTORS, MOCK_ROOMS, MOCK_SERVICES,
  MOCK_VISITS, MOCK_QUEUE_ITEMS, MOCK_CLS_ORDERS, MOCK_CLS_RESULTS,
  MOCK_INVOICES, MOCK_APPOINTMENTS, MOCK_STATUS_HISTORY,
  MOCK_DISPATCH_HISTORY, MOCK_DASHBOARD_STATS
} from '../data/mockData';

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

  // Actions
  addPatient: (patient: Omit<Patient, 'id' | 'patientCode'>) => Patient;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  createVisit: (patientId: string, data: Partial<Visit>) => Visit;
  updateVisitStatus: (visitId: string, status: PatientStatus, note?: string, performedBy?: string, performedByName?: string) => void;
  dispatchPatient: (visitId: string, toRoomId: string, followedSuggestion: boolean, reason: string, dispatchedBy: string, dispatchedByName: string) => void;
  callPatient: (queueItemId: string, roomId: string) => void;
  completeVisit: (visitId: string, finalDiagnosis: string, conclusion: string, doctorId: string) => void;
  orderCLS: (visitId: string, patientId: string, patientName: string, orders: Array<{ serviceId: string; serviceName: string; roomId: string; priority: 'URGENT' | 'ROUTINE'; clinicalNote?: string }>, orderedBy: string) => void;
  updateCLSStatus: (orderId: string, status: CLSOrder['status']) => void;
  saveCLSResult: (orderId: string, visitId: string, result: string, isAbnormal: boolean, performedBy: string, note?: string) => void;
  updateDoctorInfo: (visitId: string, data: { chiefComplaint?: string; provisionalDiagnosis?: string; notes?: string }) => void;
  cancelVisit: (visitId: string, reason: string, performedBy: string, performedByName: string) => void;
}

const HospitalContext = createContext<HospitalContextValue | null>(null);

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime() {
  return new Date().toTimeString().slice(0, 8);
}

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [doctors] = useState<Doctor[]>(MOCK_DOCTORS);
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);
  const [queueItems, setQueueItems] = useState<QueueItem[]>(MOCK_QUEUE_ITEMS);
  const [clsOrders, setClsOrders] = useState<CLSOrder[]>(MOCK_CLS_ORDERS);
  const [clsResults, setClsResults] = useState<CLSResult[]>(MOCK_CLS_RESULTS);
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [appointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>(MOCK_STATUS_HISTORY);
  const [dispatchHistory, setDispatchHistory] = useState<DispatchHistoryEntry[]>(MOCK_DISPATCH_HISTORY);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(MOCK_DASHBOARD_STATS);

  const addPatient = useCallback((data: Omit<Patient, 'id' | 'patientCode'>) => {
    const id = generateId('p');
    const patientCode = `BN${String(patients.length + 1).padStart(3, '0')}`;
    const newPatient: Patient = { id, patientCode, ...data };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  }, [patients.length]);

  const updatePatient = useCallback((id: string, data: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const createVisit = useCallback((patientId: string, data: Partial<Visit>) => {
    const patient = patients.find(p => p.id === patientId);
    const visitCount = visits.length + 1;
    const lanePrefix = data.lane === 'APPOINTMENT' ? 'A' : data.lane === 'PRIORITY' ? 'P' : 'N';
    const ticketNumber = `${lanePrefix}${String(visitCount).padStart(3, '0')}`;
    const newVisit: Visit = {
      id: generateId('v'),
      patientId,
      patientName: patient?.name ?? '',
      ticketNumber,
      visitDate: new Date().toISOString().slice(0, 10),
      status: 'WAITING_EXAM',
      lane: data.lane ?? 'NORMAL',
      priorityScore: data.priorityScore ?? 50,
      checkInTime: formatTime(),
      ...data,
    };
    setVisits(prev => [...prev, newVisit]);
    // Add to queue
    const newQueueItem: QueueItem = {
      id: generateId('q'),
      visitId: newVisit.id,
      patientId,
      patientName: patient?.name ?? '',
      patientAge: patient?.age ?? 0,
      patientGender: patient?.gender ?? 'MALE',
      ticketNumber,
      lane: newVisit.lane,
      priorityScore: newVisit.priorityScore,
      priorityReason: data.priorityReason,
      status: 'WAITING_EXAM',
      targetRoomId: data.roomId ?? '',
      targetDoctorId: data.doctorId,
      queuedAt: formatTime(),
      estimatedWaitMinutes: 30,
    };
    setQueueItems(prev => [...prev, newQueueItem]);
    setDashboardStats(prev => ({ ...prev, totalPatientsToday: prev.totalPatientsToday + 1, waitingExam: prev.waitingExam + 1, dispatchCount: prev.dispatchCount + 1 }));
    return newVisit;
  }, [patients, visits.length]);

  const updateVisitStatus = useCallback((visitId: string, status: PatientStatus, note?: string, performedBy = 'system', performedByName = 'Hệ thống') => {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status } : v));
    setQueueItems(prev => prev.map(q => q.visitId === visitId ? { ...q, status } : q));
    setStatusHistory(prev => [...prev, {
      id: generateId('sh'),
      visitId,
      toStatus: status,
      timestamp: formatTime(),
      performedBy,
      performedByName,
      note,
    }]);
  }, []);

  const dispatchPatient = useCallback((visitId: string, toRoomId: string, followedSuggestion: boolean, reason: string, dispatchedBy: string, dispatchedByName: string) => {
    const visit = visits.find(v => v.id === visitId);
    const toRoom = rooms.find(r => r.id === toRoomId);
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, roomId: toRoomId } : v));
    setQueueItems(prev => prev.map(q => q.visitId === visitId ? { ...q, targetRoomId: toRoomId } : q));
    if (toRoom) {
      setRooms(prev => prev.map(r => r.id === toRoomId ? { ...r, currentWaiting: r.currentWaiting + 1 } : r));
    }
    setDispatchHistory(prev => [...prev, {
      id: generateId('dh'),
      visitId,
      patientId: visit?.patientId ?? '',
      patientName: visit?.patientName ?? '',
      fromRoomId: visit?.roomId,
      toRoomId,
      toRoomName: toRoom?.name ?? '',
      followedSuggestion,
      reason,
      dispatchedBy,
      dispatchedByName,
      dispatchedAt: formatTime(),
    }]);
    setDashboardStats(prev => ({ ...prev, dispatchCount: prev.dispatchCount + 1 }));
  }, [visits, rooms]);

  const callPatient = useCallback((queueItemId: string, _roomId: string) => {
    setQueueItems(prev => prev.map(q => q.id === queueItemId ? { ...q, calledAt: formatTime() } : q));
  }, []);

  const completeVisit = useCallback((visitId: string, finalDiagnosis: string, conclusion: string, doctorId: string) => {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, finalDiagnosis, conclusion, status: 'WAITING_PAYMENT', doctorId, completionTime: formatTime() } : v));
    setQueueItems(prev => prev.map(q => q.visitId === visitId ? { ...q, status: 'WAITING_PAYMENT' } : q));
  }, []);

  const orderCLS = useCallback((visitId: string, patientId: string, patientName: string, orders: Array<{ serviceId: string; serviceName: string; roomId: string; priority: 'URGENT' | 'ROUTINE'; clinicalNote?: string }>, orderedBy: string) => {
    const newOrders: CLSOrder[] = orders.map(o => ({
      id: generateId('cls'),
      visitId,
      patientId,
      patientName,
      serviceId: o.serviceId,
      serviceName: o.serviceName,
      roomId: o.roomId,
      priority: o.priority,
      status: 'PENDING' as const,
      orderedBy,
      orderedAt: formatTime(),
      clinicalNote: o.clinicalNote,
    }));
    setClsOrders(prev => [...prev, ...newOrders]);
    setVisits(prev => prev.map(v => v.id === visitId ? {
      ...v,
      status: 'WAITING_CLS',
      clsOrders: [...(v.clsOrders ?? []), ...newOrders.map(o => o.id)],
    } : v));
    updateVisitStatus(visitId, 'WAITING_CLS', 'Chỉ định CLS', orderedBy);
    setDashboardStats(prev => ({ ...prev, waitingCLS: prev.waitingCLS + 1 }));
  }, [updateVisitStatus]);

  const updateCLSStatus = useCallback((orderId: string, status: CLSOrder['status']) => {
    setClsOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }, []);

  const saveCLSResult = useCallback((orderId: string, visitId: string, result: string, isAbnormal: boolean, performedBy: string, note?: string) => {
    const newResult: CLSResult = {
      id: generateId('res'),
      orderId,
      visitId,
      result,
      isAbnormal,
      performedBy,
      performedAt: formatTime(),
      note,
    };
    setClsResults(prev => [...prev, newResult]);
    setClsOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED', completedAt: formatTime(), resultId: newResult.id } : o));
    // Check if all CLS for this visit are done
    const visitOrders = clsOrders.filter(o => o.visitId === visitId && o.id !== orderId);
    const allDone = visitOrders.every(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');
    if (allDone) {
      setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: 'WAITING_CONCLUSION' } : v));
      setQueueItems(prev => prev.map(q => q.visitId === visitId ? { ...q, status: 'WAITING_CONCLUSION', lane: 'AFTER_CLS' } : q));
    }
  }, [clsOrders]);

  const updateDoctorInfo = useCallback((visitId: string, data: { chiefComplaint?: string; provisionalDiagnosis?: string; notes?: string }) => {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, ...data } : v));
  }, []);

  const cancelVisit = useCallback((visitId: string, _reason: string, performedBy: string, performedByName: string) => {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: 'CANCELLED' } : v));
    setQueueItems(prev => prev.filter(q => q.visitId !== visitId));
    setStatusHistory(prev => [...prev, {
      id: generateId('sh'),
      visitId,
      toStatus: 'CANCELLED',
      timestamp: formatTime(),
      performedBy,
      performedByName,
      note: _reason,
    }]);
  }, []);

  return (
    <HospitalContext.Provider value={{
      patients, doctors, rooms, services, visits, queueItems,
      clsOrders, clsResults, invoices, appointments,
      statusHistory, dispatchHistory, dashboardStats,
      addPatient, updatePatient, createVisit, updateVisitStatus,
      dispatchPatient, callPatient, completeVisit, orderCLS,
      updateCLSStatus, saveCLSResult, updateDoctorInfo, cancelVisit,
    }}>
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error('useHospital must be used within HospitalProvider');
  return ctx;
}
