import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Bell,
  CalendarCheck,
  Clock3,
  FilePlus2,
  ListChecks,
  Printer,
  Search,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';

type ReceptionStatus =
  | 'Chờ tiếp nhận'
  | 'Đã tiếp nhận'
  | 'Chờ xác nhận lịch hẹn'
  | 'Chờ khám'
  | 'Đang khám'
  | 'Chờ CLS'
  | 'Đang thực hiện CLS'
  | 'Chờ kết quả'
  | 'Chờ kết luận'
  | 'Hoàn tất';

interface ReceptionPatient {
  stt: string;
  code: string;
  name: string;
  phone: string;
  registrationType: 'Đặt lịch trước' | 'Đến trực tiếp';
  department: string;
  expectedDoctor: string;
  room: string;
  status: ReceptionStatus;
  priority?: boolean;
  waitTime: string;
  expectedWait: string;
  address: string;
  note: string;
}

interface DoctorSchedule {
  name: string;
  department: string;
  waiting: number;
  time: string;
  status: 'Đang làm việc' | 'Tạm nghỉ' | 'Hết lịch';
}

const STATUS_FILTERS = ['Chờ tiếp nhận', 'Đã tiếp nhận', 'Chờ khám', 'Đang khám', 'Chờ CLS', 'Hoàn tất'] as const;

const PATIENTS: ReceptionPatient[] = [
  { stt: '001', code: 'BN001', name: 'Nguyễn Thị Lan', phone: '0987654321', registrationType: 'Đặt lịch trước', department: 'Sản khoa', expectedDoctor: 'BS Nguyễn Văn An', room: 'Phòng 201', status: 'Chờ tiếp nhận', priority: true, waitTime: '04 phút', expectedWait: '10 phút', address: 'Quận 3, TP.HCM', note: 'Đã đặt lịch trước, thai 28 tuần, cần xác minh thông tin BHYT.' },
  { stt: '002', code: 'BN002', name: 'Trần Minh Anh', phone: '0912345678', registrationType: 'Đến trực tiếp', department: 'Sản khoa', expectedDoctor: 'BS Nguyễn Văn An', room: 'Phòng 201', status: 'Đã tiếp nhận', waitTime: '08 phút', expectedWait: '18 phút', address: 'Quận 7, TP.HCM', note: 'Đã tạo hồ sơ và cần cấp số thứ tự.' },
  { stt: '003', code: 'BN003', name: 'Phạm Thu Hà', phone: '0901122334', registrationType: 'Đặt lịch trước', department: 'Phụ khoa', expectedDoctor: 'BS Trần Thu Hà', room: 'Phòng 204', status: 'Chờ khám', waitTime: '21 phút', expectedWait: '25 phút', address: 'Bình Thạnh, TP.HCM', note: 'Đã xác nhận lịch hẹn, đang chờ gọi vào phòng khám.' },
  { stt: '004', code: 'BN004', name: 'Lê Hoàng Mai', phone: '0933445566', registrationType: 'Đến trực tiếp', department: 'Sản khoa', expectedDoctor: 'BS Lê Minh Quân', room: 'Phòng 202', status: 'Chờ CLS', waitTime: '34 phút', expectedWait: '20 phút', address: 'Thủ Đức, TP.HCM', note: 'Cần hỗ trợ điều phối sang khu cận lâm sàng.' },
  { stt: '005', code: 'BN005', name: 'Hoàng Thu Trang', phone: '0966778899', registrationType: 'Đặt lịch trước', department: 'Sản khoa', expectedDoctor: 'BS Nguyễn Văn An', room: 'Phòng 201', status: 'Chờ xác nhận lịch hẹn', waitTime: '02 phút', expectedWait: '12 phút', address: 'Quận 10, TP.HCM', note: 'Lịch hẹn 09:30, chưa xác nhận có mặt.' },
  { stt: '006', code: 'BN006', name: 'Đặng Ngọc Anh', phone: '0977889900', registrationType: 'Đến trực tiếp', department: 'Phụ khoa', expectedDoctor: 'BS Trần Thu Hà', room: 'Phòng 204', status: 'Hoàn tất', waitTime: '00 phút', expectedWait: '00 phút', address: 'Gò Vấp, TP.HCM', note: 'Đã hoàn tất luồng tiếp nhận trong ngày.' },
  { stt: '007', code: 'BN007', name: 'Vũ Thanh Hương', phone: '0909988776', registrationType: 'Đến trực tiếp', department: 'Sản khoa', expectedDoctor: 'BS Lê Minh Quân', room: 'Phòng 202', status: 'Đang khám', priority: true, waitTime: '16 phút', expectedWait: '05 phút', address: 'Tân Bình, TP.HCM', note: 'Bệnh nhân ưu tiên, đã vào phòng khám.' },
  { stt: '008', code: 'BN008', name: 'Bùi Khánh Linh', phone: '0911223344', registrationType: 'Đặt lịch trước', department: 'Phụ khoa', expectedDoctor: 'BS Mai Thanh Tú', room: 'Phòng 205', status: 'Chờ kết quả', waitTime: '43 phút', expectedWait: '15 phút', address: 'Phú Nhuận, TP.HCM', note: 'Theo dõi trạng thái để hướng dẫn bệnh nhân quay lại phòng khám.' },
];

