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
import { appointmentApi } from '../services/appointmentApi';
import { departmentApi } from '../services/departmentApi';
import { doctorApi } from '../services/doctorApi';
import { patientApi } from '../services/patientApi';
import { queueApi } from '../services/queueApi';
import { serviceApi } from '../services/serviceApi';
import { visitApi } from '../services/visitApi';
import { ApiError } from '../services/http';
import type {
  AppointmentListItemDto,
  DepartmentDto,
  DoctorDto,
  PatientCreateInputDto,
  PatientDto,
  QueueItemSummaryDto,
  ServiceDto,
  VisitDetailForActionDto,
  VisitListItemDto,
  WalkInRegistrationInputDto,
} from '../services/backend-types';
import { formatDateTime } from '../lib/format';
import StatusBadge from '../components/ui/StatusBadge';
import { LaneBadge, PriorityBadge } from '../components/ui/PriorityBadge';
import type { PatientStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';

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
  'patient-records': 'Tạo hồ sơ bệnh nhân',
  'walk-in': 'Đăng ký khám tại quầy',
  appointments: 'Đặt lịch và duyệt lịch online',
  patients: 'Danh sách bệnh nhân',
  visits: 'Danh sách lượt khám',
  queue: 'Hàng đợi khám',
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  SCHEDULED: 'Chờ duyệt',
  CONFIRMED: 'Đã duyệt',
  CHECKED_IN: 'Đã check-in',
  LATE: 'Đến muộn',
  NO_SHOW: 'Vắng mặt',
  CANCELLED: 'Đã hủy',
};

const QUEUE_STATUS_LABELS: Record<string, string> = {
  WAITING: 'Đang chờ',
  CALLED: 'Đã gọi',
  SERVING: 'Đang phục vụ',
  DONE: 'Hoàn tất',
  TIMEOUT: 'Quá giờ',
  CANCELLED: 'Đã hủy',
};

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInput = (value: Date) => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

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
        department.name.toLowerCase().includes('cận lâm sàng') ||
        department.name.toLowerCase().includes('can lam sang')),
  );

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

const createAppointmentForm = (): AppointmentFormState => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultTime = new Date();
  defaultTime.setHours(9, 0, 0, 0);

  return {
    ...createBasePatientForm(),
    departmentId: '',
    serviceId: '',
    doctorId: '',
    appointmentDate: toDateInput(tomorrow),
    appointmentTime: toTimeInput(defaultTime),
    chiefComplaint: '',
    note: '',
    isPregnant: false,
    isUrgent: false,
  };
};

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

