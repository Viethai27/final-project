import { useState } from 'react';
import { Search, UserPlus, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Patient, PriorityReason, QueueLane, Visit } from '../../types';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { PriorityBadge } from '../ui/PriorityBadge';

const PRIORITY_OPTIONS: { value: PriorityReason; label: string }[] = [
  { value: 'CHILD_UNDER_6', label: 'Trẻ em dưới 6 tuổi' },
  { value: 'PREGNANT', label: 'Phụ nữ có thai' },
  { value: 'DISABLED', label: 'Người khuyết tật nặng' },
  { value: 'ELDERLY_75PLUS', label: 'Người từ 75 tuổi trở lên' },
  { value: 'VETERAN', label: 'Người có công' },
  { value: 'EMERGENCY', label: 'Cấp cứu' },
];

const PRIORITY_SCORES: Record<string, number> = {
  EMERGENCY: 100, CHILD_UNDER_6: 95, PREGNANT: 90, DISABLED: 87, ELDERLY_75PLUS: 85, VETERAN: 88,
};

interface PatientFormProps {
  onSuccess?: (visit: Visit) => void;
}

export default function PatientForm({ onSuccess }: PatientFormProps) {
  const { patients, rooms, doctors, services, addPatient, createVisit } = useHospital();
  const { user } = useAuth();

  const [step, setStep] = useState<'search' | 'patient' | 'visit'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [success, setSuccess] = useState<Visit | null>(null);
  const [error, setError] = useState('');

  // Patient form
  const [patientForm, setPatientForm] = useState({
    name: '', dateOfBirth: '', gender: 'MALE' as 'MALE' | 'FEMALE',
    idNumber: '', phone: '', address: '', insurance: '', email: '',
    age: 0,
  });

  // Visit form
  const [visitForm, setVisitForm] = useState({
    serviceId: '',
    departmentId: '',
    roomId: '',
    doctorId: '',
    priorityReason: '' as PriorityReason | '',
    chiefComplaint: '',
    appointmentId: '',
    isAppointment: false,
  });

  const searchResults = searchQuery.length >= 2
    ? patients.filter(p =>
        p.patientCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery) ||
        p.idNumber.includes(searchQuery)
      ).slice(0, 8)
    : [];

  const examRooms = rooms.filter(r => r.type === 'EXAM' && r.status === 'ACTIVE');
  const examDoctors = visitForm.roomId
    ? doctors.filter(d => d.roomId === visitForm.roomId)
    : doctors;
  const examServices = services.filter(s => s.type === 'EXAM');

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setStep('visit');
    setIsNew(false);
  };

  const handleNewPatient = () => {
    setIsNew(true);
    setStep('patient');
    setSelectedPatient(null);
  };

  const handleSavePatient = () => {
    if (!patientForm.name || !patientForm.phone) {
      setError('Vui lòng nhập đầy đủ họ tên và số điện thoại');
      return;
    }
    const dob = new Date(patientForm.dateOfBirth);
    const age = patientForm.dateOfBirth ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
    const newPat = addPatient({ ...patientForm, age, priorityReason: undefined });
    setSelectedPatient(newPat);
    setStep('visit');
    setError('');
  };

  const handleCreateVisit = () => {
    if (!selectedPatient) return;
    if (!visitForm.roomId) { setError('Vui lòng chọn phòng khám'); return; }
    if (!visitForm.chiefComplaint) { setError('Vui lòng nhập lý do khám'); return; }

    const priority = visitForm.priorityReason ? PRIORITY_SCORES[visitForm.priorityReason] ?? 50 : 50;
    const lane: QueueLane = visitForm.isAppointment ? 'APPOINTMENT' : visitForm.priorityReason ? 'PRIORITY' : 'NORMAL';

    const visit = createVisit(selectedPatient.id, {
      roomId: visitForm.roomId,
      doctorId: visitForm.doctorId || undefined,
      lane,
      priorityReason: (visitForm.priorityReason as PriorityReason) || undefined,
      priorityScore: priority,
      chiefComplaint: visitForm.chiefComplaint,
    });

    setSuccess(visit);
    onSuccess?.(visit);
    setError('');
  };

  const handleReset = () => {
    setStep('search');
    setSearchQuery('');
    setSelectedPatient(null);
    setIsNew(false);
    setSuccess(null);
    setError('');
    setPatientForm({ name: '', dateOfBirth: '', gender: 'MALE', idNumber: '', phone: '', address: '', insurance: '', email: '', age: 0 });
    setVisitForm({ serviceId: '', departmentId: '', roomId: '', doctorId: '', priorityReason: '', chiefComplaint: '', appointmentId: '', isAppointment: false });
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-green-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check size={32} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tiếp nhận thành công!</h3>
          <p className="text-sm text-gray-500 mt-1">Bệnh nhân đã được thêm vào hàng đợi</p>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 inline-block">
          <p className="text-xs text-sky-600 font-medium">Số thứ tự</p>
          <p className="text-4xl font-black text-sky-700 tracking-wider">{success.ticketNumber}</p>
          <p className="text-sm text-sky-600 mt-1">{selectedPatient?.name}</p>
        </div>
        <button onClick={handleReset} className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors text-sm">
          Tiếp nhận bệnh nhân mới
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm bệnh nhân
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Mã BN, CCCD/CMND, số điện thoại, tên..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-sm flex-shrink-0">
                    {p.name.split(' ').pop()?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                      {p.priorityReason && <PriorityBadge reason={p.priorityReason} size="sm" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.patientCode} · {p.age} tuổi · {p.gender === 'MALE' ? 'Nam' : 'Nữ'} · {p.phone}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-400">
              Không tìm thấy bệnh nhân
            </div>
          )}

          <button
            onClick={handleNewPatient}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-sky-400 hover:text-sky-600 transition-colors"
          >
            <UserPlus size={16} />
            Tạo hồ sơ bệnh nhân mới
          </button>
        </div>
      )}

      {/* Step 2: Patient form */}
      {step === 'patient' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">Thông tin bệnh nhân mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Họ và tên *</label>
              <input type="text" value={patientForm.name} onChange={e => setPatientForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" placeholder="Nhập họ và tên" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày sinh</label>
              <input type="date" value={patientForm.dateOfBirth} onChange={e => setPatientForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Giới tính</label>
              <select value={patientForm.gender} onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value as 'MALE' | 'FEMALE' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Số điện thoại *</label>
              <input type="tel" value={patientForm.phone} onChange={e => setPatientForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" placeholder="0901234567" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CCCD / CMND</label>
              <input type="text" value={patientForm.idNumber} onChange={e => setPatientForm(p => ({ ...p, idNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" placeholder="012345678901" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Địa chỉ</label>
              <input type="text" value={patientForm.address} onChange={e => setPatientForm(p => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" placeholder="Địa chỉ cư trú" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Số thẻ BHYT</label>
              <input type="text" value={patientForm.insurance} onChange={e => setPatientForm(p => ({ ...p, insurance: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" placeholder="DN1234567890" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('search')} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              Quay lại
            </button>
            <button onClick={handleSavePatient} className="flex-1 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700">
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Visit setup */}
      {step === 'visit' && selectedPatient && (
        <div className="space-y-4">
          {/* Patient info summary */}
          <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
            <div className="w-10 h-10 bg-sky-200 rounded-full flex items-center justify-center font-bold text-sky-700">
              {selectedPatient.name.split(' ').pop()?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{selectedPatient.name}</p>
              <p className="text-xs text-gray-500">{selectedPatient.patientCode} · {selectedPatient.age} tuổi · {selectedPatient.gender === 'MALE' ? 'Nam' : 'Nữ'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lý do khám *</label>
              <textarea value={visitForm.chiefComplaint} onChange={e => setVisitForm(v => ({ ...v, chiefComplaint: e.target.value }))}
                rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                placeholder="Mô tả triệu chứng, lý do đến khám..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phòng / Khoa khám *</label>
              <select value={visitForm.roomId} onChange={e => setVisitForm(v => ({ ...v, roomId: e.target.value, doctorId: '' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="">Chọn phòng khám</option>
                {examRooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.department} ({r.currentWaiting} đang chờ)
                  </option>
                ))}
              </select>
            </div>
            {visitForm.roomId && examDoctors.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bác sĩ (tùy chọn)</label>
                <select value={visitForm.doctorId} onChange={e => setVisitForm(v => ({ ...v, doctorId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  <option value="">Không chỉ định</option>
                  {examDoctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Đối tượng ưu tiên</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <label key={opt.value} className={clsx(
                    'flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors text-xs',
                    visitForm.priorityReason === opt.value ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:bg-gray-50'
                  )}>
                    <input
                      type="radio"
                      name="priority"
                      value={opt.value}
                      checked={visitForm.priorityReason === opt.value}
                      onChange={e => setVisitForm(v => ({ ...v, priorityReason: e.target.value as PriorityReason }))}
                      className="sr-only"
                    />
                    <div className={clsx('w-3 h-3 rounded-full border-2 flex-shrink-0', visitForm.priorityReason === opt.value ? 'border-sky-500 bg-sky-500' : 'border-gray-300')} />
                    {opt.label}
                  </label>
                ))}
              </div>
              {visitForm.priorityReason && (
                <button onClick={() => setVisitForm(v => ({ ...v, priorityReason: '' }))}
                  className="text-xs text-gray-400 hover:text-red-500 mt-1">Xóa ưu tiên</button>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={visitForm.isAppointment} onChange={e => setVisitForm(v => ({ ...v, isAppointment: e.target.checked }))}
                  className="w-4 h-4 rounded text-sky-600" />
                <span className="text-xs font-medium text-gray-600">Bệnh nhân có lịch hẹn trước</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('search')} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              Quay lại
            </button>
            <button onClick={handleCreateVisit} className="flex-1 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700">
              Cấp số thứ tự
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