const DOCTOR_SCHEDULES: DoctorSchedule[] = [
  { name: 'BS Nguyễn Văn An', department: 'Sản khoa', waiting: 12, time: '07:30 - 11:30', status: 'Đang làm việc' },
  { name: 'BS Trần Thu Hà', department: 'Phụ khoa', waiting: 8, time: '08:00 - 12:00', status: 'Đang làm việc' },
  { name: 'BS Lê Minh Quân', department: 'Sản khoa', waiting: 0, time: '13:00 - 17:00', status: 'Tạm nghỉ' },
  { name: 'BS Mai Thanh Tú', department: 'Phụ khoa', waiting: 5, time: '07:30 - 16:30', status: 'Đang làm việc' },
  { name: 'BS Phạm Hoài Nam', department: 'Sản khoa', waiting: 0, time: '07:30 - 10:30', status: 'Hết lịch' },
];

const STATUS_STYLES: Record<ReceptionStatus, string> = {
  'Chờ tiếp nhận': 'bg-blue-100 text-blue-700 border-blue-200',
  'Đã tiếp nhận': 'bg-sky-100 text-sky-700 border-sky-200',
  'Chờ xác nhận lịch hẹn': 'bg-amber-100 text-amber-700 border-amber-200',
  'Chờ khám': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Đang khám': 'bg-violet-100 text-violet-700 border-violet-200',
  'Chờ CLS': 'bg-purple-100 text-purple-700 border-purple-200',
  'Đang thực hiện CLS': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'Chờ kết quả': 'bg-orange-100 text-orange-700 border-orange-200',
  'Chờ kết luận': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Hoàn tất': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const ACTIONS_BY_STATUS: Record<ReceptionStatus, string[]> = {
  'Chờ tiếp nhận': ['Tiếp nhận', 'Xác nhận lịch hẹn'],
  'Đã tiếp nhận': ['Tạo phiếu khám', 'Cấp số thứ tự'],
  'Chờ xác nhận lịch hẹn': ['Xác nhận lịch hẹn', 'Đổi lịch'],
  'Chờ khám': ['Điều phối', 'Xem trạng thái', 'In phiếu khám'],
  'Đang khám': ['Xem trạng thái'],
  'Chờ CLS': ['Điều phối', 'Xem trạng thái'],
  'Đang thực hiện CLS': ['Xem trạng thái'],
  'Chờ kết quả': ['Xem trạng thái'],
  'Chờ kết luận': ['Xem trạng thái'],
  'Hoàn tất': ['In phiếu khám'],
};

