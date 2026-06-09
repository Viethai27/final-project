import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ChevronDown,
  Eye,
  FileSearch,
  FlaskConical,
  History,
  KeyRound,
  ListOrdered,
  Lock,
  Mail,
  Phone,
  PlayCircle,
  Search,
  Settings,
  Shield,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

interface DoctorWorkspaceProps {
  roomId: string;
  doctorId: string;
}

type DoctorView = 'overview' | 'queue' | 'patients' | 'results' | 'schedule' | 'reports' | 'account';
type DoctorStatus = 'Chờ khám' | 'Đang khám' | 'Chờ CLS' | 'Đang thực hiện CLS' | 'Chờ kết quả' | 'Chờ kết luận' | 'Hoàn tất';

interface PatientQueueItem {
  stt: string;
  code: string;
  name: string;
  age: number;
  gender: 'Nam' | 'Nữ';
  phone: string;
  reason: string;
  status: DoctorStatus;
  priority?: boolean;
  waitTime: string;
  lastVisit: string;
  address: string;
  note: string;
}

interface ResultItem {
  code: string;
  name: string;
  type: string;
  room: string;
  orderedAt: string;
  status: 'Chờ thực hiện' | 'Đang thực hiện' | 'Chờ kết quả' | 'Đã có kết quả' | 'Đã đọc';
  summary: string;
}

type WaitingVisitStatus = 'WAITING_EXAM' | 'WAITING_CONCLUSION';
type ActiveVisitStatus = 'IN_EXAM' | 'IN_CONCLUSION';
type PostExamStatus = 'WAITING_CLS';
type ExamDirection = 'ORDER_CLS' | 'CONCLUDE_NOW' | 'TRANSFER';
type CLSOrderPriority = 'ROUTINE' | 'URGENT';
type PriorityBreakdown = {
  Sbase: number;
  Swait: number;
  Sage: number;
  Scls: number;
};

interface WaitingVisit {
  id: string;
  patientId?: string;
  patientCode?: string;
  patientName: string;
  fullName: string;
  patientAge: number;
  dateOfBirth?: string;
  gender?: string;
  idNumber?: string;
  ticketNumber: string;
  lane: 'APPOINTMENT' | 'AFTER_CLS' | 'PRIORITY' | 'NORMAL';
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
  waitMinutes: number;
  queuedAt?: string;
  chiefComplaint?: string;
  isUrgent: boolean;
  examStartAt?: string;
  diagnosis?: string;
  examNotes?: string;
  status: WaitingVisitStatus | ActiveVisitStatus | PostExamStatus;
}

interface CLSResultItem {
  id: string;
  serviceName: string;
  resultNote: string;
  isAbnormal: boolean;
  resultFileUrl?: string;
}

interface ExamDraft {
  diagnosis: string;
  examNotes: string;
  direction: ExamDirection;
}

interface CLSService {
  id: string;
  name: string;
  serviceType: string;
  avgDuration: number;
  isUrgentCls: boolean;
}

interface RoomSuggestion {
  roomId: string;
  roomName: string;
  queueLength: number;
  ewtMinutes: number;
  utilizationRate: number;
  isRecommended: boolean;
}

interface CLSOrderLineDraft {
  priority: CLSOrderPriority;
  note: string;
  roomId?: string;
}

interface DoctorSessionStats {
  completedToday: number;
  waitingCount: number;
  avgExamMinutes: number;
  shiftLabel: string;
  roomName: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface VisitHistoryCLSOrder {
  id: string;
  serviceName: string;
  isAbnormal: boolean;
  note: string;
}

interface VisitHistoryTransition {
  id: string;
  fromState?: string;
  toState: string;
  triggeredAt: string;
  triggeredBy: string;
}

interface PatientVisitHistoryItem {
  id: string;
  visitDate: string;
  doctorName: string;
  departmentName: string;
  chiefComplaint: string;
  diagnosis: string;
  clsCount: number;
  abnormalCount: number;
  status: 'COMPLETED' | 'CANCELLED' | string;
  clsOrders: VisitHistoryCLSOrder[];
  stateHistory: VisitHistoryTransition[];
}

const DEFAULT_EXAM_DRAFT: ExamDraft = {
  diagnosis: '',
  examNotes: '',
  direction: 'CONCLUDE_NOW',
};

const EXAM_DIRECTIONS: Array<{ value: ExamDirection; label: string }> = [
  { value: 'ORDER_CLS', label: 'Chỉ định CLS' },
  { value: 'CONCLUDE_NOW', label: 'Kết luận ngay' },
  { value: 'TRANSFER', label: 'Chuyển viện' },
];

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function asNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function asBoolean(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function extractRows(payload: any) {
  return Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.results ?? [];
}

function timestampToMs(value?: string) {
  if (!value) return NaN;
  const parsed = value.includes('T') ? new Date(value) : new Date(`${new Date().toISOString().slice(0, 10)}T${value}`);
  return parsed.getTime();
}

function minutesSince(value?: string) {
  const diff = Date.now() - timestampToMs(value);
  return Number.isFinite(diff) ? Math.max(0, Math.floor(diff / 60000)) : 0;
}

function secondsSince(value?: string) {
  const diff = Date.now() - timestampToMs(value);
  return Number.isFinite(diff) ? Math.max(0, Math.floor(diff / 1000)) : 0;
}

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':');
}

