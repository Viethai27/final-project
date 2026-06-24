import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePlus2,
  RefreshCcw,
  Search,
  Stethoscope,
  UserPlus2,
  Users,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { ErrorState, EmptyState, LoadingState } from '../components/common/PageState';
import { ToastContainer } from '../components/common/ToastContainer';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { LaneBadge, PriorityBadge } from '../components/ui/PriorityBadge';
import { useAuth } from '../context/AuthContext';
import {
  createDemoAppointmentSlots,
  IS_DEMO_MODE,
  RECEPTION_DEMO_QUEUE,
} from '../demo/receptionDemoData';
import type { ReceptionQueueItem } from '../demo/receptionDemoData';
import { formatDateTime } from '../lib/format';
import { appointmentApi } from '../services/appointmentApi';
import { departmentApi } from '../services/departmentApi';
import { doctorApi } from '../services/doctorApi';
import { patientApi } from '../services/patientApi';
import { queueApi } from '../services/queueApi';
import { serviceApi } from '../services/serviceApi';
import { visitApi } from '../services/visitApi';
import { ApiError } from '../services/http';
import type {
  AppointmentAvailableSlotDto,
  AppointmentListItemDto,
  DepartmentDto,
  DoctorDto,
  PatientCreateInputDto,
  PatientDto,
  ServiceDto,
  VisitDetailForActionDto,
  VisitListItemDto,
  WalkInRegistrationInputDto,
} from '../services/backend-types';
import type { PatientStatus } from '../types';
import { getToastMessage, useToastNotifications } from '../hooks/useToastNotifications';

type ReceptionView = 'patient-records' | 'walk-in' | 'appointments' | 'patients' | 'visits' | 'queue';
type GenderValue = 'MALE' | 'FEMALE' | 'OTHER';

type BasePatientForm = {
  fullName: string;
  gender: GenderValue;
  dateOfBirth: string;
  phone: string;
  idNumber: string;
  address: string;
  insuranceNumber: string;
  isDisabled: boolean;
  isDisabledHeavy: boolean;
  isRevolutionary: boolean;
};

type WalkInFormState = BasePatientForm & {
  departmentId: string;
  serviceId: string;
  doctorId: string;
  chiefComplaint: string;
  note: string;
  isPregnant: boolean;
  isUrgent: boolean;
};

type AppointmentFormState = BasePatientForm & {
  departmentId: string;
  serviceId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  chiefComplaint: string;
  note: string;
  isPregnant: boolean;
  isUrgent: boolean;
};

type PhoneMatchPatient = PatientDto & {
  hasActiveVisitOrQueue?: boolean;
};

type PhoneMatchDetails = {
  matches?: PhoneMatchPatient[];
};

const VIEW_TITLES: Record<ReceptionView, string> = {
  'patient-records': 'Tiep nhan benh nhan',
  'walk-in': 'Tiep nhan benh nhan',
  appointments: 'Lich hen',
  patients: 'Danh sach benh nhan',
  visits: 'Danh sach luot kham',
  queue: 'Hang doi',
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Cho duyet',
  SCHEDULED: 'Cho duyet',
  CONFIRMED: 'Da duyet',
  CHECKED_IN: 'Da check-in',
  LATE: 'Den muon',
  NO_SHOW: 'Vang mat',
  CANCELLED: 'Da huy',
};

const QUEUE_STATUS_LABELS: Record<string, string> = {
  WAITING: 'Đang chờ',
  CALLED: 'Đã gọi',
  SERVING: 'Đang phục vụ',
  DONE: 'Hoàn tất',
  TIMEOUT: 'Quá giờ',
  CANCELLED: 'Đã hủy',
};

const createBasePatientForm = (): BasePatientForm => ({
  fullName: '',
  gender: 'OTHER',
  dateOfBirth: '',
  phone: '',
  idNumber: '',
  address: '',
  insuranceNumber: '',
  isDisabled: false,
  isDisabledHeavy: false,
  isRevolutionary: false,
});

const createWalkInForm = (): WalkInFormState => ({
  ...createBasePatientForm(),
  departmentId: '',
  serviceId: '',
  doctorId: '',
  chiefComplaint: '',
  note: '',
  isPregnant: false,
  isUrgent: false,
});

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tomorrowInput = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInput(tomorrow);
};

const createAppointmentForm = (): AppointmentFormState => ({
  ...createBasePatientForm(),
  departmentId: '',
  serviceId: '',
  doctorId: '',
  appointmentDate: tomorrowInput(),
  appointmentTime: '',
  chiefComplaint: '',
  note: '',
  isPregnant: false,
  isUrgent: false,
});

const toPatientForm = (patient: PatientDto): BasePatientForm => ({
  fullName: patient.fullName ?? '',
  gender: patient.gender ?? 'OTHER',
  dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
  phone: patient.phone ?? '',
  idNumber: patient.idNumber ?? '',
  address: patient.address ?? '',
  insuranceNumber: patient.insuranceNumber ?? '',
  isDisabled: Boolean(patient.isDisabled),
  isDisabledHeavy: Boolean(patient.isDisabledHeavy),
  isRevolutionary: Boolean(patient.isRevolutionary),
});

const calculateAgeFromDate = (dateOfBirth: string) => {
  if (!dateOfBirth) return null;
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
};

const isPediatricsDepartment = (department?: DepartmentDto | null) =>
  Boolean(department && (department.code?.toUpperCase() === 'NK' || department.name.toLowerCase().includes('nhi')));

const isClinicalDepartment = (department?: DepartmentDto | null) =>
  Boolean(
    department &&
      (department.code?.toUpperCase() === 'CLS' ||
        department.name.toLowerCase().includes('can lam sang') ||
        department.name.toLowerCase().includes('cáº­n lÃ¢m sÃ ng')),
  );

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-100',
        props.className,
      )}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-100',
        props.className,
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-100',
        props.className,
      )}
    />
  );
}