function StatusBadge({ status }: { status: ReceptionStatus }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap', STATUS_STYLES[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

function TimelineStep({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx(
        'h-3 w-3 rounded-full border-2 flex-shrink-0',
        active ? 'border-sky-600 bg-sky-600' : done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white'
      )} />
      <span className={clsx('text-xs font-medium', active ? 'text-sky-700' : done ? 'text-gray-700' : 'text-gray-400')}>
        {label}
      </span>
    </div>
  );
}

export default function ReceptionPage() {
  const [searchParams] = useSearchParams();
  const activeView = searchParams.get('view') ?? 'reception';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tất cả');
  const [selectedCode, setSelectedCode] = useState('BN001');
  const [scheduleDepartment, setScheduleDepartment] = useState('Tất cả');
  const [scheduleDoctor, setScheduleDoctor] = useState('Tất cả');

  const filteredPatients = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return PATIENTS.filter(patient => {
      const matchesKeyword = !keyword ||
        patient.name.toLowerCase().includes(keyword) ||
        patient.code.toLowerCase().includes(keyword) ||
        patient.phone.includes(keyword) ||
        patient.stt.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === 'Tất cả' || patient.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const filteredSchedules = useMemo(() => {
    return DOCTOR_SCHEDULES.filter(schedule => {
      const matchesDepartment = scheduleDepartment === 'Tất cả' || schedule.department === scheduleDepartment;
      const matchesDoctor = scheduleDoctor === 'Tất cả' || schedule.name === scheduleDoctor;
      return matchesDepartment && matchesDoctor;
    });
  }, [scheduleDepartment, scheduleDoctor]);

  const selectedPatient = PATIENTS.find(patient => patient.code === selectedCode) ?? filteredPatients[0] ?? PATIENTS[0];
  const newArrival = PATIENTS.find(patient => patient.status === 'Chờ tiếp nhận');
  const waitingAppointment = PATIENTS.find(patient => patient.status === 'Chờ xác nhận lịch hẹn');
  const dispatchPatient = PATIENTS.find(patient => patient.status === 'Chờ CLS') ?? PATIENTS.find(patient => patient.status === 'Chờ khám');

  const stats = [
    { label: 'Bệnh nhân đã tiếp nhận hôm nay', value: 42, icon: UserCheck, accent: 'bg-sky-50 text-sky-700 border-sky-100' },
    { label: 'Đặt lịch chờ xác nhận', value: PATIENTS.filter(p => p.status === 'Chờ xác nhận lịch hẹn').length, icon: CalendarCheck, accent: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Bệnh nhân đang chờ khám', value: PATIENTS.filter(p => p.status === 'Chờ khám').length, icon: Users, accent: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'Bệnh nhân cần điều phối', value: PATIENTS.filter(p => ['Chờ CLS', 'Chờ khám'].includes(p.status)).length, icon: ArrowRightLeft, accent: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Thời gian chờ trung bình', value: '18p', icon: Clock3, accent: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  ];

  const timeline = ['Tiếp nhận', 'Tạo phiếu khám', 'Chờ khám', 'Đang khám', 'Chờ CLS', 'Chờ kết quả', 'Chờ kết luận', 'Hoàn tất'];
  const currentTimelineIndex = Math.max(0, timeline.findIndex(step =>
    step === selectedPatient.status ||
    (selectedPatient.status === 'Chờ tiếp nhận' && step === 'Tiếp nhận') ||
    (selectedPatient.status === 'Đã tiếp nhận' && step === 'Tạo phiếu khám') ||
    (selectedPatient.status === 'Đang thực hiện CLS' && step === 'Chờ kết quả')
  ));

  const showStats = activeView === 'reception' || activeView === 'overview';
  const showAlerts = ['reception', 'overview', 'appointments', 'notifications'].includes(activeView);
  const showPatientTable = ['reception', 'appointments', 'patients'].includes(activeView);
  const showSchedule = ['reception', 'overview', 'doctors'].includes(activeView);
  const showDetailPanel = ['reception', 'appointments', 'patients', 'notifications', 'account'].includes(activeView);
  const mainTitle = {
    reception: 'Tiếp nhận bệnh nhân',
    overview: 'Tổng quan lễ tân',
    appointments: 'Đăng ký khám / Đặt lịch',
    patients: 'Danh sách bệnh nhân',
    doctors: 'Lịch làm việc bác sĩ',
    notifications: 'Thông báo',
    account: 'Tài khoản',
  }[activeView] ?? 'Tiếp nhận bệnh nhân';

  return (
    <Layout pageTitle={mainTitle}>
      <div className="space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Quầy lễ tân hôm nay</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">Bảng điều khiển lễ tân</h1>
              <p className="mt-1 text-sm text-gray-500">Tiếp nhận, đăng ký khám và theo dõi luồng bệnh nhân trong ngày</p>
            </div>
            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-[300px]">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="Tìm tên, mã BN, SĐT hoặc số thứ tự"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                    <UserPlus size={16} />
                    Tiếp nhận bệnh nhân
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                    <FilePlus2 size={16} />
                    Tạo phiếu khám
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">
                    <CalendarCheck size={16} />
                    Xác nhận lịch hẹn
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Tất cả', ...STATUS_FILTERS].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={clsx(
                      'rounded-lg border px-3 py-2 text-xs font-semibold transition',
                      statusFilter === status
                        ? 'border-sky-200 bg-sky-100 text-sky-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-sky-200 hover:text-sky-700'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {showStats && (
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
        )}

        <section className={clsx(
          'grid grid-cols-1 gap-5',
          showDetailPanel ? 'xl:grid-cols-[minmax(0,1fr)_370px]' : 'xl:grid-cols-1'
        )}>
          <div className="space-y-5">
            {showAlerts && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {[
                  { label: 'Bệnh nhân mới đến', patient: newArrival, icon: Bell },
                  { label: 'Lịch hẹn chờ xác nhận', patient: waitingAppointment, icon: CalendarCheck },
                  { label: 'Cần điều phối', patient: dispatchPatient, icon: ArrowRightLeft },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => item.patient && setSelectedCode(item.patient.code)}
                      className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50/40"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                        <Icon size={17} className="text-sky-600" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-gray-900">{item.patient?.stt} - {item.patient?.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.patient?.department} • {item.patient?.waitTime}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {activeView === 'appointments' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Đăng ký khám và xác nhận lịch hẹn</h2>
                    <p className="text-sm text-gray-600">Tập trung xử lý bệnh nhân đặt lịch trước, tạo phiếu khám và cấp số thứ tự.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">Tiếp nhận mới</button>
                    <button className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100">Xác nhận lịch</button>
                  </div>
                </div>
              </div>
            )}

            {showPatientTable && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{activeView === 'patients' ? 'Danh sách bệnh nhân' : 'Danh sách tiếp nhận và hàng đợi'}</h2>
                  <p className="text-sm text-gray-500">Theo dõi bệnh nhân mới đến, lịch hẹn và trạng thái điều phối</p>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                  <Printer size={16} />
                  In danh sách
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">STT</th>
                      <th className="px-4 py-3">Mã bệnh nhân</th>
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">Số điện thoại</th>
                      <th className="px-4 py-3">Loại đăng ký</th>
                      <th className="px-4 py-3">Chuyên khoa</th>
                      <th className="px-4 py-3">Bác sĩ dự kiến</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Mức ưu tiên</th>
                      <th className="px-4 py-3">Thời gian chờ</th>
                      <th className="px-4 py-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPatients.map(patient => (
                      <tr
                        key={patient.code}
                        onClick={() => setSelectedCode(patient.code)}
                        className={clsx('cursor-pointer transition hover:bg-sky-50/60', selectedPatient.code === patient.code && 'bg-sky-50')}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-sky-700">{patient.stt}</td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{patient.code}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{patient.name}</td>
                        <td className="px-4 py-3 text-gray-600">{patient.phone}</td>
                        <td className="px-4 py-3 text-gray-600">{patient.registrationType}</td>
                        <td className="px-4 py-3 text-gray-600">{patient.department}</td>
                        <td className="px-4 py-3 text-gray-600">{patient.expectedDoctor}</td>
                        <td className="px-4 py-3"><StatusBadge status={patient.status} /></td>
                        <td className="px-4 py-3">
                          {patient.priority ? (
                            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Ưu tiên</span>
                          ) : (
                            <span className="text-xs font-medium text-gray-400">Thường</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={14} className="text-gray-400" />
                            {patient.waitTime}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-[250px] flex-wrap gap-1.5">
                            {ACTIONS_BY_STATUS[patient.status].map(action => (
                              <button
                                key={action}
                                onClick={event => {
                                  event.stopPropagation();
                                  setSelectedCode(patient.code);
                                }}
                                className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {showSchedule && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Lịch làm việc bác sĩ</h2>
                  <p className="text-sm text-gray-500">Dùng để phân bổ và điều phối bệnh nhân theo phòng khám</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    defaultValue="2026-06-05"
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                  <select
                    value={scheduleDepartment}
                    onChange={event => setScheduleDepartment(event.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option>Tất cả</option>
                    <option>Sản khoa</option>
                    <option>Phụ khoa</option>
                  </select>
                  <select
                    value={scheduleDoctor}
                    onChange={event => setScheduleDoctor(event.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option>Tất cả</option>
                    {DOCTOR_SCHEDULES.map(schedule => <option key={schedule.name}>{schedule.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredSchedules.map(schedule => (
                  <div key={schedule.name} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{schedule.name}</p>
                        <p className="text-xs text-gray-500">{schedule.department} • {schedule.time}</p>
                      </div>
                      <span className={clsx(
                        'rounded-full border px-2 py-0.5 text-xs font-semibold',
                        schedule.status === 'Đang làm việc' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                        schedule.status === 'Tạm nghỉ' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                        'border-gray-200 bg-white text-gray-500'
                      )}>
                        {schedule.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600">
                      <ListChecks size={14} className="text-sky-600" />
                      {schedule.waiting} bệnh nhân chờ
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>

          {showDetailPanel && (
          <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{activeView === 'account' ? 'Tài khoản lễ tân' : 'Chi tiết bệnh nhân'}</p>
                <h3 className="mt-1 text-lg font-bold text-gray-900">{selectedPatient.name}</h3>
                <p className="text-sm text-gray-500">{selectedPatient.code} • STT {selectedPatient.stt}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Ticket size={20} />
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Số điện thoại</p>
                  <p className="font-semibold text-gray-800">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Loại đăng ký</p>
                  <p className="font-semibold text-gray-800">{selectedPatient.registrationType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Chuyên khoa</p>
                  <p className="font-semibold text-gray-800">{selectedPatient.department}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Số thứ tự</p>
                  <p className="font-semibold text-gray-800">{selectedPatient.stt}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Bác sĩ / phòng khám dự kiến</p>
                <p className="text-sm font-semibold text-gray-800">{selectedPatient.expectedDoctor} • {selectedPatient.room}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Thời gian chờ dự kiến</p>
                <p className="text-sm font-semibold text-gray-800">{selectedPatient.expectedWait}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-500">Trạng thái hiện tại</span>
              <StatusBadge status={selectedPatient.status} />
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase text-gray-500">Timeline luồng bệnh nhân</p>
              <div className="space-y-3">
                {timeline.map((step, index) => (
                  <TimelineStep
                    key={step}
                    label={step}
                    active={index === currentTimelineIndex}
                    done={index < currentTimelineIndex || selectedPatient.status === 'Hoàn tất'}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500">Ghi chú lễ tân</p>
              <textarea
                rows={4}
                defaultValue={selectedPatient.note}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2">
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                <CalendarCheck size={16} />
                Xác nhận lịch hẹn
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                <Ticket size={16} />
                Cấp số thứ tự
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100">
                <ArrowRightLeft size={16} />
                Điều phối phòng khám
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                <Printer size={16} />
                In phiếu khám
              </button>
            </div>
          </aside>
          )}
        </section>
      </div>
    </Layout>
  );
}