function formatDurationFromMinutes(value: number) {
  const totalSeconds = Math.max(0, Math.round(value * 60));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}p ${seconds}s`;
}

function formatDate(value?: string) {
  if (!value) return 'Chưa có';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string) {
  if (!value) return 'Chưa có';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('vi-VN');
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function clsServiceGroupLabel(serviceType?: string) {
  const normalized = (serviceType ?? '').trim().toLowerCase();
  if (['lab', 'laboratory', 'test', 'xet_nghiem', 'xét nghiệm'].includes(normalized)) return 'Xét nghiệm';
  if (['imaging', 'image', 'diagnostic_imaging', 'chan_doan_hinh_anh', 'chẩn đoán hình ảnh'].includes(normalized)) return 'Chẩn đoán hình ảnh';
  return 'Khác';
}

function formatUtilizationRate(value: number) {
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

function normalizeWaitingVisit(raw: any, fallbackStatus: WaitingVisit['status'] = 'WAITING_EXAM'): WaitingVisit {
  const breakdown = raw.priority_breakdown ?? raw.priorityBreakdown ?? {};
  const patient = raw.patient ?? raw.patient_info ?? raw.patientInfo ?? {};
  const clinical = raw.visit_clinical ?? raw.visitClinical ?? raw.clinical ?? {};
  const queuedAt = raw.queued_at ?? raw.queuedAt ?? raw.queue_entry_time ?? raw.queueEntryTime ?? raw.check_in_time ?? raw.checkInTime;
  const patientName = raw.patient_name ?? raw.patientName ?? raw.full_name ?? raw.fullName ?? patient.full_name ?? patient.fullName ?? patient.name ?? raw.name ?? '';
  return {
    id: String(raw.id ?? raw.visit_id ?? raw.visitId),
    patientId: raw.patient_id ?? raw.patientId,
    patientCode: raw.patient_code ?? raw.patientCode,
    patientName,
    fullName: raw.full_name ?? raw.fullName ?? patient.full_name ?? patient.fullName ?? patientName,
    patientAge: asNumber(raw.patient_age ?? raw.patientAge ?? raw.age),
    dateOfBirth: raw.dob ?? raw.date_of_birth ?? raw.dateOfBirth ?? patient.dob ?? patient.date_of_birth ?? patient.dateOfBirth,
    gender: raw.gender ?? raw.patient_gender ?? raw.patientGender ?? patient.gender,
    idNumber: raw.id_number ?? raw.idNumber ?? patient.id_number ?? patient.idNumber,
    ticketNumber: String(raw.ticket_number ?? raw.ticketNumber ?? raw.queue_number ?? raw.queueNumber ?? ''),
    lane: raw.lane ?? 'NORMAL',
    priorityScore: asNumber(raw.priority_score ?? raw.priorityScore),
    priorityBreakdown: {
      Sbase: asNumber(breakdown.Sbase ?? breakdown.sbase ?? raw.Sbase ?? raw.sbase),
      Swait: asNumber(breakdown.Swait ?? breakdown.swait ?? raw.Swait ?? raw.swait),
      Sage: asNumber(breakdown.Sage ?? breakdown.sage ?? raw.Sage ?? raw.sage),
      Scls: asNumber(breakdown.Scls ?? breakdown.scls ?? raw.Scls ?? raw.scls),
    },
    waitMinutes: asNumber(raw.wait_minutes ?? raw.waitMinutes, minutesSince(queuedAt)),
    queuedAt,
    chiefComplaint: raw.chief_complaint ?? raw.chiefComplaint ?? clinical.chief_complaint ?? clinical.chiefComplaint,
    isUrgent: asBoolean(raw.is_urgent ?? raw.isUrgent ?? raw.urgent ?? clinical.is_urgent ?? clinical.isUrgent),
    examStartAt: raw.exam_start_at ?? raw.examStartAt ?? raw.called_at ?? raw.calledAt ?? raw.served_at ?? raw.servedAt,
    diagnosis: clinical.diagnosis ?? raw.diagnosis ?? raw.provisional_diagnosis ?? raw.provisionalDiagnosis,
    examNotes: clinical.exam_notes ?? clinical.examNotes ?? clinical.note ?? raw.exam_notes ?? raw.examNotes ?? raw.note ?? raw.notes,
    status: (raw.status ?? fallbackStatus) as WaitingVisit['status'],
  };
}

function normalizeCLSResult(raw: any): CLSResultItem {
  return {
    id: String(raw.id ?? raw.result_id ?? raw.resultId ?? raw.order_id ?? raw.orderId),
    serviceName: raw.service_name ?? raw.serviceName ?? raw.name ?? '',
    resultNote: raw.result_note ?? raw.resultNote ?? raw.note ?? raw.result ?? '',
    isAbnormal: asBoolean(raw.is_abnormal ?? raw.isAbnormal ?? raw.abnormal),
    resultFileUrl: raw.result_file_url ?? raw.resultFileUrl ?? raw.file_url ?? raw.fileUrl,
  };
}

function normalizeCLSService(raw: any): CLSService {
  const serviceType = raw.service_type ?? raw.serviceType ?? raw.type ?? 'OTHER';
  return {
    id: String(raw.id ?? raw.service_id ?? raw.serviceId),
    name: raw.service_name ?? raw.serviceName ?? raw.name ?? '',
    serviceType,
    avgDuration: asNumber(raw.avg_duration ?? raw.avgDuration ?? raw.duration_minutes ?? raw.durationMinutes),
    isUrgentCls: asBoolean(raw.is_urgent_cls ?? raw.isUrgentCls ?? raw.urgent),
  };
}

function normalizeRoomSuggestion(raw: any): RoomSuggestion {
  return {
    roomId: String(raw.room_id ?? raw.roomId ?? raw.id),
    roomName: raw.room_name ?? raw.roomName ?? raw.name ?? '',
    queueLength: asNumber(raw.queue_length ?? raw.queueLength),
    ewtMinutes: asNumber(raw.ewt_minutes ?? raw.ewtMinutes ?? raw.estimated_wait_minutes ?? raw.estimatedWaitMinutes),
    utilizationRate: asNumber(raw.utilization_rate ?? raw.utilizationRate),
    isRecommended: asBoolean(raw.is_recommended ?? raw.isRecommended ?? raw.recommended),
  };
}

function normalizeDoctorSessionStats(raw: any): DoctorSessionStats {
  const shift = raw.shift ?? raw.current_shift ?? raw.currentShift ?? {};
  return {
    completedToday: asNumber(raw.completed_today ?? raw.completedToday),
    waitingCount: asNumber(raw.waiting_count ?? raw.waitingCount),
    avgExamMinutes: asNumber(raw.avg_exam_minutes ?? raw.avgExamMinutes),
    shiftLabel: raw.shift_label ?? raw.shiftLabel ?? shift.label ?? shift.name ?? 'Ca hiện tại',
    roomName: raw.room_name ?? raw.roomName ?? shift.room_name ?? shift.roomName ?? '',
    startTime: raw.start_time ?? raw.startTime ?? shift.start_time ?? shift.startTime ?? '',
    endTime: raw.end_time ?? raw.endTime ?? shift.end_time ?? shift.endTime ?? '',
    isAvailable: asBoolean(raw.is_available ?? raw.isAvailable ?? raw.available ?? true),
  };
}

function normalizeHistoryCLSOrder(raw: any): VisitHistoryCLSOrder {
  const result = raw.result ?? raw.cls_result ?? raw.clsResult ?? {};
  return {
    id: String(raw.id ?? raw.order_id ?? raw.orderId ?? result.id),
    serviceName: raw.service_name ?? raw.serviceName ?? raw.name ?? result.service_name ?? result.serviceName ?? '',
    isAbnormal: asBoolean(raw.is_abnormal ?? raw.isAbnormal ?? result.is_abnormal ?? result.isAbnormal),
    note: raw.note ?? raw.result_note ?? raw.resultNote ?? result.note ?? result.result_note ?? result.resultNote ?? '',
  };
}

function normalizeHistoryTransition(raw: any): VisitHistoryTransition {
  return {
    id: String(raw.id ?? `${raw.from_state ?? raw.fromState ?? 'start'}-${raw.to_state ?? raw.toState}-${raw.triggered_at ?? raw.triggeredAt}`),
    fromState: raw.from_state ?? raw.fromState,
    toState: raw.to_state ?? raw.toState ?? raw.status ?? '',
    triggeredAt: raw.triggered_at ?? raw.triggeredAt ?? raw.timestamp ?? '',
    triggeredBy: raw.triggered_by ?? raw.triggeredBy ?? raw.performed_by_name ?? raw.performedByName ?? raw.performed_by ?? raw.performedBy ?? '',
  };
}

function normalizePatientVisitHistory(raw: any): PatientVisitHistoryItem {
  const clinical = raw.visit_clinical ?? raw.visitClinical ?? raw.clinical ?? raw.VisitClinical ?? {};
  const clsRows = raw.cls_orders ?? raw.clsOrders ?? raw.cls_order_results ?? raw.clsOrderResults ?? raw.cls ?? [];
  const clsOrders = extractRows(clsRows).map(normalizeHistoryCLSOrder);
  const stateRows = raw.state_history ?? raw.stateHistory ?? raw.visit_state_history ?? raw.visitStateHistory ?? raw.VisitStateHistory ?? raw.status_history ?? raw.statusHistory ?? [];
  const abnormalCount = asNumber(raw.abnormal_count ?? raw.abnormalCount, clsOrders.filter((order: VisitHistoryCLSOrder) => order.isAbnormal).length);
  return {
    id: String(raw.id ?? raw.visit_id ?? raw.visitId),
    visitDate: raw.visit_date ?? raw.visitDate ?? raw.created_at ?? raw.createdAt ?? '',
    doctorName: raw.doctor_name ?? raw.doctorName ?? raw.doctor?.name ?? '',
    departmentName: raw.department_name ?? raw.departmentName ?? raw.department?.name ?? '',
    chiefComplaint: raw.chief_complaint ?? raw.chiefComplaint ?? clinical.chief_complaint ?? clinical.chiefComplaint ?? '',
    diagnosis: clinical.diagnosis ?? raw.diagnosis ?? raw.final_diagnosis ?? raw.finalDiagnosis ?? '',
    clsCount: asNumber(raw.cls_count ?? raw.clsCount, clsOrders.length),
    abnormalCount,
    status: raw.status ?? '',
    clsOrders,
    stateHistory: extractRows(stateRows).map(normalizeHistoryTransition),
  };
}

const PATIENTS: PatientQueueItem[] = [
  { stt: '01', code: 'BN001', name: 'Nguyễn Thị Lan', age: 32, gender: 'Nữ', phone: '0901 234 567', reason: 'Khám thai định kỳ', status: 'Chờ khám', priority: true, waitTime: '12 phút', lastVisit: '05/06/2026', address: 'Quận 3, TP.HCM', note: 'Thai 28 tuần, cần theo dõi huyết áp trước khi khám.' },
  { stt: '02', code: 'BN002', name: 'Trần Minh Anh', age: 28, gender: 'Nữ', phone: '0912 345 678', reason: 'Đau bụng dưới', status: 'Đang khám', waitTime: '5 phút', lastVisit: '05/06/2026', address: 'Quận 7, TP.HCM', note: 'Đang khai thác triệu chứng và tiền sử sản khoa.' },
  { stt: '03', code: 'BN003', name: 'Phạm Thu Hà', age: 35, gender: 'Nữ', phone: '0923 456 789', reason: 'Chờ kết quả xét nghiệm', status: 'Chờ kết quả', waitTime: '20 phút', lastVisit: '04/06/2026', address: 'Bình Thạnh, TP.HCM', note: 'Đã chỉ định công thức máu và beta-hCG.' },
  { stt: '04', code: 'BN004', name: 'Lê Hoàng Mai', age: 30, gender: 'Nữ', phone: '0934 567 890', reason: 'Siêu âm thai', status: 'Chờ kết luận', priority: true, waitTime: '18 phút', lastVisit: '05/06/2026', address: 'Thủ Đức, TP.HCM', note: 'Kết quả siêu âm đã có, cần kết luận khám.' },
  { stt: '05', code: 'BN005', name: 'Hoàng Thu Trang', age: 26, gender: 'Nữ', phone: '0945 678 901', reason: 'Tư vấn sản khoa', status: 'Hoàn tất', waitTime: '0 phút', lastVisit: '03/06/2026', address: 'Quận 10, TP.HCM', note: 'Đã tư vấn dinh dưỡng và hẹn tái khám.' },
  { stt: '06', code: 'BN006', name: 'Đặng Ngọc Anh', age: 34, gender: 'Nữ', phone: '0956 789 012', reason: 'Đau vùng chậu', status: 'Chờ CLS', waitTime: '15 phút', lastVisit: '05/06/2026', address: 'Gò Vấp, TP.HCM', note: 'Cần siêu âm và xét nghiệm nước tiểu.' },
  { stt: '07', code: 'BN007', name: 'Vũ Thanh Hương', age: 29, gender: 'Nữ', phone: '0967 890 123', reason: 'Theo dõi nang buồng trứng', status: 'Đang thực hiện CLS', priority: true, waitTime: '42 phút', lastVisit: '02/06/2026', address: 'Tân Bình, TP.HCM', note: 'Đang thực hiện siêu âm đầu dò.' },
  { stt: '08', code: 'BN008', name: 'Bùi Khánh Linh', age: 31, gender: 'Nữ', phone: '0978 901 234', reason: 'Tái khám sau điều trị', status: 'Chờ khám', waitTime: '9 phút', lastVisit: '01/06/2026', address: 'Phú Nhuận, TP.HCM', note: 'Mang theo kết quả điều trị tuần trước.' },
];

const RESULTS: ResultItem[] = [
  { code: 'BN003', name: 'Phạm Thu Hà', type: 'Xét nghiệm beta-hCG', room: 'Phòng xét nghiệm 01', orderedAt: '08:20', status: 'Đã có kết quả', summary: 'Chỉ số phù hợp tuổi thai, không ghi nhận bất thường.' },
  { code: 'BN004', name: 'Lê Hoàng Mai', type: 'Siêu âm thai', room: 'Phòng siêu âm 02', orderedAt: '08:35', status: 'Đã đọc', summary: 'Thai sống, tim thai đều, cần kết luận lâm sàng.' },
  { code: 'BN006', name: 'Đặng Ngọc Anh', type: 'Siêu âm phụ khoa', room: 'Phòng siêu âm 01', orderedAt: '09:05', status: 'Đang thực hiện', summary: 'Đang chờ kỹ thuật viên cập nhật kết quả.' },
  { code: 'BN007', name: 'Vũ Thanh Hương', type: 'Siêu âm đầu dò', room: 'Phòng siêu âm 03', orderedAt: '09:30', status: 'Chờ kết quả', summary: 'Đã hoàn tất thực hiện, chờ trả kết quả.' },
];

const STATUS_FILTERS = ['Tất cả', 'Chờ khám', 'Đang khám', 'Chờ CLS', 'Chờ kết quả', 'Chờ kết luận', 'Hoàn tất'];

const STATUS_STYLES: Record<DoctorStatus, string> = {
  'Chờ khám': 'bg-blue-100 text-blue-700 border-blue-200',
  'Đang khám': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Chờ CLS': 'bg-purple-100 text-purple-700 border-purple-200',
  'Đang thực hiện CLS': 'bg-violet-100 text-violet-700 border-violet-200',
  'Chờ kết quả': 'bg-orange-100 text-orange-700 border-orange-200',
  'Chờ kết luận': 'bg-amber-100 text-amber-700 border-amber-200',
  'Hoàn tất': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const RESULT_STYLES: Record<ResultItem['status'], string> = {
  'Chờ thực hiện': 'bg-gray-100 text-gray-600 border-gray-200',
  'Đang thực hiện': 'bg-violet-100 text-violet-700 border-violet-200',
  'Chờ kết quả': 'bg-orange-100 text-orange-700 border-orange-200',
  'Đã có kết quả': 'bg-sky-100 text-sky-700 border-sky-200',
  'Đã đọc': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const ACTIONS_BY_STATUS: Record<DoctorStatus, string[]> = {
  'Chờ khám': ['Gọi khám', 'Bắt đầu khám'],
  'Đang khám': ['Chỉ định CLS', 'Kết luận'],
  'Chờ CLS': ['Chỉ định CLS'],
  'Đang thực hiện CLS': ['Xem kết quả'],
  'Chờ kết quả': ['Xem kết quả'],
  'Chờ kết luận': ['Xem kết quả', 'Kết luận'],
  'Hoàn tất': ['Hoàn tất'],
};

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Phòng khám hôm nay</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </section>
  );
}

function DoctorSessionStatsBar({ doctorId }: { doctorId: string }) {
  const [stats, setStats] = useState<DoctorSessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(apiUrl(`/doctors/${doctorId}/session-stats?date=today`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setStats(normalizeDoctorSessionStats(payload?.data ?? payload));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thống kê ca khám');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchStats();
    const pollId = window.setInterval(fetchStats, 60000);
    return () => window.clearInterval(pollId);
  }, [fetchStats]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const toggleAvailability = async () => {
    if (!stats) return;
    const nextAvailable = !stats.isAvailable;
    setUpdatingAvailability(true);
    try {
      const response = await fetch(apiUrl(`/doctors/${doctorId}/availability`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: nextAvailable }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json().catch(() => null);
      const nextStats = payload ? normalizeDoctorSessionStats({ ...stats, ...(payload.data ?? payload) }) : { ...stats, isAvailable: nextAvailable };
      setStats({ ...nextStats, isAvailable: nextAvailable });
      setError(null);
      if (!nextAvailable) showToast('Bệnh nhân mới sẽ không được điều phối đến phòng này');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái bác sĩ');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const waitingCount = stats?.waitingCount ?? 0;
  const shiftText = stats ? `${stats.shiftLabel} • ${stats.roomName || 'Chưa có phòng'} • ${stats.startTime || '--:--'} – ${stats.endTime || '--:--'}` : 'Đang tải ca làm việc';

  return (
    <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 border-b border-gray-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur md:-mx-6 md:-mt-6 md:px-6">
      {toast && (
        <div className="fixed right-5 top-16 z-[70] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex min-h-[48px] items-center gap-3 overflow-x-auto whitespace-nowrap text-sm">
        <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5">
          <span className="text-xs font-semibold uppercase text-gray-500">Đã khám</span>
          <span className="font-bold text-gray-900">{loading && !stats ? '--' : stats?.completedToday ?? 0}</span>
        </div>
        <div className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5', waitingCount > 10 ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-900')}>
          <span className={clsx('text-xs font-semibold uppercase', waitingCount > 10 ? 'text-orange-600' : 'text-gray-500')}>Đang chờ</span>
          <span className="font-bold">{loading && !stats ? '--' : waitingCount}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5">
          <span className="text-xs font-semibold uppercase text-gray-500">Thời gian TB</span>
          <span className="font-bold text-gray-900">{stats ? formatDurationFromMinutes(stats.avgExamMinutes) : '--p --s'}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5">
          <span className="text-xs font-semibold uppercase text-gray-500">Ca làm việc</span>
          <span className="truncate font-semibold text-gray-800">{shiftText}</span>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={!stats || updatingAvailability}
          className={clsx(
            'inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60',
            stats?.isAvailable
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          )}
        >
          {updatingAvailability ? 'Đang cập nhật...' : stats?.isAvailable ? 'Sẵn sàng' : 'Tạm nghỉ'}
        </button>
      </div>
      {error && <p className="pb-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: DoctorStatus }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap', STATUS_STYLES[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

function ResultBadge({ status }: { status: ResultItem['status'] }) {
  return (
    <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap', RESULT_STYLES[status])}>
      {status}
    </span>
  );
}

function TimelineStep({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('h-3 w-3 rounded-full border-2 flex-shrink-0', active ? 'border-sky-600 bg-sky-600' : done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white')} />
      <span className={clsx('text-xs font-medium', active ? 'text-sky-700' : done ? 'text-gray-700' : 'text-gray-400')}>{label}</span>
    </div>
  );
}

function SummaryCards() {
  const stats = [
    { label: 'Bệnh nhân chờ khám', value: PATIENTS.filter(p => p.status === 'Chờ khám').length, icon: ListOrdered, accent: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Đang khám', value: PATIENTS.filter(p => p.status === 'Đang khám').length, icon: Stethoscope, accent: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'Chờ kết quả CLS', value: PATIENTS.filter(p => ['Chờ CLS', 'Đang thực hiện CLS', 'Chờ kết quả'].includes(p.status)).length, icon: FlaskConical, accent: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Chờ kết luận', value: PATIENTS.filter(p => p.status === 'Chờ kết luận').length, icon: FileSearch, accent: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Đã hoàn tất hôm nay', value: PATIENTS.filter(p => p.status === 'Hoàn tất').length, icon: CheckCircle2, accent: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
              <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg border', item.accent)}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function PatientDetailPanel({ patient }: { patient: PatientQueueItem }) {
  const timeline = ['Tiếp nhận', 'Chờ khám', 'Đang khám', 'Chờ CLS', 'Chờ kết quả', 'Chờ kết luận', 'Hoàn tất'];
  const currentIndex = Math.max(1, timeline.findIndex(step =>
    step === patient.status ||
    (patient.status === 'Đang thực hiện CLS' && step === 'Chờ kết quả') ||
    (patient.status === 'Chờ CLS' && step === 'Chờ CLS')
  ));

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chi tiết bệnh nhân</p>
          <h3 className="mt-1 text-lg font-bold text-gray-900">{patient.name}</h3>
          <p className="text-sm text-gray-500">{patient.code} • STT {patient.stt}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <UserRound size={20} />
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Tuổi/Giới tính</p>
            <p className="font-semibold text-gray-800">{patient.age} tuổi / {patient.gender}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Điện thoại</p>
            <p className="font-semibold text-gray-800">{patient.phone}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Địa chỉ</p>
          <p className="text-sm font-semibold text-gray-800">{patient.address}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase text-gray-500">Lý do khám</p>
        <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">{patient.reason}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-gray-500">Trạng thái hiện tại</span>
        <StatusBadge status={patient.status} />
      </div>

      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase text-gray-500">Timeline lượt khám</p>
        <div className="space-y-3">
          {timeline.map((step, index) => (
            <TimelineStep key={step} label={step} active={index === currentIndex} done={index < currentIndex || patient.status === 'Hoàn tất'} />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase text-gray-500">Ghi chú của bác sĩ</p>
        <textarea
          rows={4}
          defaultValue={patient.note}
          className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2">
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700">
          <FlaskConical size={16} />
          Chỉ định CLS
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
          <FileSearch size={16} />
          Xem kết quả
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
          <ClipboardCheck size={16} />
          Kết luận khám
        </button>
      </div>
    </aside>
  );
}

function OverviewPage() {
  const chartItems = [
    { label: 'Chờ khám', value: 24, color: 'bg-blue-500' },
    { label: 'Đang khám', value: 12, color: 'bg-indigo-500' },
    { label: 'Chờ CLS', value: 18, color: 'bg-purple-500' },
    { label: 'Hoàn tất', value: 32, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Tổng quan" subtitle="Theo dõi nhanh tình hình khám bệnh trong ngày" />
      <SummaryCards />
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Bệnh nhân tiếp theo</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {PATIENTS.filter(p => p.status === 'Chờ khám').slice(0, 4).map(patient => (
                <div key={patient.code} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{patient.stt} - {patient.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{patient.reason} • {patient.waitTime}</p>
                    </div>
                    {patient.priority && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Ưu tiên</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Hoạt động gần đây</h2>
            <div className="mt-3 space-y-3">
              {[
                '08:15 - Bắt đầu khám BN002 Trần Minh Anh',
                '08:35 - Chỉ định CLS cho BN006 Đặng Ngọc Anh',
                '09:05 - Nhận kết quả siêu âm BN004 Lê Hoàng Mai',
                '09:25 - Hoàn tất khám BN005 Hoàng Thu Trang',
              ].map(item => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <Activity size={15} className="text-sky-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Tóm tắt trạng thái hôm nay</h2>
          <div className="mt-4 space-y-4">
            {chartItems.map(item => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-600">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className={clsx('h-full rounded-full', item.color)} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CLSOrderPanel({
  open,
  visit,
  onClose,
  onSuccess,
}: {
  open: boolean;
  visit: WaitingVisit | null;
  onClose: () => void;
  onSuccess: (count: number) => void;
}) {
  const [services, setServices] = useState<CLSService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, CLSOrderLineDraft>>({});
  const [roomSuggestions, setRoomSuggestions] = useState<Record<string, RoomSuggestion[]>>({});
  const [roomLoadingIds, setRoomLoadingIds] = useState<Record<string, boolean>>({});
  const [roomErrors, setRoomErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !visit) return;

    setSelectedServiceIds([]);
    setOrderDrafts({});
    setRoomSuggestions({});
    setRoomLoadingIds({});
    setRoomErrors({});
    setSubmitError(null);
    setServicesLoading(true);

    let cancelled = false;
    async function fetchServices() {
      try {
        const response = await fetch(apiUrl('/services?type=cls'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!cancelled) {
          setServices(extractRows(payload).map(normalizeCLSService));
          setServicesError(null);
        }
      } catch (err) {
        if (!cancelled) setServicesError(err instanceof Error ? err.message : 'Không thể tải danh sách CLS');
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    }

    fetchServices();
    return () => {
      cancelled = true;
    };
  }, [open, visit?.id]);

  const fetchRoomSuggestions = useCallback(async (serviceId: string) => {
    if (!visit) return;
    setRoomLoadingIds(prev => ({ ...prev, [serviceId]: true }));
    try {
      const params = new URLSearchParams({ service_id: serviceId, visit_id: visit.id });
      const response = await fetch(apiUrl(`/rooms/suggest?${params.toString()}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setRoomSuggestions(prev => ({ ...prev, [serviceId]: extractRows(payload).slice(0, 3).map(normalizeRoomSuggestion) }));
      setRoomErrors(prev => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
    } catch (err) {
      setRoomErrors(prev => ({ ...prev, [serviceId]: err instanceof Error ? err.message : 'Không thể tải gợi ý phòng' }));
    } finally {
      setRoomLoadingIds(prev => ({ ...prev, [serviceId]: false }));
    }
  }, [visit?.id]);

  const groupedServices = useMemo(() => {
    return services.reduce<Record<string, CLSService[]>>((groups, service) => {
      const group = clsServiceGroupLabel(service.serviceType);
      groups[group] = [...(groups[group] ?? []), service];
      return groups;
    }, {});
  }, [services]);

  const selectedServices = useMemo(() => {
    return selectedServiceIds
      .map(serviceId => services.find(service => service.id === serviceId))
      .filter((service): service is CLSService => !!service);
  }, [selectedServiceIds, services]);

  const toggleService = (service: CLSService) => {
    const isSelected = selectedServiceIds.includes(service.id);
    if (isSelected) {
      setSelectedServiceIds(prev => prev.filter(serviceId => serviceId !== service.id));
      setOrderDrafts(prev => {
        const next = { ...prev };
        delete next[service.id];
        return next;
      });
      setRoomSuggestions(prev => {
        const next = { ...prev };
        delete next[service.id];
        return next;
      });
      return;
    }

    setSelectedServiceIds(prev => [...prev, service.id]);
    setOrderDrafts(prev => ({ ...prev, [service.id]: { priority: service.isUrgentCls ? 'URGENT' : 'ROUTINE', note: '' } }));
    fetchRoomSuggestions(service.id);
  };

  const updateOrderDraft = (serviceId: string, draft: Partial<CLSOrderLineDraft>) => {
    setOrderDrafts(prev => ({
      ...prev,
      [serviceId]: { ...(prev[serviceId] ?? { priority: 'ROUTINE', note: '' }), ...draft },
    }));
  };

  const canSubmit = selectedServiceIds.length > 0 && selectedServiceIds.every(serviceId => !!orderDrafts[serviceId]?.roomId);

  const submitOrders = async () => {
    if (!visit) return;
    if (!canSubmit) {
      setSubmitError('Vui lòng chọn phòng thực hiện cho từng chỉ định');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = selectedServiceIds.map(serviceId => ({
        visit_id: visit.id,
        service_id: serviceId,
        room_id: orderDrafts[serviceId].roomId,
        priority: orderDrafts[serviceId].priority,
        note: orderDrafts[serviceId].note,
      }));
      const response = await fetch(apiUrl('/cls-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      onSuccess(payload.length);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể tạo chỉ định CLS');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !visit) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Đóng chỉ định CLS" />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Chỉ định CLS</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">{visit.fullName}</h2>
            <p className="text-sm text-gray-500">{visit.ticketNumber} • {visit.chiefComplaint ?? 'Chưa có lý do khám'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {servicesError && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{servicesError}</div>}

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-900">Dịch vụ CLS</h3>
              <span className="text-xs font-semibold text-gray-500">{selectedServiceIds.length} đã chọn</span>
            </div>
            {servicesLoading && <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm font-medium text-gray-500">Đang tải dịch vụ...</div>}
            {!servicesLoading && Object.entries(groupedServices).map(([group, groupServices]) => (
              <div key={group} className="mt-4">
                <p className="text-xs font-semibold uppercase text-gray-500">{group}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {groupServices.map(service => {
                    const checked = selectedServiceIds.includes(service.id);
                    return (
                      <label key={service.id} className={clsx('flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition', checked ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-200')}>
                        <input type="checkbox" checked={checked} onChange={() => toggleService(service)} className="mt-1 h-4 w-4 accent-purple-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-gray-900">{service.name}</span>
                          <span className="mt-1 block text-xs text-gray-500">{service.avgDuration} phút</span>
                          {service.isUrgentCls && <span className="mt-2 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">CLS khẩn</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {selectedServices.length > 0 && (
            <section className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Thông tin chỉ định và phòng thực hiện</h3>
              {selectedServices.map(service => {
                const draft = orderDrafts[service.id] ?? { priority: 'ROUTINE', note: '' };
                const suggestions = roomSuggestions[service.id] ?? [];
                return (
                  <div key={service.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{service.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{clsServiceGroupLabel(service.serviceType)} • {service.avgDuration} phút</p>
                      </div>
                      <select value={draft.priority} onChange={event => updateOrderDraft(service.id, { priority: event.target.value as CLSOrderPriority })} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100">
                        <option value="ROUTINE">Thường</option>
                        <option value="URGENT">Khẩn</option>
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      value={draft.note}
                      onChange={event => updateOrderDraft(service.id, { note: event.target.value })}
                      className="mt-3 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100"
                      placeholder="Ghi chú chỉ định"
                    />

                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">Gợi ý phòng</p>
                        {roomLoadingIds[service.id] && <span className="text-xs font-semibold text-gray-400">Đang tải...</span>}
                      </div>
                      {roomErrors[service.id] && <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{roomErrors[service.id]}</div>}
                      {!roomLoadingIds[service.id] && !roomErrors[service.id] && suggestions.length === 0 && <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm font-medium text-gray-500">Chưa có gợi ý phòng</div>}
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                        {suggestions.map(room => {
                          const selected = draft.roomId === room.roomId;
                          return (
                            <button
                              key={room.roomId}
                              onClick={() => updateOrderDraft(service.id, { roomId: room.roomId })}
                              className={clsx(
                                'rounded-lg border p-3 text-left transition',
                                selected ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-100' : room.isRecommended ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-gray-200 bg-white hover:border-sky-200'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-gray-900">{room.roomName}</p>
                                {room.isRecommended && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Đề xuất</span>}
                              </div>
                              <div className="mt-2 space-y-1 text-xs text-gray-600">
                                <p>Hàng đợi: <span className="font-semibold">{room.queueLength}</span></p>
                                <p>EWT: <span className="font-semibold">{room.ewtMinutes} phút</span></p>
                                <p>Tải phòng: <span className="font-semibold">{formatUtilizationRate(room.utilizationRate)}</span></p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
          {submitError && <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{submitError}</div>}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">Hủy</button>
            <button
              onClick={submitOrders}
              disabled={!canSubmit || submitting}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? 'Đang tạo...' : `Tạo ${selectedServiceIds.length} chỉ định`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientHistoryDrawer({
  open,
  patientId,
  patientName,
  onClose,
}: {
  open: boolean;
  patientId?: string;
  patientName?: string;
  onClose: () => void;
}) {
  const [visits, setVisits] = useState<PatientVisitHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !patientId) return;

    let cancelled = false;
    setLoading(true);
    setExpandedVisitId(null);

    async function fetchHistory() {
      try {
        const response = await fetch(apiUrl(`/patients/${patientId}/visits?limit=10`));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!cancelled) {
          setVisits(extractRows(payload).map(normalizePatientVisitHistory));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không thể tải lịch sử khám');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [open, patientId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Đóng lịch sử khám" />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Lịch sử khám</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">{patientName ?? 'Bệnh nhân'}</h2>
            <p className="text-sm text-gray-500">10 lượt khám gần nhất</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!patientId && <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">Không có mã bệnh nhân để tải lịch sử</div>}
          {loading && <div className="rounded-lg bg-gray-50 p-4 text-sm font-medium text-gray-500">Đang tải lịch sử khám...</div>}
          {error && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
          {!loading && !error && patientId && visits.length === 0 && <div className="rounded-lg bg-gray-50 p-4 text-sm font-medium text-gray-500">Chưa có lịch sử khám</div>}

          <div className="space-y-3">
            {visits.map(visit => {
              const expanded = expandedVisitId === visit.id;
              const statusStyle = visit.status === 'COMPLETED'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : visit.status === 'CANCELLED'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600';
              return (
                <article key={visit.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <button onClick={() => setExpandedVisitId(expanded ? null : visit.id)} className="w-full p-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{formatDate(visit.visitDate)}</p>
                          <span className={clsx('rounded-full border px-2.5 py-1 text-xs font-semibold', statusStyle)}>{visit.status || 'UNKNOWN'}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{visit.doctorName || 'Chưa có bác sĩ'} • {visit.departmentName || 'Chưa có khoa'}</p>
                      </div>
                      <ChevronDown size={18} className={clsx('mt-1 flex-shrink-0 text-gray-400 transition', expanded && 'rotate-180')} />
                    </div>

                    <p className="mt-3 text-sm text-gray-700">{truncateText(visit.chiefComplaint || 'Không có lý do khám', 80)}</p>
                    <p className="mt-2 text-sm text-gray-600"><span className="font-semibold text-gray-800">Chẩn đoán:</span> {truncateText(visit.diagnosis || 'Chưa có', 80)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600">CLS {visit.clsCount}</span>
                      <span className={clsx('rounded-full border px-2.5 py-1', visit.abnormalCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-600')}>
                        Bất thường {visit.abnormalCount}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">Chẩn đoán đầy đủ</p>
                        <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{visit.diagnosis || 'Chưa có chẩn đoán'}</p>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase text-gray-500">CLS và kết quả</p>
                        {visit.clsOrders.length === 0 ? (
                          <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm font-medium text-gray-500">Không có chỉ định CLS</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {visit.clsOrders.map(order => (
                              <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold text-gray-900">{order.serviceName || 'Dịch vụ CLS'}</p>
                                  {order.isAbnormal && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Bất thường</span>}
                                </div>
                                <p className="mt-2 text-gray-600">{order.note || 'Không có ghi chú'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase text-gray-500">Timeline trạng thái</p>
                        {visit.stateHistory.length === 0 ? (
                          <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm font-medium text-gray-500">Chưa có lịch sử trạng thái</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {visit.stateHistory.map(entry => (
                              <div key={entry.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                <span className="font-semibold text-gray-900">{entry.fromState ?? 'START'} → {entry.toState}</span>
                                <span className="text-gray-500"> | {formatDateTime(entry.triggeredAt)} | {entry.triggeredBy || 'Hệ thống'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function ActiveExamPanel({
  activeVisit,
  draft,
  clsResults,
  clsResultsLoading,
  clsResultsError,
  completing,
  activeError,
  onDraftChange,
  onComplete,
  onOpenCLSOrder,
  onOpenHistory,
}: {
  activeVisit: WaitingVisit | null;
  draft: ExamDraft;
  clsResults: CLSResultItem[];
  clsResultsLoading: boolean;
  clsResultsError: string | null;
  completing: boolean;
  activeError: string | null;
  onDraftChange: (draft: Partial<ExamDraft>) => void;
  onComplete: () => void;
  onOpenCLSOrder: () => void;
  onOpenHistory: () => void;
}) {
  const [elapsedTick, setElapsedTick] = useState(0);

  useEffect(() => {
    const tickId = window.setInterval(() => setElapsedTick(value => value + 1), 1000);
    return () => window.clearInterval(tickId);
  }, []);

  if (!activeVisit) {
    return (
      <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Đang khám</p>
        {activeError && <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{activeError}</div>}
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm font-medium text-gray-500">Chưa gọi bệnh nhân nào</div>
      </aside>
    );
  }

  void elapsedTick;
  const elapsed = activeVisit.examStartAt ? formatElapsed(secondsSince(activeVisit.examStartAt)) : '00:00:00';
  const isOrderingCLS = draft.direction === 'ORDER_CLS';
  const isWaitingCLS = activeVisit.status === 'WAITING_CLS';

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Đang khám</p>
          <h3 className="mt-1 text-lg font-bold text-gray-900">{activeVisit.fullName}</h3>
          <p className="text-sm text-gray-500">{activeVisit.ticketNumber} • {activeVisit.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            disabled={!activeVisit.patientId}
            title="Xem lịch sử khám"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <History size={17} />
          </button>
          <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{elapsed}</span>
        </div>
      </div>

      {isWaitingCLS && (
        <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700">
          Đã tạo chỉ định CLS, đang chờ kết quả cận lâm sàng
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Ngày sinh</p>
          <p className="font-semibold text-gray-800">{formatDate(activeVisit.dateOfBirth)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Giới tính</p>
          <p className="font-semibold text-gray-800">{activeVisit.gender ?? 'Chưa có'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Số giấy tờ</p>
          <p className="font-semibold text-gray-800">{activeVisit.idNumber ?? 'Chưa có'}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Lượt khám</p>
          {activeVisit.isUrgent && <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Khẩn</span>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <p><span className="text-gray-500">STT:</span> <span className="font-semibold text-gray-900">{activeVisit.ticketNumber}</span></p>
          <p className="mt-1"><span className="text-gray-500">Lý do khám:</span> {activeVisit.chiefComplaint ?? 'Chưa có'}</p>
        </div>
      </div>

      {activeVisit.status === 'IN_CONCLUSION' && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-gray-500">Kết quả CLS</p>
          {clsResultsLoading && <div className="rounded-lg bg-gray-50 p-3 text-sm font-medium text-gray-500">Đang tải kết quả...</div>}
          {clsResultsError && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{clsResultsError}</div>}
          {!clsResultsLoading && !clsResultsError && clsResults.length === 0 && <div className="rounded-lg bg-gray-50 p-3 text-sm font-medium text-gray-500">Chưa có kết quả CLS</div>}
          {!clsResultsLoading && clsResults.map(result => (
            <div key={result.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900">{result.serviceName}</p>
                {result.isAbnormal && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Bất thường</span>}
              </div>
              <p className="mt-2 text-gray-600">{result.resultNote || 'Không có ghi chú'}</p>
              {result.resultFileUrl && <a href={result.resultFileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-800">Mở tệp kết quả</a>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-gray-500">Chẩn đoán sơ bộ / Kết luận</span>
          <textarea
            rows={4}
            value={draft.diagnosis}
            onChange={event => onDraftChange({ diagnosis: event.target.value })}
            disabled={isWaitingCLS}
            className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:text-gray-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-gray-500">Ghi chú khám</span>
          <textarea
            rows={3}
            value={draft.examNotes}
            onChange={event => onDraftChange({ examNotes: event.target.value })}
            disabled={isWaitingCLS}
            className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:text-gray-500"
          />
        </label>
      </div>

      <div className={clsx('mt-4', isWaitingCLS && 'opacity-70')}>
        <p className="text-xs font-semibold uppercase text-gray-500">Hướng xử lý</p>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {EXAM_DIRECTIONS.map(direction => (
            <label key={direction.value} className={clsx('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition', draft.direction === direction.value ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-gray-200 bg-white text-gray-600 hover:border-sky-200')}>
              <input
                type="radio"
                name={`direction-${activeVisit.id}`}
                value={direction.value}
                checked={draft.direction === direction.value}
                disabled={isWaitingCLS}
                onChange={() => {
                  onDraftChange({ direction: direction.value });
                  if (direction.value === 'ORDER_CLS') onOpenCLSOrder();
                }}
                className="h-4 w-4 accent-sky-600"
              />
              {direction.label}
            </label>
          ))}
        </div>
      </div>

      {isOrderingCLS && !isWaitingCLS && (
        <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 p-3">
          <p className="text-xs font-semibold uppercase text-purple-700">Chỉ định CLS</p>
          <p className="mt-1 text-sm text-purple-700">Chọn dịch vụ, mức ưu tiên và phòng thực hiện trong bảng chỉ định.</p>
          <button onClick={onOpenCLSOrder} className="mt-3 w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700">Mở form chỉ định CLS</button>
        </div>
      )}

      {!isWaitingCLS && (
        <button
          disabled={isOrderingCLS || completing}
          onClick={onComplete}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <ClipboardCheck size={16} />
          {completing ? 'Đang hoàn tất...' : 'Hoàn tất khám'}
        </button>
      )}
    </aside>
  );
}

function QueuePageContent({ doctorId }: { doctorId: string }) {
  const [queue, setQueue] = useState<WaitingVisit[]>([]);
  const [activeVisit, setActiveVisit] = useState<WaitingVisit | null>(null);
  const [examDraft, setExamDraft] = useState<ExamDraft>(DEFAULT_EXAM_DRAFT);
  const [clsResults, setClsResults] = useState<CLSResultItem[]>([]);
  const [clsResultsLoading, setClsResultsLoading] = useState(false);
  const [clsResultsError, setClsResultsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [clsOrderPanelOpen, setClsOrderPanelOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const examDraftRef = useRef(examDraft);

  const fetchQueue = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'WAITING_EXAM,WAITING_CONCLUSION',
        doctor_id: doctorId,
      });
      const response = await fetch(apiUrl(`/visits?${params.toString()}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rows = extractRows(payload);
      setQueue(rows.map(normalizeWaitingVisit));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải hàng đợi');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  const fetchActiveVisit = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        status: 'IN_EXAM,IN_CONCLUSION,WAITING_CLS',
        doctor_id: doctorId,
      });
      const response = await fetch(apiUrl(`/visits?${params.toString()}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rows = extractRows(payload).map((row: any) => normalizeWaitingVisit(row, row.status ?? 'IN_EXAM'));
      setActiveVisit(rows[0] ?? null);
      setActiveError(null);
    } catch (err) {
      setActiveError(err instanceof Error ? err.message : 'Không thể tải bệnh nhân đang khám');
    }
  }, [doctorId]);

  useEffect(() => {
    fetchQueue(true);
    fetchActiveVisit();
    const pollId = window.setInterval(() => {
      fetchQueue(false);
      fetchActiveVisit();
    }, 30000);
    return () => window.clearInterval(pollId);
  }, [fetchActiveVisit, fetchQueue]);

  useEffect(() => {
    const tickId = window.setInterval(() => setClockTick(value => value + 1), 60000);
    return () => window.clearInterval(tickId);
  }, []);

  useEffect(() => {
    examDraftRef.current = examDraft;
  }, [examDraft]);

  useEffect(() => {
    if (!activeVisit) {
      setExamDraft(DEFAULT_EXAM_DRAFT);
      setClsResults([]);
      return;
    }

    const savedDraft = window.localStorage.getItem(`exam_draft_${activeVisit.id}`);
    if (savedDraft) {
      try {
        setExamDraft({ ...DEFAULT_EXAM_DRAFT, ...JSON.parse(savedDraft), ...(activeVisit.status === 'WAITING_CLS' ? { direction: 'ORDER_CLS' as const } : {}) });
        return;
      } catch {
        window.localStorage.removeItem(`exam_draft_${activeVisit.id}`);
      }
    }

    setExamDraft({
      diagnosis: activeVisit.diagnosis ?? '',
      examNotes: activeVisit.examNotes ?? '',
      direction: activeVisit.status === 'WAITING_CLS' ? 'ORDER_CLS' : 'CONCLUDE_NOW',
    });
  }, [activeVisit?.id]);

  useEffect(() => {
    if (!activeVisit) return;
    const draftKey = `exam_draft_${activeVisit.id}`;
    const saveDraft = () => {
      window.localStorage.setItem(draftKey, JSON.stringify({ ...examDraftRef.current, savedAt: new Date().toISOString() }));
    };
    const saveId = window.setInterval(saveDraft, 10000);
    return () => window.clearInterval(saveId);
  }, [activeVisit?.id]);

  useEffect(() => {
    if (!activeVisit || activeVisit.status !== 'IN_CONCLUSION') {
      setClsResults([]);
      setClsResultsError(null);
      return;
    }

    let cancelled = false;
    const visitId = activeVisit.id;
    async function fetchCLSResults() {
      setClsResultsLoading(true);
      try {
        const response = await fetch(apiUrl(`/visits/${visitId}/cls-results`));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!cancelled) {
          setClsResults(extractRows(payload).map(normalizeCLSResult));
          setClsResultsError(null);
        }
      } catch (err) {
        if (!cancelled) setClsResultsError(err instanceof Error ? err.message : 'Không thể tải kết quả CLS');
      } finally {
        if (!cancelled) setClsResultsLoading(false);
      }
    }

    fetchCLSResults();
    return () => {
      cancelled = true;
    };
  }, [activeVisit?.id, activeVisit?.status]);

  const sortedQueue = useMemo(() => {
    void clockTick;
    return [...queue]
      .map(item => ({
        ...item,
        waitMinutes: item.queuedAt ? Math.max(item.waitMinutes, minutesSince(item.queuedAt)) : item.waitMinutes,
      }))
      .sort((a, b) => {
        const laneDelta = Number(b.status === 'WAITING_CONCLUSION') - Number(a.status === 'WAITING_CONCLUSION');
        if (laneDelta !== 0) return laneDelta;
        return b.priorityScore - a.priorityScore;
      });
  }, [queue, clockTick]);

  const callPatient = async (visit: WaitingVisit) => {
    setCallingId(visit.id);
    try {
      const response = await fetch(apiUrl(`/visits/${visit.id}/call`), { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json().catch(() => null);
      const calledPayload = payload?.data ?? payload?.visit ?? payload;
      const nextStatus = (calledPayload?.status ?? (visit.status === 'WAITING_CONCLUSION' ? 'IN_CONCLUSION' : 'IN_EXAM')) as ActiveVisitStatus;
      setQueue(prev => prev.filter(item => item.id !== visit.id));
      setActiveVisit(normalizeWaitingVisit({
        ...visit,
        ...(calledPayload ?? {}),
        status: nextStatus,
        exam_start_at: calledPayload?.exam_start_at ?? calledPayload?.examStartAt ?? visit.examStartAt ?? new Date().toISOString(),
      }, nextStatus));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gọi bệnh nhân');
    } finally {
      setCallingId(null);
    }
  };

  const updateExamDraft = (draft: Partial<ExamDraft>) => {
    setExamDraft(prev => ({ ...prev, ...draft }));
  };

  const handleCLSOrderSuccess = async (count: number) => {
    setClsOrderPanelOpen(false);
    setToastMessage(`Đã tạo ${count} chỉ định CLS`);
    window.setTimeout(() => setToastMessage(null), 3500);
    setExamDraft(prev => ({ ...prev, direction: 'ORDER_CLS' }));
    setActiveVisit(prev => prev ? { ...prev, status: 'WAITING_CLS' } : prev);
    await fetchQueue(true);
  };

  const completeExam = async () => {
    if (!activeVisit || examDraft.direction === 'ORDER_CLS') return;
    setCompleting(true);
    try {
      const response = await fetch(apiUrl(`/visits/${activeVisit.id}/complete`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: examDraft.diagnosis,
          direction: examDraft.direction,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      window.localStorage.removeItem(`exam_draft_${activeVisit.id}`);
      setActiveVisit(null);
      setExamDraft(DEFAULT_EXAM_DRAFT);
      setClsResults([]);
      setError(null);
      await fetchQueue(true);
      await fetchActiveVisit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể hoàn tất khám');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="fixed right-5 top-5 z-[60] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
          {toastMessage}
        </div>
      )}
      <PageHeader title="Hàng đợi khám" subtitle="Danh sách bệnh nhân cần xử lý trong ca khám" />
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Bảng hàng đợi bệnh nhân</h2>
              <p className="text-sm text-gray-500">Bệnh nhân tiếp theo: <span className="font-semibold text-sky-700">{sortedQueue[0] ? `${sortedQueue[0].ticketNumber} - ${sortedQueue[0].patientName}` : 'Chưa có'}</span></p>
            </div>
            <button onClick={() => fetchQueue(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
              <PlayCircle size={16} />
              Làm mới hàng đợi
            </button>
          </div>
          {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Tuổi</th>
                  <th className="px-4 py-3">Luồng</th>
                  <th className="px-4 py-3">Điểm ưu tiên</th>
                  <th className="px-4 py-3">Thời gian chờ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm font-medium text-gray-400">Đang tải hàng đợi...</td></tr>}
                {!loading && sortedQueue.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm font-medium text-gray-400">Không có bệnh nhân đang chờ</td></tr>}
                {!loading && sortedQueue.map(visit => {
                  const laneStyle = {
                    APPOINTMENT: 'border-blue-200 bg-blue-50 text-blue-700',
                    AFTER_CLS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    PRIORITY: 'border-red-200 bg-red-50 text-red-700',
                    NORMAL: 'border-gray-200 bg-gray-50 text-gray-600',
                  }[visit.lane];
                  const laneLabel = {
                    APPOINTMENT: 'Đặt lịch',
                    AFTER_CLS: 'Sau CLS',
                    PRIORITY: 'Ưu tiên',
                    NORMAL: 'Thường',
                  }[visit.lane];
                  const priorityTitle = `Sbase ${visit.priorityBreakdown.Sbase} + Swait ${visit.priorityBreakdown.Swait} + Sage ${visit.priorityBreakdown.Sage} + Scls ${visit.priorityBreakdown.Scls}`;
                  return (
                  <tr key={visit.id} className={clsx('transition hover:bg-sky-50/60', visit.waitMinutes > 45 && 'bg-red-50 hover:bg-red-50')}>
                    <td className="px-4 py-3 font-mono font-bold text-sky-700">{visit.ticketNumber}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{visit.patientName}</td>
                    <td className="px-4 py-3 text-gray-600">{visit.patientAge}</td>
                    <td className="px-4 py-3"><span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', laneStyle)}>{laneLabel}</span></td>
                    <td className="px-4 py-3"><span title={priorityTitle} className="inline-flex cursor-help rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{visit.priorityScore}</span></td>
                    <td className={clsx('px-4 py-3 font-semibold', visit.waitMinutes > 45 ? 'text-red-700' : 'text-gray-600')}><span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-gray-400" />{visit.waitMinutes} phút</span></td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{visit.status}</span></td>
                    <td className="px-4 py-3">
                      <button disabled={callingId === visit.id} onClick={() => callPatient(visit)} className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-white px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"><PlayCircle size={14} />Gọi bệnh nhân</button>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <ActiveExamPanel
          activeVisit={activeVisit}
          draft={examDraft}
          clsResults={clsResults}
          clsResultsLoading={clsResultsLoading}
          clsResultsError={clsResultsError}
          completing={completing}
          activeError={activeError}
          onDraftChange={updateExamDraft}
          onComplete={completeExam}
          onOpenCLSOrder={() => activeVisit?.status !== 'WAITING_CLS' && setClsOrderPanelOpen(true)}
          onOpenHistory={() => setHistoryDrawerOpen(true)}
        />
      </section>
      <CLSOrderPanel
        open={clsOrderPanelOpen}
        visit={activeVisit}
        onClose={() => setClsOrderPanelOpen(false)}
        onSuccess={handleCLSOrderSuccess}
      />
      <PatientHistoryDrawer
        open={historyDrawerOpen}
        patientId={activeVisit?.patientId}
        patientName={activeVisit?.fullName}
        onClose={() => setHistoryDrawerOpen(false)}
      />
    </div>
  );
}

function PatientsPageContent() {
  const [selectedCode, setSelectedCode] = useState('BN001');
  const selectedPatient = PATIENTS.find(patient => patient.code === selectedCode) ?? PATIENTS[0];

  return (
    <div className="space-y-5">
      <PageHeader title="Danh sách bệnh nhân" subtitle="Tra cứu thông tin bệnh nhân đã và đang khám" />
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_160px_160px_160px]">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Tìm theo tên, mã BN, số điện thoại" className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
          </div>
          {['Ngày khám', 'Trạng thái', 'Giới tính', 'Mức ưu tiên'].map(label => (
            <select key={label} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100">
              <option>{label}</option>
            </select>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã bệnh nhân</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Tuổi</th>
                <th className="px-4 py-3">Giới tính</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Lần khám gần nhất</th>
                <th className="px-4 py-3">Trạng thái hiện tại</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PATIENTS.map(patient => (
                <tr key={patient.code} onClick={() => setSelectedCode(patient.code)} className={clsx('cursor-pointer hover:bg-sky-50/60', selectedPatient.code === patient.code && 'bg-sky-50')}>
                  <td className="px-4 py-3 font-semibold text-sky-700">{patient.code}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{patient.name}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.age}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.gender}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.lastVisit}</td>
                  <td className="px-4 py-3"><StatusBadge status={patient.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {['Xem hồ sơ', 'Xem lịch sử khám', 'Xem trạng thái'].map(action => <button key={action} className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">{action}</button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-900">Hồ sơ tóm tắt</h3>
          <div className="mt-3 space-y-3 text-sm">
            <p><span className="text-gray-500">Bệnh nhân:</span> <span className="font-semibold text-gray-900">{selectedPatient.name}</span></p>
            <p><span className="text-gray-500">Thông tin:</span> {selectedPatient.age} tuổi, {selectedPatient.gender}, {selectedPatient.phone}</p>
            <p><span className="text-gray-500">Lịch sử khám:</span> Khám gần nhất {selectedPatient.lastVisit}</p>
            <p><span className="text-gray-500">CLS gần đây:</span> {RESULTS.find(r => r.code === selectedPatient.code)?.type ?? 'Chưa có chỉ định gần đây'}</p>
            <p><span className="text-gray-500">Ghi chú:</span> {selectedPatient.note}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultsPageContent() {
  const [selectedResult, setSelectedResult] = useState<ResultItem>(RESULTS[0]);

  return (
    <div className="space-y-5">
      <PageHeader title="Kết quả cận lâm sàng" subtitle="Theo dõi các kết quả CLS đã có và đang chờ xử lý" />
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['Chờ kết quả', 'Đã có kết quả', 'Đã đọc kết quả', 'Cần kết luận'].map(tab => (
            <button key={tab} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-sky-200 hover:text-sky-700">{tab}</button>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã bệnh nhân</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Loại CLS</th>
                <th className="px-4 py-3">Phòng thực hiện</th>
                <th className="px-4 py-3">Thời gian chỉ định</th>
                <th className="px-4 py-3">Trạng thái kết quả</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {RESULTS.map(result => (
                <tr key={`${result.code}-${result.type}`} onClick={() => setSelectedResult(result)} className={clsx('cursor-pointer hover:bg-sky-50/60', selectedResult === result && 'bg-sky-50')}>
                  <td className="px-4 py-3 font-semibold text-sky-700">{result.code}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{result.name}</td>
                  <td className="px-4 py-3 text-gray-600">{result.type}</td>
                  <td className="px-4 py-3 text-gray-600">{result.room}</td>
                  <td className="px-4 py-3 text-gray-600">{result.orderedAt}</td>
                  <td className="px-4 py-3"><ResultBadge status={result.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {['Xem kết quả', 'Đánh dấu đã đọc', 'Chờ kết luận', 'Kết luận khám'].map(action => <button key={action} className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">{action}</button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-900">Chi tiết kết quả</h3>
          <div className="mt-3 space-y-3 text-sm text-gray-700">
            <p><span className="text-gray-500">Bệnh nhân:</span> <span className="font-semibold">{selectedResult.name}</span></p>
            <p><span className="text-gray-500">Loại CLS:</span> {selectedResult.type}</p>
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs font-medium text-gray-500">Tệp kết quả tải lên</div>
            <p><span className="text-gray-500">Tóm tắt:</span> {selectedResult.summary}</p>
            <textarea rows={4} placeholder="Ghi chú diễn giải của bác sĩ..." className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
            <button className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Kết luận khám</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SchedulePageContent() {
  const shifts = [
    { date: '06/06/2026', time: '07:30 - 11:30', room: 'Phòng khám 201', specialty: 'Sản phụ khoa', booked: 14, status: 'Đang làm việc' },
    { date: '06/06/2026', time: '13:30 - 17:00', room: 'Phòng khám 201', specialty: 'Sản phụ khoa', booked: 10, status: 'Sắp tới' },
    { date: '05/06/2026', time: '07:30 - 11:30', room: 'Phòng khám 201', specialty: 'Sản phụ khoa', booked: 18, status: 'Đã kết thúc' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Lịch làm việc" subtitle="Theo dõi lịch khám và ca làm việc của bác sĩ" />
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['Hôm nay', 'Tuần này', 'Tháng này'].map(mode => <button key={mode} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100">{mode}</button>)}
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {shifts.map(shift => (
          <div key={`${shift.date}-${shift.time}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{shift.date}</p>
                <p className="mt-1 text-xs text-gray-500">{shift.time} • {shift.room}</p>
              </div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{shift.status}</span>
            </div>
            <p className="mt-3 text-sm text-gray-600">{shift.specialty}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{shift.booked} <span className="text-xs font-medium text-gray-500">bệnh nhân đặt lịch</span></p>
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Lịch hôm nay</h2>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <p>Ca sáng: 07:30 - 11:30, phòng khám 201</p>
            <p>Ca chiều: 13:30 - 17:00, phòng khám 201</p>
            <p>Dự kiến: 24 bệnh nhân</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Danh sách lịch hẹn trong ca</h2>
          <div className="mt-3 space-y-2">
            {PATIENTS.slice(0, 4).map((patient, index) => (
              <div key={patient.code} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="font-semibold text-gray-900">{patient.name}</span>
                <span className="text-gray-500">{`0${8 + index}:30`} • {patient.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportsPageContent() {
  const rows = [
    ['06/06/2026', '24', '18', '16 phút', 'Ca khám ổn định'],
    ['05/06/2026', '28', '23', '18 phút', 'Có nhiều ca siêu âm'],
    ['04/06/2026', '21', '19', '14 phút', 'Hoàn tất đúng giờ'],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Báo cáo cá nhân" subtitle="Thống kê hiệu suất khám bệnh của bác sĩ" />
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['Hôm nay', '7 ngày', '30 ngày', 'Tùy chọn'].map(range => <button key={range} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:border-sky-200 hover:text-sky-700">{range}</button>)}
        </div>
      </section>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Tổng bệnh nhân đã khám', '142'],
          ['Thời gian khám trung bình', '14p'],
          ['Ca có chỉ định CLS', '38'],
          ['Ca hoàn tất', '126'],
          ['Tỷ lệ hoàn tất trong ngày', '89%'],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900">{value}</p></div>)}
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {['Số bệnh nhân theo ngày', 'Phân bổ trạng thái khám', 'Tỷ lệ chỉ định CLS'].map(title => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            <div className="mt-4 space-y-3">
              {[72, 48, 64].map((value, index) => <div key={index} className="h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${value}%` }} /></div>)}
            </div>
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4"><h2 className="text-base font-bold text-gray-900">Hoạt động khám gần đây</h2></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500"><tr>{['Date', 'Patient count', 'Completed cases', 'Average waiting time', 'Notes'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{rows.map(row => <tr key={row[0]}>{row.map(cell => <td key={cell} className="px-4 py-3 text-gray-700">{cell}</td>)}</tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}

function AccountPageContent() {
  return (
    <div className="space-y-5">
      <PageHeader title="Tài khoản" subtitle="Quản lý thông tin cá nhân và thiết lập tài khoản" />
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-600 text-2xl font-bold text-white">N</div>
            <h2 className="mt-3 text-lg font-bold text-gray-900">BS. Phạm Hoài Nam</h2>
            <p className="text-sm font-semibold text-sky-700">Bác sĩ</p>
            <p className="text-sm text-gray-500">Sản phụ khoa • Khoa Sản</p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-gray-700">
            <p className="flex items-center gap-2"><Mail size={15} className="text-sky-600" /> nam.pham@mediflow.vn</p>
            <p className="flex items-center gap-2"><Phone size={15} className="text-sky-600" /> 0908 112 233</p>
            <p className="flex items-center gap-2"><Shield size={15} className="text-sky-600" /> Khoa Sản</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[
            { title: 'Thông tin cá nhân', icon: UserRound, fields: ['Họ và tên', 'Email', 'Số điện thoại'] },
            { title: 'Thông tin chuyên môn', icon: Stethoscope, fields: ['Chuyên khoa', 'Khoa', 'Phòng khám'] },
            { title: 'Đổi mật khẩu', icon: Lock, fields: ['Mật khẩu hiện tại', 'Mật khẩu mới'] },
            { title: 'Cài đặt thông báo', icon: Settings, fields: ['Thông báo CLS', 'Nhắc lịch khám'] },
          ].map(section => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Icon size={16} className="text-sky-600" />{section.title}</h3>
                <div className="mt-3 space-y-2">
                  {section.fields.map(field => <input key={field} placeholder={field} className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Cập nhật thông tin</button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"><KeyRound size={15} />Đổi mật khẩu</button>
        <button className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Đăng xuất</button>
      </section>
    </div>
  );
}

export default function DoctorWorkspace({ roomId: _roomId, doctorId }: DoctorWorkspaceProps) {
  const [searchParams] = useSearchParams();
  const view = (searchParams.get('view') ?? 'overview') as DoctorView;
  let content: ReactNode;

  if (view === 'overview') content = <OverviewPage />;
  else if (view === 'patients') content = <PatientsPageContent />;
  else if (view === 'results') content = <ResultsPageContent />;
  else if (view === 'schedule') content = <SchedulePageContent />;
  else if (view === 'reports') content = <ReportsPageContent />;
  else if (view === 'account') content = <AccountPageContent />;
  else content = <QueuePageContent doctorId={doctorId} />;

  return (
    <>
      <DoctorSessionStatsBar doctorId={doctorId} />
      {content}
    </>
  );
}