function ToggleRow({
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={clsx(
        'flex items-start gap-3 rounded-2xl border px-4 py-3',
        disabled ? 'border-gray-100 bg-gray-50 text-gray-400' : 'border-gray-200 bg-white',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600"
      />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs">{description}</p>
      </div>
    </label>
  );
}

function PatientFields({
  value,
  onChange,
}: {
  value: BasePatientForm;
  onChange: <K extends keyof BasePatientForm>(key: K, nextValue: BasePatientForm[K]) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <FieldLabel required>Ho va ten</FieldLabel>
        <TextInput value={value.fullName} onChange={event => onChange('fullName', event.target.value)} />
      </div>
      <div>
        <FieldLabel required>So dien thoai</FieldLabel>
        <TextInput value={value.phone} onChange={event => onChange('phone', event.target.value)} />
      </div>
      <div>
        <FieldLabel required>Gioi tinh</FieldLabel>
        <SelectInput value={value.gender} onChange={event => onChange('gender', event.target.value as GenderValue)}>
          <option value="MALE">Nam</option>
          <option value="FEMALE">Nu</option>
          <option value="OTHER">Khac</option>
        </SelectInput>
      </div>
      <div>
        <FieldLabel>Ngay sinh</FieldLabel>
        <TextInput type="date" value={value.dateOfBirth} onChange={event => onChange('dateOfBirth', event.target.value)} />
      </div>
      <div>
        <FieldLabel>CCCD</FieldLabel>
        <TextInput value={value.idNumber} onChange={event => onChange('idNumber', event.target.value)} />
      </div>
      <div>
        <FieldLabel>So BHYT</FieldLabel>
        <TextInput value={value.insuranceNumber} onChange={event => onChange('insuranceNumber', event.target.value)} />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Dia chi</FieldLabel>
        <TextInput value={value.address} onChange={event => onChange('address', event.target.value)} />
      </div>
      <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
        <ToggleRow checked={value.isDisabled} label="Khuyet tat" description="Danh dau uu tien nghiep vu neu co." onChange={next => onChange('isDisabled', next)} />
        <ToggleRow checked={value.isDisabledHeavy} label="Khuyet tat nang" description="Muc uu tien cao hon neu co." onChange={next => onChange('isDisabledHeavy', next)} />
        <ToggleRow checked={value.isRevolutionary} label="Doi tuong cach mang" description="Luu vao ho so benh nhan." onChange={next => onChange('isRevolutionary', next)} />
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
  right,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        {right}
      </div>
    </div>
  );
}

export default function ReceptionPage() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToastNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get('view') as ReceptionView | null) ?? 'patient-records';

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorDto[]>([]);
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [visits, setVisits] = useState<VisitListItemDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentListItemDto[]>([]);
  const [queueItems, setQueueItems] = useState<ReceptionQueueItem[]>([]);
  const [queueCardError, setQueueCardError] = useState('');
  const [queueUsingDemoData, setQueueUsingDemoData] = useState(false);

  const [patientLookupQuery, setPatientLookupQuery] = useState('');
  const [patientLookupMatches, setPatientLookupMatches] = useState<PatientDto[]>([]);
  const [patientLookupLoading, setPatientLookupLoading] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [appointmentStatus, setAppointmentStatus] = useState('PENDING');
  const [appointmentDateFilter, setAppointmentDateFilter] = useState('');

  const [patientForm, setPatientForm] = useState<BasePatientForm>(() => createBasePatientForm());
  const [walkInForm, setWalkInForm] = useState<WalkInFormState>(() => createWalkInForm());
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormState>(() => createAppointmentForm());

  const [selectedPatient, setSelectedPatient] = useState<PatientDto | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientMode, setSelectedPatientMode] = useState<'created' | 'selected' | null>(null);
  const [selectedReceptionAction, setSelectedReceptionAction] = useState<'walk-in' | 'appointment' | null>(null);

  const [pendingPatientPayload, setPendingPatientPayload] = useState<PatientCreateInputDto | null>(null);
  const [pendingWalkInPayload, setPendingWalkInPayload] = useState<WalkInRegistrationInputDto | null>(null);
  const [phoneMatches, setPhoneMatches] = useState<PhoneMatchPatient[]>([]);

  const [appointmentSlots, setAppointmentSlots] = useState<AppointmentAvailableSlotDto[]>([]);
  const [loadingAppointmentSlots, setLoadingAppointmentSlots] = useState(false);
  const [appointmentSlotsError, setAppointmentSlotsError] = useState('');
  const [appointmentSlotsUsingDemoData, setAppointmentSlotsUsingDemoData] = useState(false);

  const [submittingPatient, setSubmittingPatient] = useState(false);
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);
  const [actioningAppointmentId, setActioningAppointmentId] = useState<string | null>(null);

  const [walkInSuccess, setWalkInSuccess] = useState<VisitDetailForActionDto | null>(null);
  const [appointmentSuccess, setAppointmentSuccess] = useState<AppointmentListItemDto | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const visitInfoRef = useRef<HTMLDivElement | null>(null);

  const examServices = useMemo(
    () => services.filter(service => service.serviceType === 'EXAM' && service.isActive !== false),
    [services],
  );
  const walkInDepartments = useMemo(
    () => departments.filter(department => !isClinicalDepartment(department)),
    [departments],
  );
  const walkInAge = useMemo(() => calculateAgeFromDate(walkInForm.dateOfBirth), [walkInForm.dateOfBirth]);
  const appointmentAge = useMemo(() => calculateAgeFromDate(appointmentForm.dateOfBirth), [appointmentForm.dateOfBirth]);
  const activeWalkInDepartment = useMemo(
    () => walkInDepartments.find(department => department.id === walkInForm.departmentId) ?? null,
    [walkInDepartments, walkInForm.departmentId],
  );
  const activeAppointmentDepartment = useMemo(
    () => departments.find(department => department.id === appointmentForm.departmentId) ?? null,
    [appointmentForm.departmentId, departments],
  );

  const validatePediatricsSelection = (department: DepartmentDto | null, age: number | null) => {
    if (!isPediatricsDepartment(department)) return '';
    if (age === null) return 'Can ngay sinh de kiem tra dieu kien khoa Nhi.';
    if (age >= 15) return 'Chi benh nhan duoi 15 tuoi moi duoc chon khoa Nhi.';
    return '';
  };

  const walkInPediatricsError = validatePediatricsSelection(activeWalkInDepartment, walkInAge);
  const appointmentPediatricsError = validatePediatricsSelection(activeAppointmentDepartment, appointmentAge);

  const buildPatientPayload = (form: BasePatientForm): PatientCreateInputDto => ({
    fullName: form.fullName.trim(),
    gender: form.gender,
    dateOfBirth: form.dateOfBirth || null,
    phone: form.phone.trim(),
    idNumber: form.idNumber.trim() || null,
    address: form.address.trim() || null,
    insuranceNumber: form.insuranceNumber.trim() || null,
    isDisabled: form.isDisabled,
    isDisabledHeavy: form.isDisabledHeavy,
    isRevolutionary: form.isRevolutionary,
  });

  const validatePatientRecordForm = (form: BasePatientForm) => {
    if (!form.fullName.trim()) return 'Vui long nhap ho va ten.';
    if (!form.phone.trim()) return 'Vui long nhap so dien thoai.';
    return '';
  };

  const applySelectedPatient = (patient: PatientDto, mode: 'created' | 'selected') => {
    const nextPatient = toPatientForm(patient);
    setSelectedPatient(patient);
    setSelectedPatientId(patient.id);
    setSelectedPatientMode(mode);
    setPatientForm(nextPatient);
    setWalkInForm(current => ({ ...current, ...nextPatient }));
    setAppointmentForm(current => ({ ...current, ...nextPatient }));
    setSelectedReceptionAction(null);
    setSubmitError('');
    setPatientLookupMatches([]);
    setPatientLookupQuery(`${patient.fullName} ${patient.patientCode}`);
  };

  const clearSelectedPatient = () => {
    setSelectedPatient(null);
    setSelectedPatientId(null);
    setSelectedPatientMode(null);
    setSelectedReceptionAction(null);
    setWalkInSuccess(null);
    setAppointmentSuccess(null);
  };

  const resetWalkInVisitFields = () => {
    setWalkInForm(current => ({
      ...current,
      departmentId: '',
      serviceId: '',
      doctorId: '',
      chiefComplaint: '',
      note: '',
      isUrgent: false,
      isPregnant: current.gender === 'FEMALE' ? current.isPregnant : false,
    }));
  };

  const resetAppointmentBookingFields = () => {
    setAppointmentForm(current => ({
      ...current,
      departmentId: '',
      serviceId: '',
      doctorId: '',
      appointmentDate: tomorrowInput(),
      appointmentTime: '',
      chiefComplaint: '',
      note: '',
      isUrgent: false,
      isPregnant: current.gender === 'FEMALE' ? current.isPregnant : false,
    }));
    setAppointmentSlots([]);
    setAppointmentSlotsError('');
    setAppointmentSlotsUsingDemoData(false);
  };

  const refreshQueueCard = async (actionLabel = 'Hàng đợi hiện tại') => {
    setQueueCardError('');
    try {
      const response = await queueApi.list({
        page: 1,
        limit: 10,
        status: 'ACTIVE',
        lane: 'ALL',
        sort: 'asc',
      });
      if (response.data.length === 0 && IS_DEMO_MODE) {
        setQueueItems(RECEPTION_DEMO_QUEUE);
        setQueueUsingDemoData(true);
        return RECEPTION_DEMO_QUEUE;
      }

      setQueueItems(response.data);
      setQueueUsingDemoData(false);
      return response.data;
    } catch (err) {
      const message = getToastMessage(err, 'Không tải được hàng đợi hiện tại.');
      if (IS_DEMO_MODE) {
        setQueueItems(RECEPTION_DEMO_QUEUE);
        setQueueUsingDemoData(true);
        addToast({
          type: 'warning',
          action: actionLabel,
          message: 'Đang hiển thị dữ liệu mẫu do chưa tải được hàng đợi.',
        });
        return RECEPTION_DEMO_QUEUE;
      }

      setQueueItems([]);
      setQueueUsingDemoData(false);
      setQueueCardError(message);
      addToast({
        type: 'error',
        action: actionLabel,
        message,
      });
      return [];
    }
  };

  useEffect(() => {
    if (walkInForm.gender !== 'FEMALE' && walkInForm.isPregnant) {
      setWalkInForm(current => ({ ...current, isPregnant: false }));
    }
  }, [walkInForm.gender, walkInForm.isPregnant]);

  useEffect(() => {
    if (appointmentForm.gender !== 'FEMALE' && appointmentForm.isPregnant) {
      setAppointmentForm(current => ({ ...current, isPregnant: false }));
    }
  }, [appointmentForm.gender, appointmentForm.isPregnant]);

  useEffect(() => {
    if (activeView !== 'patient-records') {
      setPatientLookupMatches([]);
      return;
    }

    const query = patientLookupQuery.trim();
    if (query.length < 2) {
      setPatientLookupMatches([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setPatientLookupLoading(true);
      patientApi
        .list({ page: 1, limit: 8, sort: 'desc', search: query })
        .then(response => {
          if (active) {
            setPatientLookupMatches(response.data);
          }
        })
        .catch(() => {
          if (active) {
            setPatientLookupMatches([]);
          }
        })
        .finally(() => {
          if (active) {
            setPatientLookupLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeView, patientLookupQuery]);

  useEffect(() => {
    if (selectedReceptionAction !== 'appointment') {
      setAppointmentSlots([]);
      setAppointmentSlotsError('');
      setAppointmentSlotsUsingDemoData(false);
      setLoadingAppointmentSlots(false);
      return;
    }

    const loadSlots = async () => {
      if (!appointmentForm.departmentId || !appointmentForm.doctorId || !appointmentForm.appointmentDate) {
        setAppointmentSlots([]);
        setAppointmentSlotsError('');
        setAppointmentSlotsUsingDemoData(false);
        return;
      }

      if (appointmentForm.appointmentDate <= toDateInput(new Date())) {
        setAppointmentSlots([]);
        setAppointmentSlotsError('Chỉ có thể đặt lịch từ ngày mai trở đi.');
        setAppointmentSlotsUsingDemoData(false);
        return;
      }

      setLoadingAppointmentSlots(true);
      setAppointmentSlotsError('');
      setAppointmentSlotsUsingDemoData(false);
      try {
        const response = await appointmentApi.getAvailableSlots({
          date: appointmentForm.appointmentDate,
          doctorId: appointmentForm.doctorId,
          departmentId: appointmentForm.departmentId,
          serviceId: appointmentForm.serviceId || null,
          slotMinutes: 30,
        });
        const slots = response.data.slots ?? [];
        if (slots.length === 0 && IS_DEMO_MODE) {
          setAppointmentSlots(createDemoAppointmentSlots(appointmentForm.doctorId));
          setAppointmentSlotsUsingDemoData(true);
        } else {
          setAppointmentSlots(slots);
        }
      } catch (err) {
        const message = getToastMessage(err, 'Không tải được khung giờ khả dụng.');
        if (IS_DEMO_MODE) {
          setAppointmentSlots(createDemoAppointmentSlots(appointmentForm.doctorId));
          setAppointmentSlotsUsingDemoData(true);
          addToast({
            type: 'warning',
            action: 'Khung giờ khả dụng',
            message: 'Đang hiển thị dữ liệu mẫu do chưa tải được khung giờ.',
          });
        } else {
          setAppointmentSlots([]);
          setAppointmentSlotsError(message);
          addToast({ type: 'error', action: 'Khung giờ khả dụng', message });
        }
      } finally {
        setLoadingAppointmentSlots(false);
      }
    };

    void loadSlots();
  }, [
    addToast,
    appointmentForm.appointmentDate,
    appointmentForm.departmentId,
    appointmentForm.doctorId,
    appointmentForm.serviceId,
    selectedReceptionAction,
  ]);

  useEffect(() => {
    const loadCatalogs = async () => {
      const [departmentRes, serviceRes] = await Promise.all([
        departmentApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' }),
        serviceApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' }),
      ]);
      setDepartments(departmentRes.data);
      setServices(serviceRes.data);
    };

    const loadViewData = async () => {
      const search = listSearch.trim() || undefined;
      if (activeView === 'patient-records') {
        await refreshQueueCard();
        return;
      }

      if (activeView === 'appointments') {
        const response = await appointmentApi.list({
          page: 1,
          limit: 100,
          sort: 'asc',
          search,
          status: appointmentStatus,
          date: appointmentDateFilter || undefined,
        });
        setAppointments(response.data);
        return;
      }

      if (activeView === 'patients') {
        const response = await patientApi.list({ page: 1, limit: 100, sort: 'desc', search });
        setPatients(response.data);
        return;
      }

      if (activeView === 'visits') {
        const response = await visitApi.list({ page: 1, limit: 100, sort: 'desc', search });
        setVisits(response.data);
        return;
      }

      if (activeView === 'queue') {
        await refreshQueueCard();
      }
    };

    let active = true;
    const run = async () => {
      try {
        setError('');
        setLoading(true);
        setRefreshing(true);
        await loadCatalogs();
        if (!active) return;
        await loadViewData();
      } catch (err) {
        if (!active) return;
        const message = getToastMessage(err, 'Khong tai duoc du lieu le tan.');
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [activeView, appointmentDateFilter, appointmentStatus, listSearch, reloadKey]);

  useEffect(() => {
    const departmentId =
      selectedReceptionAction === 'appointment' ? appointmentForm.departmentId : walkInForm.departmentId;

    let active = true;
    const loadDoctors = async () => {
      try {
        const response = await doctorApi.list({
          page: 1,
          limit: 100,
          sort: 'asc',
          status: 'active',
          ...(departmentId ? { departmentId } : {}),
        });
        if (active) {
          setDoctorOptions(response.data);
        }
      } catch {
        if (active) {
          setDoctorOptions([]);
        }
      }
    };

    void loadDoctors();
    return () => {
      active = false;
    };
  }, [appointmentForm.departmentId, selectedReceptionAction, walkInForm.departmentId]);

  useEffect(() => {
    if (!walkInForm.doctorId) return;
    if (doctorOptions.some(doctor => doctor.id === walkInForm.doctorId)) return;
    setWalkInForm(current => ({ ...current, doctorId: '' }));
  }, [doctorOptions, walkInForm.doctorId]);

  useEffect(() => {
    if (!appointmentForm.doctorId) return;
    if (doctorOptions.some(doctor => doctor.id === appointmentForm.doctorId)) return;
    setAppointmentForm(current => ({ ...current, doctorId: '' }));
  }, [appointmentForm.doctorId, doctorOptions]);

  const refreshCurrentView = () => setReloadKey(current => current + 1);

  const setView = (view: ReceptionView) => {
    setListSearch('');
    setSubmitError('');
    if (view !== 'patient-records') {
      setSelectedReceptionAction(null);
    }
    setSearchParams({ view: view === 'walk-in' ? 'patient-records' : view });
  };

  const updatePatientForm = <K extends keyof BasePatientForm>(key: K, value: BasePatientForm[K]) => {
    if (selectedPatientId || selectedPatient) {
      clearSelectedPatient();
    }
    setPatientForm(current => ({ ...current, [key]: value }));
  };

  const updateWalkInForm = <K extends keyof WalkInFormState>(key: K, value: WalkInFormState[K]) => {
    setWalkInForm(current => ({ ...current, [key]: value }));
  };

  const updateAppointmentForm = <K extends keyof AppointmentFormState>(key: K, value: AppointmentFormState[K]) => {
    setAppointmentForm(current => ({
      ...current,
      [key]: value,
      ...(key === 'departmentId' || key === 'doctorId' || key === 'appointmentDate' || key === 'serviceId'
        ? { appointmentTime: '' }
        : {}),
    }));
  };

  const getPhoneMatchesFromError = (err: unknown) => {
    if (!(err instanceof ApiError) || err.code !== 'PHONE_MATCHES_FOUND') {
      return null;
    }

    const details = err.details as PhoneMatchDetails | undefined;
    return Array.isArray(details?.matches) ? details.matches : [];
  };

  const submitPatientPayload = async (payload: PatientCreateInputDto) => {
    setSubmittingPatient(true);
    try {
      const response = await patientApi.create(payload);
      applySelectedPatient(response.data, 'created');
      setPendingPatientPayload(null);
      setPhoneMatches([]);
      addToast({
        type: 'success',
        action: 'Tao ho so benh nhan',
        message: `Tao ho so thanh cong cho ${response.data.fullName}.`,
      });
      refreshCurrentView();
    } catch (err) {
      const matches = getPhoneMatchesFromError(err);
      if (matches) {
        if (matches.length === 0) {
          const message = getToastMessage(err, 'So dien thoai da ton tai nhung khong tra ve danh sach ho so.');
          setSubmitError(message);
          addToast({ type: 'warning', action: 'Trung so dien thoai', message });
          return;
        }

        setPendingPatientPayload(payload);
        setPhoneMatches(matches);
        setSubmitError('');
        addToast({
          type: 'warning',
          action: 'Trung so dien thoai',
          message: `Phat hien ho so trung so dien thoai cua ${payload.fullName}.`,
        });
        return;
      }

      const message = getToastMessage(err, 'Khong tao duoc ho so benh nhan.');
      setSubmitError(message);
      addToast({
        type: 'error',
        action: 'Tao ho so benh nhan',
        message,
      });
    } finally {
      setSubmittingPatient(false);
    }
  };

  const submitWalkInPayload = async (payload: WalkInRegistrationInputDto) => {
    setSubmittingWalkIn(true);
    try {
      const response = await visitApi.createWalkIn(payload);
      setWalkInSuccess(response.data);
      setPendingWalkInPayload(null);
      setPhoneMatches([]);
      resetWalkInVisitFields();
      setSelectedReceptionAction(null);
      addToast({
        type: 'success',
        action: 'Dang ky kham',
        message: `Dang ky kham thanh cong. So thu tu: ${response.data.queueNumber}.`,
      });
      await refreshQueueCard('Hang doi hien tai').catch(() => undefined);
      refreshCurrentView();
    } catch (err) {
      const matches = getPhoneMatchesFromError(err);
      if (matches) {
        if (matches.length === 0) {
          const message = getToastMessage(err, 'So dien thoai da ton tai nhung khong tra ve danh sach ho so.');
          setSubmitError(message);
          addToast({ type: 'warning', action: 'Dang ky kham', message });
          return;
        }

        setPendingWalkInPayload(payload);
        setPhoneMatches(matches);
        setSubmitError('');
        addToast({
          type: 'warning',
          action: 'Trung so dien thoai',
          message: `Phat hien ho so trung so dien thoai cua ${payload.fullName}.`,
        });
        return;
      }

      const message = getToastMessage(err, 'Khong dang ky kham duoc.');
      setSubmitError(message);
      addToast({
        type: 'error',
        action: 'Dang ky kham',
        message,
      });
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  const handleUsePhoneMatch = (patient: PhoneMatchPatient) => {
    if (pendingWalkInPayload) {
      applySelectedPatient(patient, 'selected');
      void submitWalkInPayload({
        ...pendingWalkInPayload,
        selectedPatientId: patient.id,
        patientId: patient.id,
        createNewPatientOnPhoneMatch: false,
      });
      return;
    }

    if (pendingPatientPayload) {
      applySelectedPatient(patient, 'selected');
      setPendingPatientPayload(null);
      setPhoneMatches([]);
      addToast({
        type: 'success',
        action: 'Chon ho so benh nhan',
        message: `Da chon ho so co san: ${patient.fullName}.`,
      });
    }
  };

  const handleCreateNewForPhoneMatch = () => {
    if (pendingWalkInPayload) {
      void submitWalkInPayload({
        ...pendingWalkInPayload,
        selectedPatientId: null,
        patientId: null,
        createNewPatientOnPhoneMatch: true,
      });
      return;
    }

    if (pendingPatientPayload) {
      void submitPatientPayload({
        ...pendingPatientPayload,
        createNewPatientOnPhoneMatch: true,
      });
    }
  };

  const closePhoneMatchModal = () => {
    setPendingPatientPayload(null);
    setPendingWalkInPayload(null);
    setPhoneMatches([]);
  };

  const handleCreatePatient = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validatePatientRecordForm(patientForm);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitError('');
    await submitPatientPayload(buildPatientPayload(patientForm));
  };

  const handleWalkIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId) {
      setSubmitError('Vui long chon ho so benh nhan truoc.');
      return;
    }
    if (walkInPediatricsError) {
      setSubmitError(walkInPediatricsError);
      return;
    }
    if (!walkInForm.departmentId || !walkInForm.serviceId) {
      setSubmitError('Vui long chon khoa va dich vu kham.');
      return;
    }

    setSubmitError('');
    await submitWalkInPayload({
      ...buildPatientPayload(walkInForm),
      departmentId: walkInForm.departmentId,
      serviceId: walkInForm.serviceId,
      doctorId: walkInForm.doctorId || null,
      chiefComplaint: walkInForm.chiefComplaint.trim() || null,
      note: walkInForm.note.trim() || null,
      isPregnant: walkInForm.gender === 'FEMALE' ? walkInForm.isPregnant : false,
      isUrgent: walkInForm.isUrgent,
      selectedPatientId,
      patientId: selectedPatientId,
      updatedById: user?.id ?? null,
    });
  };

  const handleCreateAppointment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId) {
      setSubmitError('Vui long chon ho so benh nhan truoc.');
      return;
    }
    if (appointmentPediatricsError) {
      setSubmitError(appointmentPediatricsError);
      return;
    }
    if (!appointmentForm.departmentId || !appointmentForm.serviceId) {
      setSubmitError('Vui long chon khoa va dich vu kham.');
      return;
    }
    if (!appointmentForm.appointmentDate || appointmentForm.appointmentDate <= toDateInput(new Date())) {
      setSubmitError('Chỉ có thể đặt lịch từ ngày mai trở đi.');
      return;
    }
    if (!appointmentForm.appointmentTime) {
      setSubmitError('Vui lòng chọn khung giờ khả dụng.');
      return;
    }

    const appointmentTime = new Date(`${appointmentForm.appointmentDate}T${appointmentForm.appointmentTime}:00`);
    if (Number.isNaN(appointmentTime.getTime())) {
      setSubmitError('Thoi gian kham khong hop le.');
      return;
    }

    setSubmittingAppointment(true);
    setSubmitError('');
    try {
      const response = await appointmentApi.create({
        ...buildPatientPayload(appointmentForm),
        departmentId: appointmentForm.departmentId,
        serviceId: appointmentForm.serviceId,
        doctorId: appointmentForm.doctorId || null,
        appointmentTime: appointmentTime.toISOString(),
        chiefComplaint: appointmentForm.chiefComplaint.trim() || null,
        note: appointmentForm.note.trim() || null,
        isPregnant: appointmentForm.gender === 'FEMALE' ? appointmentForm.isPregnant : false,
        isUrgent: appointmentForm.isUrgent,
      });
      setAppointmentSuccess({
        ...response.data.appointment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        patient: response.data.patient,
        visit: null,
      });
      resetAppointmentBookingFields();
      setSelectedReceptionAction(null);
      addToast({
        type: 'success',
        action: 'Đặt lịch khám',
        message: 'Đặt lịch khám thành công.',
      });
      refreshCurrentView();
    } catch (err) {
      const message = getToastMessage(err, 'Khong tao duoc lich kham.');
      setSubmitError(message);
      addToast({
        type: 'error',
        action: 'Đặt lịch khám',
        message,
      });
    } finally {
      setSubmittingAppointment(false);
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject' | 'check-in') => {
    setActioningAppointmentId(appointmentId);
    setSubmitError('');
    try {
      if (action === 'approve') {
        await appointmentApi.approve(appointmentId);
        addToast({ type: 'success', action: 'Duyet lich hen', message: 'Duyet lich hen thanh cong.' });
      } else if (action === 'reject') {
        await appointmentApi.reject(appointmentId);
        addToast({ type: 'success', action: 'Tu choi lich hen', message: 'Tu choi lich hen thanh cong.' });
      } else {
        const response = await appointmentApi.checkIn(appointmentId, { updatedById: user?.id ?? null });
        await refreshQueueCard('Hang doi hien tai').catch(() => undefined);
        addToast({
          type: 'success',
          action: 'Check-in lich hen',
          message: `Check-in lich hen thanh cong. So thu tu: ${response.data.queueItem.queueNumber ?? 'N/A'}.`,
        });
      }
      refreshCurrentView();
    } catch (err) {
      const message = getToastMessage(err, 'Khong cap nhat duoc lich hen.');
      addToast({
        type: 'error',
        action: action === 'check-in' ? 'Check-in lich hen' : action === 'approve' ? 'Duyet lich hen' : 'Tu choi lich hen',
        message,
      });
    } finally {
      setActioningAppointmentId(null);
    }
  };

  const tabs: Array<{ key: ReceptionView; label: string; icon: React.ReactNode }> = [
    { key: 'patient-records', label: 'Tiep nhan', icon: <UserPlus2 size={14} /> },
    { key: 'appointments', label: 'Lich hen', icon: <CalendarDays size={14} /> },
    { key: 'patients', label: 'Benh nhan', icon: <Users size={14} /> },
    { key: 'visits', label: 'Luot kham', icon: <Clock3 size={14} /> },
    { key: 'queue', label: 'Hang doi', icon: <FilePlus2 size={14} /> },
  ];

  const hasAppointmentSlotInputs =
    Boolean(appointmentForm.departmentId) && Boolean(appointmentForm.doctorId) && Boolean(appointmentForm.appointmentDate);
  const isAppointmentDateTooEarly =
    Boolean(appointmentForm.appointmentDate) && appointmentForm.appointmentDate <= toDateInput(new Date());
  const visibleAppointmentSlots = appointmentSlots.filter(slot => slot.available !== false);

  if (loading && !refreshing) {
    return (
      <Layout pageTitle={VIEW_TITLES[activeView]}>
        <LoadingState label="Đang tải dữ liệu lễ tân..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle={VIEW_TITLES[activeView]}>
        <ErrorState message={error} onRetry={refreshCurrentView} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle={VIEW_TITLES[activeView]}>
      <div className="space-y-5">
        <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
                Quay le tan
              </p>
              <h1 className="mt-3 text-2xl font-black text-gray-950 md:text-3xl">{VIEW_TITLES[activeView]}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Flow chinh bat dau tu thong tin benh nhan. Sau khi co ho so hop le, le tan moi chon dang ky kham hom nay hoac dat lich kham.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshCurrentView}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
              Lam moi du lieu
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                activeView === tab.key
                  ? 'border-sky-200 bg-sky-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-sky-200 hover:text-sky-700',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {submitError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        <ToastContainer toasts={toasts} onDismiss={removeToast} />

        {activeView === 'patient-records' ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard title="1. Thông tin bệnh nhân" description="Chọn hồ sơ có sẵn hoặc tạo hồ sơ mới trước khi đăng ký khám / đặt lịch.">
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Tim ho so da co</FieldLabel>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <TextInput
                        value={patientLookupQuery}
                        onChange={event => setPatientLookupQuery(event.target.value)}
                        placeholder="CCCD, SDT, BHYT hoac ho ten"
                        className="pl-9"
                      />
                    </div>
                    {patientLookupLoading ? <p className="mt-2 text-xs text-gray-500">Dang tim ho so...</p> : null}
                    {patientLookupMatches.length > 0 ? (
                      <div className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                        {patientLookupMatches.map(patient => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => applySelectedPatient(patient, 'selected')}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-sky-50"
                          >
                            <span>
                              <span className="font-semibold text-gray-900">{patient.fullName}</span>
                              <span className="ml-2 text-xs text-gray-500">{patient.patientCode}</span>
                              <span className="mt-0.5 block text-xs text-gray-500">
                                {patient.phone || 'Chua co SDT'} · {patient.idNumber || 'Chua co CCCD'}
                              </span>
                            </span>
                            <span className="text-xs font-semibold text-sky-700">Chon</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <form className="space-y-4" onSubmit={handleCreatePatient}>
                    <PatientFields value={patientForm} onChange={updatePatientForm} />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={submittingPatient || Boolean(selectedPatientId)}
                        className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                      >
                        {submittingPatient ? 'Dang luu...' : 'Tao ho so'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearSelectedPatient();
                          setPatientForm(createBasePatientForm());
                          setPatientLookupMatches([]);
                          setPatientLookupQuery('');
                          setSubmitError('');
                        }}
                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Lam moi
                      </button>
                    </div>
                  </form>
                </div>
              </SectionCard>

              <SectionCard title="2. Chọn nghiệp vụ" description="Sau khi có bệnh nhân hợp lệ, lễ tân chọn đăng ký khám hôm nay hoặc đặt lịch khám.">
                {!selectedPatient ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    Vui long chon hoac tao ho so benh nhan truoc.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-700" size={20} />
                        <div>
                          <p className="font-semibold text-emerald-900">
                            {selectedPatientMode === 'created' ? 'Da tao ho so benh nhan.' : 'Da chon ho so benh nhan.'}
                          </p>
                          <p className="mt-1 text-sm text-emerald-700">
                            {selectedPatient.fullName} · {selectedPatient.patientCode}
                          </p>
                          <p className="mt-1 text-xs text-emerald-700">{selectedPatient.phone || 'Chua co so dien thoai'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceptionAction('walk-in');
                          window.setTimeout(() => {
                            visitInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 0);
                        }}
                        className={clsx(
                          'rounded-2xl border px-4 py-4 text-left transition',
                          selectedReceptionAction === 'walk-in'
                            ? 'border-sky-300 bg-sky-50'
                            : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50',
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                          <Stethoscope size={16} />
                          Dang ky kham hom nay
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Tao Visit va QueueItem ngay sau khi submit.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedReceptionAction('appointment')}
                        className={clsx(
                          'rounded-2xl border px-4 py-4 text-left transition',
                          selectedReceptionAction === 'appointment'
                            ? 'border-sky-300 bg-sky-50'
                            : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50',
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                          <CalendarDays size={16} />
                          Đặt lịch khám
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Chỉ tạo Appointment, không tạo Visit/Queue.</p>
                      </button>
                    </div>

                    {selectedReceptionAction ? null : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                        Chon mot nghiep vu de hien form tiep theo.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={clearSelectedPatient}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Chon benh nhan khac
                    </button>
                  </div>
                )}
              </SectionCard>
            </div>

            {selectedReceptionAction === 'walk-in' ? (
              <div ref={visitInfoRef} className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <SectionCard title="3. Thông tin lượt khám" description="Chỉ hiển thị khi đã chọn nghiệp vụ đăng ký khám hôm nay.">
                  <form className="space-y-4" onSubmit={handleWalkIn}>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Benh nhan da chon</p>
                      <p className="mt-1 text-sm font-semibold text-sky-900">{selectedPatient?.fullName}</p>
                      <p className="mt-0.5 text-xs text-sky-700">{selectedPatient?.patientCode}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel required>Khoa kham</FieldLabel>
                        <SelectInput value={walkInForm.departmentId} onChange={event => updateWalkInForm('departmentId', event.target.value)}>
                          <option value="">Chon khoa</option>
                          {walkInDepartments.map(department => (
                            <option key={department.id} value={department.id}>{department.name}</option>
                          ))}
                        </SelectInput>
                        {walkInPediatricsError ? <p className="mt-1 text-xs text-rose-600">{walkInPediatricsError}</p> : null}
                      </div>
                      <div>
                        <FieldLabel required>Dich vu kham</FieldLabel>
                        <SelectInput value={walkInForm.serviceId} onChange={event => updateWalkInForm('serviceId', event.target.value)}>
                          <option value="">Chon dich vu</option>
                          {examServices.map(service => (
                            <option key={service.id} value={service.id}>{service.name}</option>
                          ))}
                        </SelectInput>
                      </div>
                      <div>
                        <FieldLabel>Bác sĩ</FieldLabel>
                        <SelectInput value={walkInForm.doctorId} onChange={event => updateWalkInForm('doctorId', event.target.value)} disabled={!walkInForm.departmentId}>
                          <option value="">De he thong sap xep</option>
                          {doctorOptions.map(doctor => (
                            <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                          ))}
                        </SelectInput>
                      </div>
                      <div>
                        <FieldLabel>Tuoi tinh tu ngay sinh</FieldLabel>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          {walkInAge ?? 'Chua xac dinh'}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel>Ly do kham</FieldLabel>
                        <TextArea rows={3} value={walkInForm.chiefComplaint} onChange={event => updateWalkInForm('chiefComplaint', event.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel>Ghi chu</FieldLabel>
                        <TextArea rows={2} value={walkInForm.note} onChange={event => updateWalkInForm('note', event.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <ToggleRow checked={walkInForm.isPregnant} disabled={walkInForm.gender !== 'FEMALE'} label="Co thai" description="Chi dung cho benh nhan nu." onChange={next => updateWalkInForm('isPregnant', next)} />
                      <ToggleRow checked={walkInForm.isUrgent} label="Can uu tien" description="Danh dau luong uu tien neu nghiep vu ap dung." onChange={next => updateWalkInForm('isUrgent', next)} />
                    </div>

                    <div className="flex gap-3">
                      <button type="submit" disabled={submittingWalkIn} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                        {submittingWalkIn ? 'Dang dang ky...' : 'Dang ky kham'}
                      </button>
                      <button type="button" onClick={() => setSelectedReceptionAction(null)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                        Quay lai
                      </button>
                    </div>
                  </form>
                </SectionCard>

                <SectionCard title="Ket qua dang ky gan nhat" description="Le tan can thay so thu tu ngay sau khi dang ky thanh cong.">
                  {walkInSuccess ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-900">{walkInSuccess.patient.fullName}</p>
                      <p className="mt-1 text-sm text-emerald-700">
                        So thu tu: <span className="font-mono font-black">{walkInSuccess.queueNumber}</span>
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Visit: {walkInSuccess.visitId} · Trang thai: {walkInSuccess.currentState}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Chua co luot dang ky kham nao trong phien nay.
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            {selectedReceptionAction === 'appointment' ? (
              <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <SectionCard title="3. Thông tin đặt lịch" description="Chọn ngày từ ngày mai và khung giờ khả dụng.">
                  <form className="space-y-4" onSubmit={handleCreateAppointment}>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Bệnh nhân đã chọn</p>
                      <p className="mt-1 text-sm font-semibold text-sky-900">{selectedPatient?.fullName}</p>
                      <p className="mt-0.5 text-xs text-sky-700">{selectedPatient?.patientCode}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel required>Khoa khám</FieldLabel>
                        <SelectInput value={appointmentForm.departmentId} onChange={event => updateAppointmentForm('departmentId', event.target.value)}>
                          <option value="">Chọn khoa</option>
                          {walkInDepartments.map(department => (
                            <option key={department.id} value={department.id}>{department.name}</option>
                          ))}
                        </SelectInput>
                        {appointmentPediatricsError ? <p className="mt-1 text-xs text-rose-600">{appointmentPediatricsError}</p> : null}
                      </div>
                      <div>
                        <FieldLabel required>Dịch vụ khám</FieldLabel>
                        <SelectInput value={appointmentForm.serviceId} onChange={event => updateAppointmentForm('serviceId', event.target.value)}>
                          <option value="">Chọn dịch vụ</option>
                          {examServices.map(service => (
                            <option key={service.id} value={service.id}>{service.name}</option>
                          ))}
                        </SelectInput>
                      </div>
                      <div>
                        <FieldLabel>Bác sĩ</FieldLabel>
                        <SelectInput value={appointmentForm.doctorId} onChange={event => updateAppointmentForm('doctorId', event.target.value)} disabled={!appointmentForm.departmentId}>
                          <option value="">Chọn bác sĩ</option>
                          {doctorOptions.map(doctor => (
                            <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                          ))}
                        </SelectInput>
                      </div>
                      <div>
                        <FieldLabel>Tuổi tính từ ngày sinh</FieldLabel>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          {appointmentAge ?? 'Chưa xác định'}
                        </div>
                      </div>
                      <div>
                        <FieldLabel required>Ngày hẹn</FieldLabel>
                        <TextInput type="date" min={tomorrowInput()} value={appointmentForm.appointmentDate} onChange={event => updateAppointmentForm('appointmentDate', event.target.value)} />
                      </div>
                      <div className="md:col-span-2 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <FieldLabel required>Khung giờ khả dụng</FieldLabel>
                          {appointmentSlotsUsingDemoData ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Dữ liệu mẫu
                            </span>
                          ) : null}
                        </div>
                        {loadingAppointmentSlots ? (
                          <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                            Đang tải khung giờ khả dụng...
                          </p>
                        ) : appointmentSlotsError ? (
                          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                            {appointmentSlotsError}
                          </p>
                        ) : !hasAppointmentSlotInputs ? (
                          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                            Chọn khoa, bác sĩ và ngày hẹn để xem các khung giờ khả dụng 30 phút.
                          </p>
                        ) : isAppointmentDateTooEarly ? (
                          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                            Chỉ có thể đặt lịch từ ngày mai trở đi.
                          </p>
                        ) : visibleAppointmentSlots.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                            Không có khung giờ khả dụng cho ngày đã chọn.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {visibleAppointmentSlots.map(slot => (
                              <button
                                key={`${slot.startTime}-${slot.endTime}`}
                                type="button"
                                onClick={() => updateAppointmentForm('appointmentTime', slot.startTime)}
                                disabled={slot.available === false}
                                className={clsx(
                                  'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                                  appointmentForm.appointmentTime === slot.startTime
                                    ? 'border-sky-500 bg-sky-600 text-white'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-sky-50',
                                  slot.available === false && 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-100',
                                )}
                              >
                                {slot.startTime} - {slot.endTime}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel>Lý do khám</FieldLabel>
                        <TextArea rows={3} value={appointmentForm.chiefComplaint} onChange={event => updateAppointmentForm('chiefComplaint', event.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel>Ghi chú</FieldLabel>
                        <TextArea rows={2} value={appointmentForm.note} onChange={event => updateAppointmentForm('note', event.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <ToggleRow checked={appointmentForm.isPregnant} disabled={appointmentForm.gender !== 'FEMALE'} label="Có thai" description="Chỉ dùng cho bệnh nhân nữ." onChange={next => updateAppointmentForm('isPregnant', next)} />
                      <ToggleRow checked={appointmentForm.isUrgent} label="Cần ưu tiên" description="Áp dụng khi check-in nếu nghiệp vụ phù hợp." onChange={next => updateAppointmentForm('isUrgent', next)} />
                    </div>

                    <div className="flex gap-3">
                      <button type="submit" disabled={submittingAppointment} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                        {submittingAppointment ? 'Đang tạo...' : 'Đặt lịch khám'}
                      </button>
                      <button type="button" onClick={() => setSelectedReceptionAction(null)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                        Quay lại
                      </button>
                    </div>
                  </form>
                </SectionCard>

                <SectionCard title="Lich vua tao" description="Appointment tao thanh cong se chua vao queue cho den khi check-in.">
                  {appointmentSuccess ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-semibold text-emerald-900">{appointmentSuccess.patient.fullName}</p>
                      <p className="mt-1 text-sm text-emerald-700">
                        {formatDateTime(appointmentSuccess.appointmentTime)} · {APPOINTMENT_STATUS_LABELS[appointmentSuccess.status] ?? appointmentSuccess.status}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Chua co appointment moi trong phien nay.
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            <SectionCard title="Hàng đợi hiện tại" description="Danh sách bệnh nhân đang chờ được phục vụ.">
              {queueUsingDemoData ? (
                <div className="mb-3 flex justify-end">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Dữ liệu mẫu</span>
                </div>
              ) : null}
              {queueCardError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Không tải được hàng đợi: {queueCardError}
                </div>
              ) : queueItems.length === 0 ? (
                <EmptyState title="Chưa có hàng đợi" description="Hiện không có bệnh nhân nào trong hàng đợi." />
              ) : (
                <div className="space-y-3">
                  {queueItems.map(item => (
                    <div key={item.queueItemId} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800">{item.patient.fullName}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.queueNumber} · {item.room?.name ?? 'Chưa có phòng'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                          <LaneBadge lane={item.priority.laneType} size="sm" />
                          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                            {QUEUE_STATUS_LABELS[item.currentStatus] ?? item.currentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        ) : null}

        {activeView === 'appointments' ? (
          <div className="space-y-4">
            <SectionCard title="Lich hen" description="Trang nay chi dung de xem danh sach, duyet va check-in lich hen.">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Neu can tao lich hen moi, quay lai flow Tiep nhan.</p>
                <button type="button" onClick={() => setView('patient-records')} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                  Tao lich hen moi
                </button>
              </div>
            </SectionCard>

            <SearchBar
              value={listSearch}
              onChange={setListSearch}
              placeholder="Tim theo ten benh nhan, so dien thoai, CCCD, ma lich..."
              right={(
                <>
                  <SelectInput value={appointmentStatus} onChange={event => setAppointmentStatus(event.target.value)} className="w-auto min-w-[170px]">
                    <option value="PENDING">Cho duyet</option>
                    <option value="CONFIRMED">Da duyet</option>
                    <option value="CHECKED_IN">Da check-in</option>
                    <option value="CANCELLED">Da huy</option>
                    <option value="ALL">Tat ca</option>
                  </SelectInput>
                  <TextInput type="date" value={appointmentDateFilter} onChange={event => setAppointmentDateFilter(event.target.value)} className="w-auto min-w-[160px]" />
                </>
              )}
            />

            {appointments.length === 0 ? (
              <EmptyState title="Chua co appointment phu hop" description="Thu thay doi bo loc hoac tu khoa tim kiem." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Benh nhan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Lich hen</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bác sĩ / Khoa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trang thai</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Hanh dong</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(item => {
                      const busy = actioningAppointmentId === item.appointmentId;
                      return (
                        <tr key={item.appointmentId} className="border-t border-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-800">{item.patient.fullName}</div>
                            <div className="text-xs text-gray-400">{item.patient.phone} · {item.patient.patientCode}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div>{formatDateTime(item.appointmentTime)}</div>
                            <div className="text-xs text-gray-400">{item.service?.name ?? 'Chua co dich vu'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div>{item.doctor?.name ?? 'Chua chon bac si'}</div>
                            <div className="text-xs text-gray-400">{item.doctor?.department?.name ?? item.room?.department?.name ?? 'Chua co khoa'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                              {APPOINTMENT_STATUS_LABELS[item.status] ?? item.status}
                            </span>
                            {item.visit?.queueNumber ? <div className="mt-1 text-xs text-emerald-700">Queue: {item.visit.queueNumber}</div> : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.status === 'SCHEDULED' ? (
                                <>
                                  <button type="button" disabled={busy} onClick={() => void handleAppointmentAction(item.appointmentId, 'approve')} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                                    Duyet
                                  </button>
                                  <button type="button" disabled={busy} onClick={() => void handleAppointmentAction(item.appointmentId, 'reject')} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                                    Tu choi
                                  </button>
                                </>
                              ) : null}
                              {['SCHEDULED', 'CONFIRMED', 'LATE'].includes(item.status) ? (
                                <button type="button" disabled={busy} onClick={() => void handleAppointmentAction(item.appointmentId, 'check-in')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
                                  Check-in
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {activeView === 'patients' ? (
          <>
            <SearchBar value={listSearch} onChange={setListSearch} placeholder="Tim theo ten, ma BN, so dien thoai, CCCD..." />
            {patients.length === 0 ? (
              <EmptyState title="Khong co benh nhan phu hop" description="Thu thay doi tu khoa tim kiem." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ma BN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ho ten</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Lien he</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Uu tien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr key={patient.id} className="border-t border-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{patient.patientCode}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{patient.fullName}</div>
                          <div className="text-xs text-gray-400">{patient.gender} · {patient.age ?? 'N/A'} tuoi</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{patient.phone}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {[patient.isDisabledHeavy && 'Khuyet tat nang', patient.isDisabled && 'Khuyet tat', patient.isRevolutionary && 'Cach mang'].filter(Boolean).join(', ') || 'Binh thuong'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        {activeView === 'visits' ? (
          <>
            <SearchBar value={listSearch} onChange={setListSearch} placeholder="Tim theo so thu tu, ten benh nhan, phong, bac si..." />
            {visits.length === 0 ? (
              <EmptyState title="Khong co luot kham phu hop" description="Thu thay doi tu khoa tim kiem." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">So thu tu</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Benh nhan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trang thai</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng / Bác sĩ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(visit => (
                      <tr key={visit.visitId} className="border-t border-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{visit.queueNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{visit.patient.fullName}</div>
                          <div className="text-xs text-gray-400">{visit.patient.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={visit.currentState as PatientStatus} />
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {visit.progress?.laneType ? <LaneBadge lane={visit.progress.laneType} size="sm" /> : null}
                            {visit.priorityReason ? <PriorityBadge reason={visit.priorityReason} size="sm" /> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{visit.room?.name ?? 'Chua co phong'}</div>
                          <div className="text-xs text-gray-400">{visit.doctor?.name ?? 'Chua co bac si'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        {activeView === 'queue' ? (
          <SectionCard title="Hàng đợi" description="Danh sách hàng đợi đang hoạt động.">
            {queueUsingDemoData ? (
              <div className="mb-3 flex justify-end">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Dữ liệu mẫu</span>
              </div>
            ) : null}
            {queueCardError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Không tải được hàng đợi: {queueCardError}
              </div>
            ) : queueItems.length === 0 ? (
              <EmptyState title="Chưa có hàng đợi phù hợp" description="Không có bệnh nhân nào trong hàng đợi đang hoạt động." />
            ) : (
              <div className="space-y-3">
                {queueItems.map(item => (
                  <div key={item.queueItemId} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">{item.patient.fullName}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.queueNumber} · {item.room?.name ?? 'Chưa có phòng'} · {item.visit.currentState}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        <LaneBadge lane={item.priority.laneType} size="sm" />
                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                          {QUEUE_STATUS_LABELS[item.currentStatus] ?? item.currentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        <Modal
          open={phoneMatches.length > 0}
          title="Ho so trung so dien thoai"
          onClose={closePhoneMatchModal}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closePhoneMatchModal} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Dong
              </button>
              <button type="button" onClick={handleCreateNewForPhoneMatch} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                Tao ho so moi
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">So dien thoai da ton tai. Le tan chon ho so cu hoac tao ho so moi neu da xac minh dung nghiep vu.</p>
            <div className="space-y-2">
              {phoneMatches.map(patient => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleUsePhoneMatch(patient)}
                  className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-left hover:border-sky-200 hover:bg-sky-50"
                >
                  <span>
                    <span className="block font-semibold text-gray-900">{patient.fullName}</span>
                    <span className="block text-xs text-gray-500">
                      {patient.patientCode} · {patient.phone || 'Chua co SDT'} · {patient.idNumber || 'Chua co CCCD'}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-sky-700">Dung ho so nay</span>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