function ReceptionPageHeader({
  activeView,
  onRefresh,
  refreshing,
}: {
  activeView: ReceptionView;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
            Quầy lễ tân
          </p>
          <h1 className="mt-3 text-2xl font-black text-gray-950 md:text-3xl">{VIEW_TITLES[activeView]}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Tách riêng tạo hồ sơ, đăng ký khám tại quầy và đặt lịch. Walk-in tạo Visit, queue number và hàng đợi ngay; appointment chỉ vào queue khi check-in.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
        >
          <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
          Làm mới dữ liệu
        </button>
      </div>
    </div>
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
        <FieldLabel required>Họ và tên</FieldLabel>
        <TextInput value={value.fullName} onChange={event => onChange('fullName', event.target.value)} placeholder="Nguyễn Văn A" />
      </div>
      <div>
        <FieldLabel required>Số điện thoại</FieldLabel>
        <TextInput value={value.phone} onChange={event => onChange('phone', event.target.value)} placeholder="09..." />
      </div>
      <div>
        <FieldLabel required>Giới tính</FieldLabel>
        <SelectInput value={value.gender} onChange={event => onChange('gender', event.target.value as GenderValue)}>
          <option value="MALE">Nam</option>
          <option value="FEMALE">Nữ</option>
          <option value="OTHER">Khác</option>
        </SelectInput>
      </div>
      <div>
        <FieldLabel>Ngày sinh</FieldLabel>
        <TextInput type="date" value={value.dateOfBirth} onChange={event => onChange('dateOfBirth', event.target.value)} />
      </div>
      <div>
        <FieldLabel>CCCD</FieldLabel>
        <TextInput value={value.idNumber} onChange={event => onChange('idNumber', event.target.value)} />
      </div>
      <div>
        <FieldLabel>Số BHYT</FieldLabel>
        <TextInput value={value.insuranceNumber} onChange={event => onChange('insuranceNumber', event.target.value)} />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Địa chỉ</FieldLabel>
        <TextInput value={value.address} onChange={event => onChange('address', event.target.value)} />
      </div>
      <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
        <ToggleRow
          checked={value.isDisabled}
          label="Người khuyết tật"
          description="Tính vào ưu tiên nghiệp vụ nếu có."
          onChange={next => onChange('isDisabled', next)}
        />
        <ToggleRow
          checked={value.isDisabledHeavy}
          label="Khuyết tật nặng"
          description="Mức ưu tiên cao hơn nếu có."
          onChange={next => onChange('isDisabledHeavy', next)}
        />
        <ToggleRow
          checked={value.isRevolutionary}
          label="Đối tượng cách mạng"
          description="Lưu vào hồ sơ bệnh nhân."
          onChange={next => onChange('isRevolutionary', next)}
        />
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get('view') as ReceptionView | null) ?? 'walk-in';

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorDto[]>([]);

  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [visits, setVisits] = useState<VisitListItemDto[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItemSummaryDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentListItemDto[]>([]);

  const [listSearch, setListSearch] = useState('');
  const [appointmentStatus, setAppointmentStatus] = useState('PENDING');
  const [appointmentDateFilter, setAppointmentDateFilter] = useState('');

  const [walkInForm, setWalkInForm] = useState<WalkInFormState>(() => createWalkInForm());
  const visitInfoRef = useRef<HTMLDivElement | null>(null);
  const [selectedWalkInPatientId, setSelectedWalkInPatientId] = useState<string | null>(null);
  const [walkInPatientSearch, setWalkInPatientSearch] = useState('');
  const [walkInPatientMatches, setWalkInPatientMatches] = useState<PatientDto[]>([]);
  const [walkInPatientSearchLoading, setWalkInPatientSearchLoading] = useState(false);
  const [pendingWalkInPayload, setPendingWalkInPayload] = useState<WalkInRegistrationInputDto | null>(null);
  const [pendingPatientPayload, setPendingPatientPayload] = useState<PatientCreateInputDto | null>(null);
  const [pendingPatientTarget, setPendingPatientTarget] = useState<'patient-records' | 'walk-in' | null>(null);
  const [phoneMatches, setPhoneMatches] = useState<PhoneMatchPatient[]>([]);
  const [patientForm, setPatientForm] = useState<BasePatientForm>(() => createBasePatientForm());
  const [selectedPatientRecordId, setSelectedPatientRecordId] = useState<string | null>(null);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormState>(() => createAppointmentForm());

  const [submittingPatient, setSubmittingPatient] = useState(false);
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);
  const [actioningAppointmentId, setActioningAppointmentId] = useState<string | null>(null);

  const [patientSuccess, setPatientSuccess] = useState<PatientDto | null>(null);
  const [patientSuccessMode, setPatientSuccessMode] = useState<'created' | 'selected' | null>(null);
  const [walkInSuccess, setWalkInSuccess] = useState<VisitDetailForActionDto | null>(null);
  const [appointmentSuccess, setAppointmentSuccess] = useState<AppointmentListItemDto | null>(null);
  const [submitError, setSubmitError] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const activeDepartment = useMemo(
    () => departments.find(department => department.id === walkInForm.departmentId) ?? null,
    [departments, walkInForm.departmentId],
  );
  const activeAppointmentDepartment = useMemo(
    () => departments.find(department => department.id === appointmentForm.departmentId) ?? null,
    [appointmentForm.departmentId, departments],
  );

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

  useEffect(() => {
    if (walkInForm.gender !== 'FEMALE' && walkInForm.isPregnant) {
      setWalkInForm(current => ({ ...current, isPregnant: false }));
    }
  }, [walkInForm.gender, walkInForm.isPregnant]);

  useEffect(() => {
    if (activeView !== 'walk-in') {
      setWalkInPatientMatches([]);
      return;
    }

    const query = walkInPatientSearch.trim();
    if (query.length < 2) {
      setWalkInPatientMatches([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setWalkInPatientSearchLoading(true);
      patientApi
        .list({ page: 1, limit: 8, sort: 'desc', search: query })
        .then(response => {
          if (active) {
            setWalkInPatientMatches(response.data);
          }
        })
        .catch(() => {
          if (active) {
            setWalkInPatientMatches([]);
          }
        })
        .finally(() => {
          if (active) {
            setWalkInPatientSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeView, walkInPatientSearch]);

  useEffect(() => {
    if (appointmentForm.gender !== 'FEMALE' && appointmentForm.isPregnant) {
      setAppointmentForm(current => ({ ...current, isPregnant: false }));
    }
  }, [appointmentForm.gender, appointmentForm.isPregnant]);

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
      if (activeView === 'patients') {
        const response = await patientApi.list({ page: 1, limit: 100, sort: 'desc', search });
        setPatients(response.data);
        return;
      }

      if (activeView === 'walk-in') {
        const [patientResponse, visitResponse, queueResponse] = await Promise.all([
          patientApi.list({ page: 1, limit: 100, sort: 'desc', search }),
          visitApi.list({ page: 1, limit: 100, sort: 'desc', search }),
          queueApi.list({ page: 1, limit: 100, sort: 'desc', search }),
        ]);
        setPatients(patientResponse.data);
        setVisits(visitResponse.data);
        setQueueItems(queueResponse.data);
        return;
      }

      if (activeView === 'visits') {
        const response = await visitApi.list({ page: 1, limit: 100, sort: 'desc', search });
        setVisits(response.data);
        return;
      }

      if (activeView === 'queue') {
        const response = await queueApi.list({ page: 1, limit: 100, sort: 'desc', search });
        setQueueItems(response.data);
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
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu lễ tân.');
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
      activeView === 'appointments' ? appointmentForm.departmentId : walkInForm.departmentId;

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
      } catch (_err) {
        if (active) {
          setDoctorOptions([]);
        }
      }
    };

    void loadDoctors();
    return () => {
      active = false;
    };
  }, [activeView, appointmentForm.departmentId, walkInForm.departmentId]);

  useEffect(() => {
    if (!walkInForm.doctorId) return;
    if (doctorOptions.some(doctor => doctor.id === walkInForm.doctorId)) return;
    setWalkInForm(current => ({ ...current, doctorId: '' }));
  }, [doctorOptions, walkInForm.doctorId]);

  useEffect(() => {
    if (!walkInForm.departmentId) return;
    if (walkInDepartments.some(department => department.id === walkInForm.departmentId)) return;
    setWalkInForm(current => ({ ...current, departmentId: '', doctorId: '' }));
  }, [walkInDepartments, walkInForm.departmentId]);

  useEffect(() => {
    if (!appointmentForm.doctorId) return;
    if (doctorOptions.some(doctor => doctor.id === appointmentForm.doctorId)) return;
    setAppointmentForm(current => ({ ...current, doctorId: '' }));
  }, [appointmentForm.doctorId, doctorOptions]);

  const refreshCurrentView = () => setReloadKey(current => current + 1);

  const setView = (view: ReceptionView) => {
    setListSearch('');
    setSubmitError('');
    setPatientSuccess(null);
    setPatientSuccessMode(null);
    setSelectedPatientRecordId(null);
    setSearchParams({ view });
  };

  const updatePatientForm = <K extends keyof BasePatientForm>(key: K, value: BasePatientForm[K]) => {
    if (selectedPatientRecordId || patientSuccess) {
      setSelectedPatientRecordId(null);
      setPatientSuccess(null);
      setPatientSuccessMode(null);
    }
    setPatientForm(current => ({ ...current, [key]: value }));
  };

  const updateWalkInPatientForm = <K extends keyof BasePatientForm>(key: K, value: BasePatientForm[K]) => {
    setSelectedWalkInPatientId(null);
    setWalkInForm(current => ({ ...current, [key]: value }));
  };

  const updateWalkInForm = <K extends keyof WalkInFormState>(key: K, value: WalkInFormState[K]) => {
    setWalkInForm(current => ({ ...current, [key]: value }));
  };

  const updateAppointmentPatientForm = <K extends keyof BasePatientForm>(key: K, value: BasePatientForm[K]) => {
    setAppointmentForm(current => ({ ...current, [key]: value }));
  };

  const updateAppointmentForm = <K extends keyof AppointmentFormState>(key: K, value: AppointmentFormState[K]) => {
    setAppointmentForm(current => ({ ...current, [key]: value }));
  };

  const validatePediatricsSelection = (department: DepartmentDto | null, age: number | null) => {
    if (!isPediatricsDepartment(department)) return '';
    if (age === null) return 'Cần ngày sinh để kiểm tra điều kiện chọn khoa Nhi.';
    if (age >= 15) return 'Chỉ bệnh nhân dưới 15 tuổi mới được chọn khoa Nhi.';
    return '';
  };

  const walkInPediatricsError = validatePediatricsSelection(activeDepartment, walkInAge);
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
    if (!form.fullName.trim()) {
      return 'Vui long nhap ho va ten truoc khi tao ho so.';
    }

    if (!form.phone.trim()) {
      return 'Vui long nhap so dien thoai truoc khi tao ho so.';
    }

    return '';
  };

  const buildWalkInPayload = (): WalkInRegistrationInputDto => {
    const patientId = selectedWalkInPatientId;

    return {
      ...buildPatientPayload(walkInForm),
      departmentId: walkInForm.departmentId,
      serviceId: walkInForm.serviceId,
      doctorId: walkInForm.doctorId || null,
      chiefComplaint: walkInForm.chiefComplaint.trim() || null,
      note: walkInForm.note.trim() || null,
      isPregnant: walkInForm.gender === 'FEMALE' ? walkInForm.isPregnant : false,
      isUrgent: walkInForm.isUrgent,
      selectedPatientId: patientId,
      patientId,
      updatedById: user?.id ?? null,
    };
  };

  const resetWalkInForm = () => {
    setWalkInForm(createWalkInForm());
    setSelectedWalkInPatientId(null);
    setWalkInPatientSearch('');
    setWalkInPatientMatches([]);
  };

  const resetPatientRecordForm = () => {
    setPatientForm(createBasePatientForm());
    setSelectedPatientRecordId(null);
    setPatientSuccess(null);
    setPatientSuccessMode(null);
    setPendingPatientPayload(null);
    setPendingPatientTarget(null);
    setPhoneMatches([]);
    setSubmitError('');
  };

  const selectWalkInPatient = (patient: PatientDto) => {
    setWalkInForm(current => ({
      ...current,
      ...toPatientForm(patient),
    }));
    setSelectedWalkInPatientId(patient.id);
    setWalkInPatientSearch(`${patient.fullName} ${patient.patientCode}`);
    setWalkInPatientMatches([]);
  };

  const getPhoneMatchesFromError = (err: unknown) => {
    if (!(err instanceof ApiError) || err.code !== 'PHONE_MATCHES_FOUND') {
      return null;
    }

    const details = err.details as PhoneMatchDetails | undefined;
    return Array.isArray(details?.matches) ? details.matches : [];
  };

  const submitPatientPayload = async (
    payload: PatientCreateInputDto,
    target: 'patient-records' | 'walk-in',
  ) => {
    setSubmittingPatient(true);
    try {
      const response = await patientApi.create(payload);
      setPatientSuccess(response.data);
      setPatientSuccessMode('created');
      setPendingPatientPayload(null);
      setPendingPatientTarget(null);
      setPhoneMatches([]);
      if (target === 'patient-records') {
        setPatientForm(toPatientForm(response.data));
        setSelectedPatientRecordId(response.data.id);
      } else {
        setWalkInForm(current => ({
          ...current,
          ...toPatientForm(response.data),
        }));
        setSelectedWalkInPatientId(response.data.id);
        setWalkInPatientSearch(`${response.data.fullName} ${response.data.patientCode}`);
      }
      refreshCurrentView();
    } catch (err) {
      const matches = getPhoneMatchesFromError(err);
      if (matches) {
        if (matches.length === 0) {
          setSubmitError(err instanceof Error ? err.message : 'So dien thoai da ton tai nhung backend khong tra ve danh sach ho so.');
          return;
        }

        setPendingPatientPayload(payload);
        setPendingPatientTarget(target);
        setPhoneMatches(matches);
        setSubmitError('');
        return;
      }

      setSubmitError(err instanceof Error ? err.message : 'Khong tao duoc ho so benh nhan.');
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
      resetWalkInForm();
      refreshCurrentView();
    } catch (err) {
      const matches = getPhoneMatchesFromError(err);
      if (matches) {
        if (matches.length === 0) {
          setSubmitError(err instanceof Error ? err.message : 'So dien thoai da ton tai nhung backend khong tra ve danh sach ho so.');
          return;
        }

        setPendingWalkInPayload(payload);
        setPhoneMatches(matches);
        setSubmitError('');
        return;
      }

      setSubmitError(err instanceof Error ? err.message : 'Khong dang ky kham tai quay duoc.');
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  const handleUsePhoneMatch = (patient: PhoneMatchPatient) => {
    if (pendingWalkInPayload) {
      selectWalkInPatient(patient);
      void submitWalkInPayload({
        ...pendingWalkInPayload,
        ...toPatientForm(patient),
        selectedPatientId: patient.id,
        patientId: patient.id,
        createNewPatientOnPhoneMatch: false,
      });
      return;
    }

    if (pendingPatientPayload) {
      if (pendingPatientTarget === 'walk-in') {
        selectWalkInPatient(patient);
      } else {
        setPatientForm(toPatientForm(patient));
        setSelectedPatientRecordId(patient.id);
      }
      setPatientSuccess(patient);
      setPatientSuccessMode('selected');
      setPendingPatientPayload(null);
      setPendingPatientTarget(null);
      setPhoneMatches([]);
      setSubmitError('');
    }
  };

  const handleCreateNewForPhoneMatch = () => {
    if (pendingWalkInPayload) {
      void submitWalkInPayload({
        ...pendingWalkInPayload,
        selectedPatientId: null,
        createNewPatientOnPhoneMatch: true,
      });
      return;
    }

    if (pendingPatientPayload) {
      void submitPatientPayload(
        {
          ...pendingPatientPayload,
          createNewPatientOnPhoneMatch: true,
        },
        pendingPatientTarget ?? 'patient-records',
      );
    }
  };

  const closePhoneMatchModal = () => {
    setPendingWalkInPayload(null);
    setPendingPatientPayload(null);
    setPendingPatientTarget(null);
    setPhoneMatches([]);
  };

  const handleCreatePatient = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedPatientRecordId) {
      return;
    }
    setSubmitError('');
    setPatientSuccess(null);
    setPatientSuccessMode(null);
    await submitPatientPayload(buildPatientPayload(patientForm), 'patient-records');
  };

  const handleCreateWalkInPatientRecord = async () => {
    setSubmitError('');
    setPatientSuccess(null);
    setWalkInSuccess(null);

    const validationError = validatePatientRecordForm(walkInForm);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    await submitPatientPayload(buildPatientPayload(walkInForm), 'walk-in');
  };

  const startWalkInForCreatedPatient = () => {
    if (!patientSuccess) return;

    setWalkInForm(current => ({
      ...current,
      ...toPatientForm(patientSuccess),
    }));
    setSelectedWalkInPatientId(patientSuccess.id);
    setWalkInPatientSearch(`${patientSuccess.fullName} ${patientSuccess.patientCode}`);
    setWalkInPatientMatches([]);
    setSubmitError('');
    setSearchParams({ view: 'walk-in' });
    window.setTimeout(() => {
      visitInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleWalkIn = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    setWalkInSuccess(null);

    if (walkInPediatricsError) {
      setSubmitError(walkInPediatricsError);
      return;
    }

    await submitWalkInPayload(buildWalkInPayload());
  };

  const handleCreateAppointment = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (appointmentPediatricsError) {
      setSubmitError(appointmentPediatricsError);
      return;
    }

    const appointmentTime = new Date(`${appointmentForm.appointmentDate}T${appointmentForm.appointmentTime}:00`);
    if (Number.isNaN(appointmentTime.getTime())) {
      setSubmitError('Thời gian khám không hợp lệ.');
      return;
    }

    setSubmittingAppointment(true);
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
      setAppointmentForm(createAppointmentForm());
      refreshCurrentView();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không tạo được lịch khám.');
    } finally {
      setSubmittingAppointment(false);
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject' | 'check-in') => {
    setSubmitError('');
    setActioningAppointmentId(appointmentId);
    try {
      if (action === 'approve') {
        await appointmentApi.approve(appointmentId);
      } else if (action === 'reject') {
        await appointmentApi.reject(appointmentId);
      } else {
        await appointmentApi.checkIn(appointmentId, { updatedById: user?.id ?? null });
      }

      refreshCurrentView();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không cập nhật được lịch hẹn.');
    } finally {
      setActioningAppointmentId(null);
    }
  };

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

  const tabs: Array<{ key: ReceptionView; label: string; icon: React.ReactNode }> = [
    { key: 'patient-records', label: 'Tạo hồ sơ', icon: <UserPlus2 size={14} /> },
    { key: 'walk-in', label: 'Khám tại quầy', icon: <Stethoscope size={14} /> },
    { key: 'appointments', label: 'Đặt lịch / Duyệt lịch', icon: <CalendarDays size={14} /> },
    { key: 'patients', label: 'Bệnh nhân', icon: <Users size={14} /> },
    { key: 'visits', label: 'Lượt khám', icon: <Clock3 size={14} /> },
    { key: 'queue', label: 'Hàng đợi', icon: <FilePlus2 size={14} /> },
  ];

  return (
    <Layout pageTitle={VIEW_TITLES[activeView]}>
      <div className="space-y-5">
        <ReceptionPageHeader activeView={activeView} onRefresh={refreshCurrentView} refreshing={refreshing} />

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

        {activeView === 'patient-records' && (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Chỉ tạo hồ sơ bệnh nhân" description="Flow này chỉ tạo hoặc cập nhật Patient, không sinh Visit và không đưa vào hàng đợi.">
              <form className="space-y-4" onSubmit={handleCreatePatient}>
                <PatientFields value={patientForm} onChange={(key, value) => updatePatientForm(key, value)} />
                <div className="flex gap-3">
                  <button type="submit" disabled={submittingPatient || Boolean(selectedPatientRecordId)} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                    {submittingPatient ? 'Đang lưu...' : 'Tạo hồ sơ'}
                  </button>
                  <button type="button" onClick={resetPatientRecordForm} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    Tạo hồ sơ khác
                  </button>
                </div>
                {selectedPatientRecordId ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    {patientSuccessMode === 'selected' ? 'Hồ sơ có sẵn đang được chọn.' : 'Hồ sơ vừa tạo đang được chọn.'}
                  </p>
                ) : null}
              </form>
            </SectionCard>

            <SectionCard title="Kết quả gần nhất" description="Sau khi tạo hồ sơ, bệnh nhân chỉ xuất hiện ở danh sách Patient cho đến khi được đăng ký khám.">
              {patientSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-700" size={20} />
                    <div>
                      <p className="font-semibold text-emerald-900">
                        {patientSuccessMode === 'selected' ? 'Đã chọn hồ sơ bệnh nhân có sẵn.' : 'Đã tạo hồ sơ bệnh nhân.'}
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        {patientSuccess.fullName} · {patientSuccess.patientCode}
                      </p>
                      <button
                        type="button"
                        onClick={startWalkInForCreatedPatient}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        <FilePlus2 size={16} />
                        &#272;&#259;ng k&#253; kh&#225;m cho b&#7879;nh nh&#226;n n&#224;y
                      </button>
                      <button
                        type="button"
                        onClick={resetPatientRecordForm}
                        className="ml-2 mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        Tạo hồ sơ khác
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  Chưa có hồ sơ nào được tạo trong phiên làm việc này.
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {activeView === 'walk-in' && (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="Đăng ký khám ngay trong ngày" description="Flow này không có chọn giờ khám. Submit xong phải có Visit, QueueItem, Turn và số thứ tự.">
              <form className="space-y-4" onSubmit={handleWalkIn}>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4 flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-gray-900">Thông tin hồ sơ bệnh nhân</h4>
                    <p className="text-xs text-gray-500">Tìm theo CCCD, số điện thoại, BHYT hoặc họ tên; chọn hồ sơ chỉ điền phần bệnh nhân.</p>
                  </div>
                  <div className="mb-4">
                    <FieldLabel>Tìm hồ sơ đã có</FieldLabel>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <TextInput
                        value={walkInPatientSearch}
                        onChange={event => setWalkInPatientSearch(event.target.value)}
                        placeholder="CCCD, SĐT, BHYT hoặc họ tên"
                        className="pl-9"
                      />
                    </div>
                    {selectedWalkInPatientId ? (
                      <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                        Đang dùng hồ sơ bệnh nhân đã chọn. Sửa thông tin định danh sẽ bỏ chọn hồ sơ này.
                      </p>
                    ) : null}
                    {walkInPatientSearchLoading ? (
                      <p className="mt-2 text-xs text-gray-500">Đang tìm hồ sơ...</p>
                    ) : null}
                    {walkInPatientMatches.length > 0 ? (
                      <div className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                        {walkInPatientMatches.map(patient => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => selectWalkInPatient(patient)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-sky-50"
                          >
                            <span>
                              <span className="font-semibold text-gray-900">{patient.fullName}</span>
                              <span className="ml-2 text-xs text-gray-500">{patient.patientCode}</span>
                              <span className="mt-0.5 block text-xs text-gray-500">
                                {patient.phone || 'Chưa có SĐT'} · {patient.idNumber || 'Chưa có CCCD'} · {patient.insuranceNumber || 'Chưa có BHYT'}
                              </span>
                            </span>
                            <span className="text-xs font-semibold text-sky-700">Chọn</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <PatientFields value={walkInForm} onChange={updateWalkInPatientForm} />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCreateWalkInPatientRecord}
                      disabled={submittingPatient || submittingWalkIn || Boolean(selectedWalkInPatientId)}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      <UserPlus2 size={16} />
                      T&#7841;o h&#7891; s&#417;
                    </button>
                    {selectedWalkInPatientId ? (
                      <span className="text-xs font-semibold text-emerald-700">H&#7891; s&#417; &#273;&#227; &#273;&#432;&#7907;c ch&#7885;n.</span>
                    ) : null}
                  </div>
                  {patientSuccess ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-700" size={20} />
                        <div>
                          <p className="font-semibold text-emerald-900">
                            {patientSuccessMode === 'selected' ? 'Đã chọn hồ sơ bệnh nhân có sẵn.' : 'Đã tạo hồ sơ bệnh nhân.'}
                          </p>
                          <p className="mt-1 text-sm text-emerald-700">
                            {patientSuccess.fullName} &middot; {patientSuccess.patientCode}
                          </p>
                          <button
                            type="button"
                            onClick={startWalkInForCreatedPatient}
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                          >
                            <FilePlus2 size={16} />
                            &#272;&#259;ng k&#253; kh&#225;m cho b&#7879;nh nh&#226;n n&#224;y
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              resetWalkInForm();
                              setPatientSuccess(null);
                              setPatientSuccessMode(null);
                              setSubmitError('');
                            }}
                            className="ml-2 mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Tạo hồ sơ khác
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div ref={visitInfoRef} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-gray-900">Thông tin lượt khám</h4>
                    <p className="text-xs text-gray-500">Thông tin tiếp nhận cho visit hiện tại, luôn bắt đầu mới sau mỗi lần đăng ký.</p>
                  </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel required>Khoa khám</FieldLabel>
                    <SelectInput value={walkInForm.departmentId} onChange={event => updateWalkInForm('departmentId', event.target.value)}>
                      <option value="" disabled hidden>Chọn khoa</option>
                      {walkInDepartments.map(department => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </SelectInput>
                    {walkInPediatricsError ? <p className="mt-1 text-xs text-rose-600">{walkInPediatricsError}</p> : null}
                  </div>
                  <div>
                    <FieldLabel required>Dịch vụ khám</FieldLabel>
                    <SelectInput value={walkInForm.serviceId} onChange={event => updateWalkInForm('serviceId', event.target.value)}>
                      <option value="" disabled hidden>Chọn dịch vụ</option>
                      {examServices.map(service => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Bác sĩ yêu cầu</FieldLabel>
                    <SelectInput value={walkInForm.doctorId} onChange={event => updateWalkInForm('doctorId', event.target.value)} disabled={!walkInForm.departmentId}>
                      <option value="" disabled hidden>Chọn bác sĩ</option>
                      {doctorOptions.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Tuổi tính từ ngày sinh</FieldLabel>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                      {walkInAge ?? 'Chưa xác định'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>Lý do khám</FieldLabel>
                    <TextArea rows={3} value={walkInForm.chiefComplaint} onChange={event => updateWalkInForm('chiefComplaint', event.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>Ghi chú</FieldLabel>
                    <TextArea rows={2} value={walkInForm.note} onChange={event => updateWalkInForm('note', event.target.value)} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    checked={walkInForm.isPregnant}
                    disabled={walkInForm.gender !== 'FEMALE'}
                    label="Có thai"
                    description={walkInForm.gender === 'FEMALE' ? 'Chỉ bật cho bệnh nhân nữ.' : 'Bị khóa và tự reset false nếu không phải nữ.'}
                    onChange={next => updateWalkInForm('isPregnant', next)}
                  />
                  <ToggleRow
                    checked={walkInForm.isUrgent}
                    label="Khẩn / cần ưu tiên"
                    description="Đẩy vào luồng ưu tiên nếu nghiệp vụ áp dụng."
                    onChange={next => updateWalkInForm('isUrgent', next)}
                  />
                </div>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
                  Khám tại quầy luôn là “khám ngay trong ngày”. Không có field chọn thời gian khám ở flow này.
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={submittingWalkIn} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                    {submittingWalkIn ? 'Đang đăng ký...' : 'Đăng ký khám tại quầy'}
                  </button>
                  <button type="button" onClick={resetWalkInForm} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    Làm mới form
                  </button>
                </div>
              </form>
            </SectionCard>

            <div className="space-y-4">
              <SectionCard title="Kết quả đăng ký gần nhất" description="Nếu transaction thành công thì phải có queue number rõ ràng cho lễ tân.">
                {walkInSuccess ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">{walkInSuccess.patient.fullName}</p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Số thứ tự: <span className="font-mono font-black">{walkInSuccess.queueNumber}</span>
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Visit: {walkInSuccess.visitId} · Trạng thái: {walkInSuccess.currentState}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    Chưa có lượt đăng ký khám tại quầy nào trong phiên này.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Hàng đợi hiện tại" description="Bệnh nhân vừa đăng ký phải xuất hiện ngay ở đây nếu transaction hoàn tất.">
                {queueItems.length === 0 ? (
                  <EmptyState title="Chưa có hàng đợi" description="Backend chưa trả về queue item nào." />
                ) : (
                  <div className="space-y-3">
                    {queueItems.slice(0, 5).map(item => (
                      <div key={item.queueItemId} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-800">{item.patient.fullName}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.queueNumber} · {item.room?.name ?? 'Chưa có phòng'}
                            </p>
                          </div>
                          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                            {QUEUE_STATUS_LABELS[item.currentStatus] ?? item.currentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {activeView === 'appointments' && (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard title="Đặt lịch khám" description="Flow này chỉ tạo Appointment. Không tạo QueueItem cho đến khi check-in.">
                <form className="space-y-4" onSubmit={handleCreateAppointment}>
                  <PatientFields value={appointmentForm} onChange={updateAppointmentPatientForm} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel required>Khoa khám</FieldLabel>
                      <SelectInput value={appointmentForm.departmentId} onChange={event => updateAppointmentForm('departmentId', event.target.value)}>
                        <option value="">Chọn khoa</option>
                        {departments.map(department => (
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
                      <FieldLabel>Bác sĩ yêu cầu</FieldLabel>
                      <SelectInput value={appointmentForm.doctorId} onChange={event => updateAppointmentForm('doctorId', event.target.value)} disabled={!appointmentForm.departmentId}>
                        <option value="">Để hệ thống sắp xếp</option>
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
                      <FieldLabel required>Ngày khám</FieldLabel>
                      <TextInput type="date" value={appointmentForm.appointmentDate} onChange={event => updateAppointmentForm('appointmentDate', event.target.value)} />
                    </div>
                    <div>
                      <FieldLabel required>Giờ khám</FieldLabel>
                      <TextInput type="time" value={appointmentForm.appointmentTime} onChange={event => updateAppointmentForm('appointmentTime', event.target.value)} />
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
                    <ToggleRow
                      checked={appointmentForm.isPregnant}
                      disabled={appointmentForm.gender !== 'FEMALE'}
                      label="Có thai"
                      description={appointmentForm.gender === 'FEMALE' ? 'Chỉ bật cho bệnh nhân nữ.' : 'Bị khóa và tự reset false nếu không phải nữ.'}
                      onChange={next => updateAppointmentForm('isPregnant', next)}
                    />
                    <ToggleRow
                      checked={appointmentForm.isUrgent}
                      label="Cần ưu tiên"
                      description="Áp dụng khi check-in nếu nghiệp vụ phù hợp."
                      onChange={next => updateAppointmentForm('isUrgent', next)}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" disabled={submittingAppointment} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                      {submittingAppointment ? 'Đang tạo...' : 'Tạo appointment'}
                    </button>
                    <button type="button" onClick={() => setAppointmentForm(createAppointmentForm())} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                      Làm mới form
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title="Lịch vừa tạo" description="Appointment đã xác nhận vẫn chưa vào queue cho đến khi check-in.">
                {appointmentSuccess ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-semibold text-emerald-900">{appointmentSuccess.patient.fullName}</p>
                    <p className="mt-1 text-sm text-emerald-700">
                      {formatDateTime(appointmentSuccess.appointmentTime)} · {APPOINTMENT_STATUS_LABELS[appointmentSuccess.status] ?? appointmentSuccess.status}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    Chưa có appointment mới nào trong phiên này.
                  </p>
                )}
              </SectionCard>
            </div>

            <SearchBar
              value={listSearch}
              onChange={setListSearch}
              placeholder="Tìm theo tên bệnh nhân, số điện thoại, CCCD, mã lịch..."
              right={(
                <>
                  <SelectInput value={appointmentStatus} onChange={event => setAppointmentStatus(event.target.value)} className="w-auto min-w-[170px]">
                    <option value="PENDING">Chờ duyệt</option>
                    <option value="CONFIRMED">Đã duyệt</option>
                    <option value="CHECKED_IN">Đã check-in</option>
                    <option value="CANCELLED">Đã hủy</option>
                    <option value="ALL">Tất cả</option>
                  </SelectInput>
                  <TextInput type="date" value={appointmentDateFilter} onChange={event => setAppointmentDateFilter(event.target.value)} className="w-auto min-w-[160px]" />
                </>
              )}
            />

            {appointments.length === 0 ? (
              <EmptyState title="Chưa có appointment phù hợp" description="Danh sách này dùng để lễ tân duyệt, hủy hoặc check-in appointment." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Lịch hẹn</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bác sĩ / Khoa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Hành động</th>
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
                            <div className="text-xs text-gray-400">{item.service?.name ?? 'Chưa có dịch vụ'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div>{item.doctor?.name ?? 'Chưa chọn bác sĩ'}</div>
                            <div className="text-xs text-gray-400">{item.doctor?.department?.name ?? item.room?.department?.name ?? 'Chưa có khoa'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                              {APPOINTMENT_STATUS_LABELS[item.status] ?? item.status}
                            </span>
                            {item.visit?.queueNumber ? (
                              <div className="mt-1 text-xs text-emerald-700">Queue: {item.visit.queueNumber}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.status === 'SCHEDULED' && (
                                <>
                                  <button type="button" disabled={busy} onClick={() => void handleAppointmentAction(item.appointmentId, 'approve')} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                                    Duyệt
                                  </button>
                                  <button type="button" disabled={busy} onClick={() => void handleAppointmentAction(item.appointmentId, 'reject')} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                                    Từ chối
                                  </button>
                                </>
                              )}
                              {['SCHEDULED', 'CONFIRMED', 'LATE'].includes(item.status) && (
                                <button type="button" disabled={busy} onClick={() => void handleAppointmentAction(item.appointmentId, 'check-in')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
                                  Check-in
                                </button>
                              )}
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
        )}

        {activeView === 'patients' && (
          <>
            <SearchBar value={listSearch} onChange={setListSearch} placeholder="Tìm theo tên, mã BN, số điện thoại, CCCD..." />
            {patients.length === 0 ? (
              <EmptyState title="Không có bệnh nhân phù hợp" description="Thử thay đổi từ khóa tìm kiếm." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Mã BN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Họ tên</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Liên hệ</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ưu tiên hồ sơ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr key={patient.id} className="border-t border-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{patient.patientCode}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{patient.fullName}</div>
                          <div className="text-xs text-gray-400">{patient.gender} · {patient.age ?? 'N/A'} tuổi</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{patient.phone}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {[patient.isDisabledHeavy && 'Khuyết tật nặng', patient.isDisabled && 'Khuyết tật', patient.isRevolutionary && 'Cách mạng'].filter(Boolean).join(', ') || 'Bình thường'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeView === 'visits' && (
          <>
            <SearchBar value={listSearch} onChange={setListSearch} placeholder="Tìm theo số thứ tự, tên bệnh nhân, phòng, bác sĩ..." />
            {visits.length === 0 ? (
              <EmptyState title="Không có lượt khám phù hợp" description="Thử thay đổi từ khóa tìm kiếm." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Số thứ tự</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng / Bác sĩ</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ưu tiên</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(visit => (
                      <tr key={visit.visitId} className="border-t border-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{visit.queueNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{visit.patient.fullName}</div>
                          <div className="text-xs text-gray-400">{visit.patient.patientCode} · {visit.patient.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={visit.currentState as PatientStatus} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{visit.room?.name ?? 'Chưa có phòng'}</div>
                          <div className="text-xs text-gray-400">{visit.doctor?.name ?? 'Chưa có bác sĩ'}</div>
                        </td>
                        <td className="px-4 py-3">
                          {visit.priorityReason ? <PriorityBadge reason={visit.priorityReason as never} size="sm" /> : <span className="text-xs text-gray-400">Bình thường</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeView === 'queue' && (
          <>
            <SearchBar value={listSearch} onChange={setListSearch} placeholder="Tìm theo số thứ tự, bệnh nhân, phòng..." />
            {queueItems.length === 0 ? (
              <EmptyState title="Chưa có hàng đợi phù hợp" description="Thử thay đổi từ khóa tìm kiếm." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Số thứ tự</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Làn</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng / Dịch vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueItems.map(item => (
                      <tr key={item.queueItemId} className="border-t border-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{item.queueNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{item.patient.fullName}</div>
                          <div className="text-xs text-gray-400">{item.patient.patientCode} · {item.patient.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <LaneBadge lane={item.priority.laneType} size="sm" />
                            {item.priority.priorityReason ? <PriorityBadge reason={item.priority.priorityReason as never} size="sm" /> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                            {QUEUE_STATUS_LABELS[item.currentStatus] ?? item.currentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{item.room?.name ?? 'Chưa có phòng'}</div>
                          <div className="text-xs text-gray-400">{item.service?.name ?? 'Chưa có dịch vụ'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      <Modal
        open={phoneMatches.length > 0 && Boolean(pendingWalkInPayload || pendingPatientPayload)}
        onClose={closePhoneMatchModal}
        title="Số điện thoại đã có hồ sơ"
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={closePhoneMatchModal}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleCreateNewForPhoneMatch}
              disabled={submittingWalkIn || submittingPatient}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              Vẫn tạo hồ sơ mới
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {pendingWalkInPayload
              ? 'Số điện thoại này trùng với hồ sơ đã có. Chọn hồ sơ cũ để tạo lượt khám cho bệnh nhân đó, hoặc xác nhận tạo hồ sơ mới nếu đây là người khác dùng chung số điện thoại.'
              : 'Số điện thoại này trùng với hồ sơ đã có. Chọn hồ sơ cũ để dùng lại thông tin bệnh nhân, hoặc xác nhận vẫn tạo hồ sơ mới nếu đây là người khác dùng chung số điện thoại.'}
          </p>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
            {phoneMatches.map(patient => (
              <div key={patient.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {patient.fullName} <span className="font-mono text-xs text-gray-500">{patient.patientCode}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {patient.phone || 'Chưa có SĐT'} · {patient.idNumber || 'Chưa có CCCD'} · {patient.insuranceNumber || 'Chưa có BHYT'}
                  </p>
                  {patient.hasActiveVisitOrQueue ? (
                    <p className="mt-1 text-xs font-semibold text-amber-700">Đang có lượt khám hoặc hàng đợi active.</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleUsePhoneMatch(patient)}
                  disabled={submittingWalkIn || submittingPatient}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  Dùng hồ sơ này
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
