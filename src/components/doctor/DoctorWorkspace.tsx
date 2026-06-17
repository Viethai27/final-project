import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity, BarChart3, CheckCircle2, ClipboardCheck,
  Clock3, FileSearch, FlaskConical, KeyRound, ListOrdered, Lock,
  Mail, PlayCircle, Plus, Save, Search, Settings, Shield,
  Stethoscope, UserRound, X, AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import type { Visit, PatientStatus, CLSOrder, CLSResult } from '../../types';

// ─────────────────────────────────────────────────────────────
// PROPS & LOCAL TYPES
// ─────────────────────────────────────────────────────────────
interface DoctorWorkspaceProps { roomId: string; }
type DoctorView = 'workspace' | 'overview' | 'queue' | 'patients' | 'results' | 'schedule' | 'reports' | 'account';

interface ClinicalNoteForm {
  chiefComplaint: string;
  provisionalDiagnosis: string;
  clinicalNote: string;
  treatmentDirection: string;
}
interface ConclusionForm {
  finalDiagnosis: string;
  conclusion: string;
  treatmentPlan: string;
}
interface CLSInput {
  serviceName: string;
  serviceType: 'LAB' | 'IMAGING' | 'FUNCTIONAL' | 'OTHER';
  priorityLevel: 'NORMAL' | 'URGENT';
  note: string;
}
interface ConfirmState { message: string; onConfirm: () => void; }

const EMPTY_CLINICAL: ClinicalNoteForm = { chiefComplaint: '', provisionalDiagnosis: '', clinicalNote: '', treatmentDirection: '' };
const EMPTY_CONCLUSION: ConclusionForm = { finalDiagnosis: '', conclusion: '', treatmentPlan: '' };
const EMPTY_CLS: CLSInput = { serviceName: '', serviceType: 'LAB', priorityLevel: 'NORMAL', note: '' };

const DEFAULT_CLS_ROOM: Record<CLSInput['serviceType'], string> = {
  LAB: 'r9', IMAGING: 'r11', FUNCTIONAL: 'r13', OTHER: 'r9',
};

// ─────────────────────────────────────────────────────────────
// STATUS MAPS
// ─────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<PatientStatus, string> = {
  WAITING_EXAM: 'Chờ khám',
  IN_EXAM: 'Đang khám',
  WAITING_CLS: 'Chờ CLS',
  IN_CLS: 'Đang CLS',
  WAITING_RESULT: 'Chờ kết quả',
  WAITING_CONCLUSION: 'Chờ kết luận',
  IN_CONCLUSION: 'Đang kết luận',
  WAITING_PAYMENT: 'Chờ thanh toán',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};
const STATUS_CLASS: Record<PatientStatus, string> = {
  WAITING_EXAM: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_EXAM: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  WAITING_CLS: 'bg-purple-100 text-purple-700 border-purple-200',
  IN_CLS: 'bg-violet-100 text-violet-700 border-violet-200',
  WAITING_RESULT: 'bg-orange-100 text-orange-700 border-orange-200',
  WAITING_CONCLUSION: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_CONCLUSION: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  WAITING_PAYMENT: 'bg-teal-100 text-teal-700 border-teal-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

// ─────────────────────────────────────────────────────────────
// SMALL SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────
function VisitStatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap', STATUS_CLASS[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 95) return <span className="inline-flex rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">Khẩn cấp</span>;
  if (score >= 80) return <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Ưu tiên</span>;
  if (score >= 60) return <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Đặt lịch</span>;
  return <span className="text-xs text-gray-400">Thường</span>;
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-gray-900">Xác nhận thao tác</h3>
        <p className="mt-2 text-sm text-gray-600">{state.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Hủy</button>
          <button onClick={() => { state.onConfirm(); onClose(); }} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATS CARDS
// ─────────────────────────────────────────────────────────────
function StatsCards({ roomId }: { roomId: string }) {
  const { visits } = useHospital();
  const rv = useMemo(() => visits.filter(v => v.roomId === roomId), [visits, roomId]);
  const cards = [
    { label: 'Tổng hôm nay', value: rv.length, icon: ListOrdered, cls: 'bg-sky-50 text-sky-700 border-sky-100' },
    { label: 'Chờ khám', value: rv.filter(v => v.status === 'WAITING_EXAM').length, icon: Clock3, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Đang khám', value: rv.filter(v => ['IN_EXAM', 'IN_CONCLUSION'].includes(v.status)).length, icon: Stethoscope, cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'Chờ kết luận', value: rv.filter(v => ['WAITING_CONCLUSION', 'IN_CONCLUSION'].includes(v.status)).length, icon: FileSearch, cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Hoàn tất / Thanh toán', value: rv.filter(v => ['WAITING_PAYMENT', 'COMPLETED'].includes(v.status)).length, icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{c.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{c.value}</p>
              </div>
              <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg border', c.cls)}><Icon size={18} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLS ORDER MODAL
// ─────────────────────────────────────────────────────────────
function CLSModal({
  visit, inputs, onChangeInput, onAddInput, onRemoveInput, onConfirm, onClose,
}: {
  visit: Visit;
  inputs: CLSInput[];
  onChangeInput: (i: number, f: keyof CLSInput, v: string) => void;
  onAddInput: () => void;
  onRemoveInput: (i: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const hasValid = inputs.some(i => i.serviceName.trim() !== '');
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Chỉ định cận lâm sàng</h3>
            <p className="mt-0.5 text-sm text-gray-500">{visit.patientName} — Số {visit.ticketNumber}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5">
          {inputs.map((inp, idx) => (
            <div key={idx} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Chỉ định #{idx + 1}</p>
                {inputs.length > 1 && (
                  <button onClick={() => onRemoveInput(idx)} className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"><X size={14} /></button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Tên dịch vụ / xét nghiệm *</label>
                  <input value={inp.serviceName} onChange={e => onChangeInput(idx, 'serviceName', e.target.value)}
                    placeholder="VD: Công thức máu, Siêu âm ổ bụng..."
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Loại CLS</label>
                  <select value={inp.serviceType} onChange={e => onChangeInput(idx, 'serviceType', e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100">
                    <option value="LAB">Xét nghiệm</option>
                    <option value="IMAGING">Chẩn đoán hình ảnh</option>
                    <option value="FUNCTIONAL">Thăm dò chức năng</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Mức độ ưu tiên</label>
                  <select value={inp.priorityLevel} onChange={e => onChangeInput(idx, 'priorityLevel', e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100">
                    <option value="NORMAL">Thường</option>
                    <option value="URGENT">Khẩn</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú lâm sàng</label>
                  <input value={inp.note} onChange={e => onChangeInput(idx, 'note', e.target.value)}
                    placeholder="Lý do chỉ định, mô tả triệu chứng liên quan..."
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={onAddInput}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:border-sky-300 hover:text-sky-700">
            <Plus size={15} />Thêm chỉ định khác
          </button>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 p-5">
          <button onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Hủy</button>
          <button disabled={!hasValid} onClick={onConfirm}
            className={clsx('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition',
              hasValid ? 'bg-purple-600 hover:bg-purple-700' : 'cursor-not-allowed bg-gray-300')}>
            <FlaskConical size={15} />Gửi chỉ định CLS
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACTIVE VISIT PANEL
// ─────────────────────────────────────────────────────────────
function ActiveVisitPanel({
  visit, clinicalForm, conclusionForm,
  onChangeClinical, onChangeConclusion,
  onSaveClinicalNote, onOpenCLS, onConcludeDirectly, onCompleteConclusion,
  onClose, visitClsOrders, visitClsResults,
}: {
  visit: Visit;
  clinicalForm: ClinicalNoteForm;
  conclusionForm: ConclusionForm;
  onChangeClinical: (f: keyof ClinicalNoteForm, v: string) => void;
  onChangeConclusion: (f: keyof ConclusionForm, v: string) => void;
  onSaveClinicalNote: () => void;
  onOpenCLS: () => void;
  onConcludeDirectly: () => void;
  onCompleteConclusion: () => void;
  onClose: () => void;
  visitClsOrders: CLSOrder[];
  visitClsResults: CLSResult[];
}) {
  const isExam = visit.status === 'IN_EXAM';
  const isConclusion = visit.status === 'IN_CONCLUSION' || visit.status === 'WAITING_CONCLUSION';
  const canConclude = conclusionForm.finalDiagnosis.trim() !== '' && conclusionForm.conclusion.trim() !== '';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-sky-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <UserRound size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{visit.patientName}</h3>
            <p className="text-xs text-gray-500">Số {visit.ticketNumber}{visit.chiefComplaint ? ` • ${visit.chiefComplaint}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VisitStatusBadge status={visit.status} />
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"><X size={16} /></button>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {/* CLINICAL NOTE FORM */}
        {isExam && (
          <section>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
              <Stethoscope size={16} className="text-indigo-600" />Khám lâm sàng
            </h4>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Lý do khám / Triệu chứng</label>
                <textarea rows={2} value={clinicalForm.chiefComplaint}
                  onChange={e => onChangeClinical('chiefComplaint', e.target.value)}
                  placeholder="Mô tả lý do khám và triệu chứng chính..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Chẩn đoán sơ bộ</label>
                <input value={clinicalForm.provisionalDiagnosis}
                  onChange={e => onChangeClinical('provisionalDiagnosis', e.target.value)}
                  placeholder="Chẩn đoán sơ bộ..."
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú khám lâm sàng</label>
                <textarea rows={3} value={clinicalForm.clinicalNote}
                  onChange={e => onChangeClinical('clinicalNote', e.target.value)}
                  placeholder="Mô tả chi tiết kết quả thăm khám..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Hướng xử lý dự kiến</label>
                <input value={clinicalForm.treatmentDirection}
                  onChange={e => onChangeClinical('treatmentDirection', e.target.value)}
                  placeholder="Hướng điều trị, theo dõi..."
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={onSaveClinicalNote}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                  <Save size={15} />Lưu ghi chú
                </button>
                <button onClick={onOpenCLS}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700">
                  <FlaskConical size={15} />Chỉ định CLS
                </button>
                <button onClick={onConcludeDirectly}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                  <ClipboardCheck size={15} />Kết luận ngay
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CLS ORDERS */}
        {(isExam || isConclusion) && visitClsOrders.length > 0 && (
          <section>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
              <FlaskConical size={16} className="text-purple-600" />
              Cận lâm sàng đã chỉ định ({visitClsOrders.length})
            </h4>
            <div className="space-y-2">
              {visitClsOrders.map(order => {
                const result = visitClsResults.find(r => r.orderId === order.id);
                return (
                  <div key={order.id} className={clsx('rounded-lg border p-3',
                    result?.isAbnormal ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-gray-50')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{order.serviceName}</p>
                        {order.clinicalNote && <p className="mt-0.5 text-xs text-gray-500">{order.clinicalNote}</p>}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {order.priority === 'URGENT' && (
                          <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-xs font-semibold text-rose-700">Khẩn</span>
                        )}
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold',
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'IN_PROGRESS' ? 'bg-violet-100 text-violet-700' :
                          order.status === 'ASSIGNED' ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600')}>
                          {order.status === 'COMPLETED' ? 'Đã hoàn thành' :
                           order.status === 'IN_PROGRESS' ? 'Đang thực hiện' :
                           order.status === 'ASSIGNED' ? 'Đã nhận' : 'Đang chờ'}
                        </span>
                      </div>
                    </div>
                    {result && (
                      <div className={clsx('mt-2 rounded-md p-2 text-xs',
                        result.isAbnormal ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700')}>
                        {result.isAbnormal && (
                          <p className="mb-1 flex items-center gap-1 font-bold text-rose-700">
                            <AlertCircle size={12} />Kết quả bất thường
                          </p>
                        )}
                        <p className="leading-relaxed">{result.result}</p>
                        {result.note && <p className="mt-1 italic text-gray-500">{result.note}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CONCLUSION FORM */}
        {isConclusion && (
          <section>
            {(visit.chiefComplaint || visit.provisionalDiagnosis || visit.notes) && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Thông tin lâm sàng đã ghi</p>
                <div className="space-y-1">
                  {visit.chiefComplaint && <p><span className="text-gray-500">Lý do: </span><span className="text-gray-800">{visit.chiefComplaint}</span></p>}
                  {visit.provisionalDiagnosis && <p><span className="text-gray-500">Chẩn đoán sơ bộ: </span><span className="font-medium text-gray-800">{visit.provisionalDiagnosis}</span></p>}
                  {visit.notes && <p><span className="text-gray-500">Ghi chú: </span><span className="text-gray-700">{visit.notes}</span></p>}
                </div>
              </div>
            )}
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
              <FileSearch size={16} className="text-amber-600" />Kết luận khám
            </h4>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Chẩn đoán cuối cùng *</label>
                <input value={conclusionForm.finalDiagnosis}
                  onChange={e => onChangeConclusion('finalDiagnosis', e.target.value)}
                  placeholder="Bệnh chính, bệnh kèm (ICD-10 nếu có)..."
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Kết luận *</label>
                <textarea rows={3} value={conclusionForm.conclusion}
                  onChange={e => onChangeConclusion('conclusion', e.target.value)}
                  placeholder="Kết luận tổng thể về tình trạng bệnh nhân..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Hướng điều trị / Đơn thuốc</label>
                <textarea rows={2} value={conclusionForm.treatmentPlan}
                  onChange={e => onChangeConclusion('treatmentPlan', e.target.value)}
                  placeholder="Phác đồ điều trị, đơn thuốc, lịch tái khám..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
              </div>
              {!canConclude && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertCircle size={13} />Vui lòng nhập chẩn đoán cuối và kết luận trước khi hoàn tất.
                </p>
              )}
              <button disabled={!canConclude} onClick={onCompleteConclusion}
                className={clsx('inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition',
                  canConclude ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'cursor-not-allowed bg-gray-200 text-gray-400')}>
                <CheckCircle2 size={16} />Hoàn tất kết luận → Chờ thanh toán
              </button>
            </div>
          </section>
        )}

        {/* OTHER STATES */}
        {!isExam && !isConclusion && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Clock3 size={32} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">
              {visit.status === 'WAITING_EXAM' && 'Bệnh nhân đang chờ vào khám'}
              {visit.status === 'WAITING_CLS' && 'Bệnh nhân đang chờ thực hiện CLS'}
              {visit.status === 'IN_CLS' && 'Bệnh nhân đang được thực hiện CLS'}
              {visit.status === 'WAITING_RESULT' && 'Đang chờ kết quả CLS'}
              {visit.status === 'WAITING_PAYMENT' && 'Bệnh nhân đang chờ thanh toán'}
              {visit.status === 'COMPLETED' && 'Lượt khám đã hoàn tất'}
              {visit.status === 'CANCELLED' && 'Lượt khám đã hủy'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QUEUE PAGE — MAIN FUNCTIONAL VIEW
// ─────────────────────────────────────────────────────────────
function QueuePageContent({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const { visits, patients, doctors, clsOrders, clsResults, updateVisitStatus, updateDoctorInfo, orderCLS, completeVisit } = useHospital();

  const doctor = useMemo(() => doctors.find(d => d.roomId === roomId), [doctors, roomId]);
  const doctorName = doctor?.name ?? user?.name ?? 'Bác sĩ';

  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'WAITING' | 'IN_EXAM' | 'CONCLUSION' | 'DONE'>('WAITING');
  const [clinicalForm, setClinicalForm] = useState<ClinicalNoteForm>(EMPTY_CLINICAL);
  const [conclusionForm, setConclusionForm] = useState<ConclusionForm>(EMPTY_CONCLUSION);
  const [showCLSModal, setShowCLSModal] = useState(false);
  const [clsInputs, setClsInputs] = useState<CLSInput[]>([{ ...EMPTY_CLS }]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const roomVisits = useMemo(() => visits.filter(v => v.roomId === roomId), [visits, roomId]);
  const activeVisit = useMemo(() => (activeVisitId ? visits.find(v => v.id === activeVisitId) ?? null : null), [visits, activeVisitId]);

  const ACTIONABLE: PatientStatus[] = ['WAITING_EXAM', 'IN_EXAM', 'WAITING_CLS', 'IN_CLS', 'WAITING_RESULT', 'WAITING_CONCLUSION', 'IN_CONCLUSION'];
  const priorityOf = (s: PatientStatus): number => {
    if (s === 'WAITING_CONCLUSION' || s === 'IN_CONCLUSION') return 0;
    if (s === 'WAITING_EXAM' || s === 'IN_EXAM') return 1;
    return 2;
  };

  const actionableVisits = useMemo(() =>
    roomVisits
      .filter(v => ACTIONABLE.includes(v.status))
      .sort((a, b) => {
        const d = priorityOf(a.status) - priorityOf(b.status);
        if (d !== 0) return d;
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return a.checkInTime.localeCompare(b.checkInTime);
      }),
    [roomVisits],
  );

  const nextPatient = useMemo(() =>
    actionableVisits.find(v => v.status === 'WAITING_EXAM' || v.status === 'WAITING_CONCLUSION') ?? null,
    [actionableVisits],
  );

  const tabCounts = useMemo(() => ({
    WAITING: roomVisits.filter(v => v.status === 'WAITING_EXAM').length,
    IN_EXAM: roomVisits.filter(v => ['IN_EXAM', 'IN_CONCLUSION'].includes(v.status)).length,
    CONCLUSION: roomVisits.filter(v => ['WAITING_CONCLUSION', 'IN_CONCLUSION'].includes(v.status)).length,
    DONE: roomVisits.filter(v => ['WAITING_PAYMENT', 'COMPLETED', 'CANCELLED'].includes(v.status)).length,
  }), [roomVisits]);

  const tabVisits = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    const base = kw ? actionableVisits.filter(v => v.patientName.toLowerCase().includes(kw) || v.ticketNumber.toLowerCase().includes(kw)) : actionableVisits;
    switch (activeTab) {
      case 'WAITING': return base.filter(v => v.status === 'WAITING_EXAM');
      case 'IN_EXAM': return base.filter(v => ['IN_EXAM', 'IN_CONCLUSION'].includes(v.status));
      case 'CONCLUSION': return roomVisits.filter(v => ['WAITING_CONCLUSION', 'IN_CONCLUSION'].includes(v.status)).sort((a, b) => b.priorityScore - a.priorityScore);
      case 'DONE': return roomVisits.filter(v => ['WAITING_PAYMENT', 'COMPLETED', 'CANCELLED'].includes(v.status));
      default: return base;
    }
  }, [actionableVisits, roomVisits, activeTab, searchTerm]);

  const getWaitTime = useCallback((checkInTime: string): string => {
    const [h1, m1] = checkInTime.split(':').map(Number);
    const now = new Date();
    const mins = (now.getHours() * 60 + now.getMinutes()) - (h1 * 60 + m1);
    if (isNaN(mins) || mins < 0) return '—';
    if (mins < 60) return `${mins} phút`;
    return `${Math.floor(mins / 60)}h ${mins % 60}p`;
  }, []);

  const getPatient = useCallback((id: string) => patients.find(p => p.id === id), [patients]);

  const handleSelectVisit = useCallback((visit: Visit) => {
    setActiveVisitId(visit.id);
    setClinicalForm({
      chiefComplaint: visit.chiefComplaint ?? '',
      provisionalDiagnosis: visit.provisionalDiagnosis ?? '',
      clinicalNote: visit.notes ?? '',
      treatmentDirection: (visit as Visit & { treatmentDirection?: string }).treatmentDirection ?? '',
    });
    setConclusionForm({
      finalDiagnosis: visit.finalDiagnosis ?? '',
      conclusion: visit.conclusion ?? '',
      treatmentPlan: (visit as Visit & { treatmentPlan?: string }).treatmentPlan ?? '',
    });
  }, []);

  const handleCallNext = useCallback(() => {
    if (!nextPatient) return;
    setConfirm({
      message: `Gọi bệnh nhân ${nextPatient.patientName} (${nextPatient.ticketNumber}) vào khám?`,
      onConfirm: () => {
        const newStatus: PatientStatus = nextPatient.status === 'WAITING_CONCLUSION' ? 'IN_CONCLUSION' : 'IN_EXAM';
        updateVisitStatus(nextPatient.id, newStatus, 'Bác sĩ gọi khám', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
        handleSelectVisit({ ...nextPatient, status: newStatus });
        setActiveTab(newStatus === 'IN_CONCLUSION' ? 'CONCLUSION' : 'IN_EXAM');
      },
    });
  }, [nextPatient, updateVisitStatus, user, handleSelectVisit]);

  const handleStartExam = useCallback((visit: Visit) => {
    setConfirm({
      message: `Bắt đầu khám cho ${visit.patientName} (${visit.ticketNumber})?`,
      onConfirm: () => {
        updateVisitStatus(visit.id, 'IN_EXAM', 'Bắt đầu khám', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
        handleSelectVisit({ ...visit, status: 'IN_EXAM' });
        setActiveTab('IN_EXAM');
      },
    });
  }, [updateVisitStatus, user, handleSelectVisit]);

  const handleStartConclusion = useCallback((visit: Visit) => {
    setConfirm({
      message: `Bắt đầu kết luận cho ${visit.patientName} (${visit.ticketNumber})?`,
      onConfirm: () => {
        updateVisitStatus(visit.id, 'IN_CONCLUSION', 'Bác sĩ bắt đầu kết luận', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
        handleSelectVisit({ ...visit, status: 'IN_CONCLUSION' });
        setActiveTab('CONCLUSION');
      },
    });
  }, [updateVisitStatus, user, handleSelectVisit]);

  const handleSaveClinicalNote = useCallback(() => {
    if (!activeVisitId) return;
    updateDoctorInfo(activeVisitId, {
      chiefComplaint: clinicalForm.chiefComplaint,
      provisionalDiagnosis: clinicalForm.provisionalDiagnosis,
      notes: clinicalForm.clinicalNote,
      treatmentDirection: clinicalForm.treatmentDirection,
    });
  }, [activeVisitId, clinicalForm, updateDoctorInfo]);

  const handleConcludeDirectly = useCallback(() => {
    if (!activeVisit) return;
    setConfirm({
      message: `Kết luận ngay cho ${activeVisit.patientName}? (Không qua CLS)`,
      onConfirm: () => {
        updateDoctorInfo(activeVisit.id, {
          chiefComplaint: clinicalForm.chiefComplaint,
          provisionalDiagnosis: clinicalForm.provisionalDiagnosis,
          notes: clinicalForm.clinicalNote,
          treatmentDirection: clinicalForm.treatmentDirection,
        });
        updateVisitStatus(activeVisit.id, 'IN_CONCLUSION', 'Kết luận không qua CLS', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
        setActiveTab('CONCLUSION');
      },
    });
  }, [activeVisit, clinicalForm, updateDoctorInfo, updateVisitStatus, user]);

  const handleOpenCLS = useCallback(() => {
    setClsInputs([{ ...EMPTY_CLS }]);
    setShowCLSModal(true);
  }, []);

  const handleSubmitCLS = useCallback(() => {
    if (!activeVisit) return;
    const validOrders = clsInputs.filter(i => i.serviceName.trim() !== '');
    if (!validOrders.length) return;
    setConfirm({
      message: `Gửi ${validOrders.length} chỉ định CLS cho ${activeVisit.patientName}? Bệnh nhân sẽ chuyển sang chờ CLS.`,
      onConfirm: () => {
        updateDoctorInfo(activeVisit.id, {
          chiefComplaint: clinicalForm.chiefComplaint,
          provisionalDiagnosis: clinicalForm.provisionalDiagnosis,
          notes: clinicalForm.clinicalNote,
          treatmentDirection: clinicalForm.treatmentDirection,
        });
        const orders = validOrders.map(i => ({
          serviceId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          serviceName: i.serviceName,
          roomId: DEFAULT_CLS_ROOM[i.serviceType],
          priority: i.priorityLevel === 'URGENT' ? ('URGENT' as const) : ('ROUTINE' as const),
          clinicalNote: i.note || undefined,
        }));
        orderCLS(activeVisit.id, activeVisit.patientId, activeVisit.patientName, orders, user?.id ?? 'system');
        setShowCLSModal(false);
        setActiveVisitId(null);
      },
    });
  }, [activeVisit, clsInputs, clinicalForm, updateDoctorInfo, orderCLS, user]);

  const handleCompleteConclusion = useCallback(() => {
    if (!activeVisit) return;
    if (!conclusionForm.finalDiagnosis.trim() || !conclusionForm.conclusion.trim()) return;
    setConfirm({
      message: `Hoàn tất kết luận cho ${activeVisit.patientName}? Bệnh nhân sẽ chuyển sang chờ thanh toán.`,
      onConfirm: () => {
        completeVisit(
          activeVisit.id,
          conclusionForm.finalDiagnosis,
          conclusionForm.conclusion,
          doctor?.id ?? user?.id ?? 'system',
          conclusionForm.treatmentPlan,
          user?.name ?? 'Bác sĩ',
        );
        setActiveVisitId(null);
        setActiveTab('DONE');
      },
    });
  }, [activeVisit, conclusionForm, completeVisit, doctor, user]);

  const handleChangeCLSInput = useCallback((idx: number, field: keyof CLSInput, value: string) => {
    setClsInputs(prev => prev.map((inp, i) => i === idx ? { ...inp, [field]: value } : inp));
  }, []);

  const TABS = [
    { key: 'WAITING' as const, label: 'Chờ khám', count: tabCounts.WAITING },
    { key: 'IN_EXAM' as const, label: 'Đang khám', count: tabCounts.IN_EXAM },
    { key: 'CONCLUSION' as const, label: 'Chờ kết luận', count: tabCounts.CONCLUSION },
    { key: 'DONE' as const, label: 'Đã xử lý', count: tabCounts.DONE },
  ];

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Phòng khám hôm nay</p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{doctorName}</h1>
        </div>
        <StatsCards roomId={roomId} />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Hàng đợi bệnh nhân</h2>
            {nextPatient && (
              <p className="text-sm text-gray-500">
                Tiếp theo: <span className="font-semibold text-sky-700">{nextPatient.patientName} ({nextPatient.ticketNumber})</span>
                {nextPatient.status === 'WAITING_CONCLUSION' && ' — Chờ kết luận'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm tên, số thứ tự..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </div>
            <button onClick={handleCallNext} disabled={!nextPatient}
              className={clsx('inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition',
                nextPatient ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-gray-300')}>
              <PlayCircle size={16} />Gọi tiếp theo
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 px-4 pt-2">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={clsx('border-b-2 px-3 py-2 text-xs font-semibold transition',
                activeTab === tab.key ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {tab.label}
              {tab.count > 0 && (
                <span className={clsx('ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold',
                  activeTab === tab.key ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table / Empty */}
        {tabVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <Stethoscope size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Không có bệnh nhân trong mục này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Tuổi / Giới</th>
                  <th className="px-4 py-3">Lý do khám</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ưu tiên</th>
                  <th className="px-4 py-3">Đã chờ</th>
                  <th className="px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tabVisits.map(visit => {
                  const patient = getPatient(visit.patientId);
                  const isActive = activeVisitId === visit.id;
                  return (
                    <tr key={visit.id} onClick={() => handleSelectVisit(visit)}
                      className={clsx('cursor-pointer transition hover:bg-sky-50/60', isActive && 'bg-sky-50')}>
                      <td className="px-4 py-3 font-mono font-bold text-sky-700">{visit.ticketNumber}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{visit.patientName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {patient ? `${patient.age}t / ${patient.gender === 'MALE' ? 'Nam' : 'Nữ'}` : '—'}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-gray-600">{visit.chiefComplaint ?? '—'}</td>
                      <td className="px-4 py-3"><VisitStatusBadge status={visit.status} /></td>
                      <td className="px-4 py-3"><ScoreBadge score={visit.priorityScore} /></td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={13} className="text-gray-400" />
                          {getWaitTime(visit.checkInTime)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {visit.status === 'WAITING_EXAM' && (
                            <button onClick={e => { e.stopPropagation(); handleStartExam(visit); }}
                              className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50">
                              Bắt đầu khám
                            </button>
                          )}
                          {visit.status === 'WAITING_CONCLUSION' && (
                            <button onClick={e => { e.stopPropagation(); handleStartConclusion(visit); }}
                              className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50">
                              Kết luận
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); handleSelectVisit(visit); }}
                            className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-50">
                            Xem
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {activeVisit && (
        <ActiveVisitPanel
          visit={activeVisit}
          clinicalForm={clinicalForm}
          conclusionForm={conclusionForm}
          onChangeClinical={(f, v) => setClinicalForm(prev => ({ ...prev, [f]: v }))}
          onChangeConclusion={(f, v) => setConclusionForm(prev => ({ ...prev, [f]: v }))}
          onSaveClinicalNote={handleSaveClinicalNote}
          onOpenCLS={handleOpenCLS}
          onConcludeDirectly={handleConcludeDirectly}
          onCompleteConclusion={handleCompleteConclusion}
          onClose={() => setActiveVisitId(null)}
          visitClsOrders={clsOrders.filter(o => o.visitId === activeVisit.id)}
          visitClsResults={clsResults.filter(r => r.visitId === activeVisit.id)}
        />
      )}

      {showCLSModal && activeVisit && (
        <CLSModal
          visit={activeVisit}
          inputs={clsInputs}
          onChangeInput={handleChangeCLSInput}
          onAddInput={() => setClsInputs(prev => [...prev, { ...EMPTY_CLS }])}
          onRemoveInput={idx => setClsInputs(prev => prev.filter((_, i) => i !== idx))}
          onConfirm={handleSubmitCLS}
          onClose={() => setShowCLSModal(false)}
        />
      )}

      {confirm && <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW PAGE
// ─────────────────────────────────────────────────────────────
function OverviewContent({ roomId }: { roomId: string }) {
  const { visits, statusHistory, doctors } = useHospital();
  const { user } = useAuth();
  const doctor = useMemo(() => doctors.find(d => d.roomId === roomId), [doctors, roomId]);
  const doctorName = doctor?.name ?? user?.name ?? 'Bác sĩ';
  const rv = useMemo(() => visits.filter(v => v.roomId === roomId), [visits, roomId]);

  const nextPatients = useMemo(() => {
    const conclusion = rv.filter(v => ['WAITING_CONCLUSION', 'IN_CONCLUSION'].includes(v.status));
    const waiting = rv.filter(v => v.status === 'WAITING_EXAM').sort((a, b) => b.priorityScore - a.priorityScore);
    return [...conclusion, ...waiting].slice(0, 4);
  }, [rv]);

  const recentHistory = useMemo(() =>
    statusHistory.filter(h => rv.some(v => v.id === h.visitId)).slice(-6).reverse(),
    [statusHistory, rv],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Phòng khám hôm nay</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{doctorName}</h1>
        <p className="mt-1 text-sm text-gray-500">Tổng quan ca khám — {new Date().toLocaleDateString('vi-VN')}</p>
      </section>
      <StatsCards roomId={roomId} />
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Bệnh nhân cần gọi tiếp theo</h2>
          {nextPatients.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">Không có bệnh nhân đang chờ.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {nextPatients.map(v => (
                <div key={v.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{v.ticketNumber} — {v.patientName}</p>
                      <p className="mt-1 text-xs text-gray-500">{v.chiefComplaint ?? 'Chưa có lý do'}</p>
                    </div>
                    <VisitStatusBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Hoạt động gần đây</h2>
          <div className="mt-3 space-y-2">
            {recentHistory.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có hoạt động.</p>
            ) : (
              recentHistory.map(h => {
                const vName = rv.find(v => v.id === h.visitId)?.patientName ?? '';
                return (
                  <div key={h.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    <Activity size={13} className="flex-shrink-0 text-sky-600" />
                    <span>{h.timestamp}{vName ? ` — ${vName}` : ''}: → {STATUS_LABEL[h.toStatus]}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PATIENTS PAGE
// ─────────────────────────────────────────────────────────────
function PatientsContent({ roomId }: { roomId: string }) {
  const { visits, patients } = useHospital();
  const [search, setSearch] = useState('');
  const rv = useMemo(() => visits.filter(v => v.roomId === roomId), [visits, roomId]);
  const filtered = useMemo(() => {
    const kw = search.toLowerCase();
    return kw ? rv.filter(v => v.patientName.toLowerCase().includes(kw) || v.ticketNumber.toLowerCase().includes(kw)) : rv;
  }, [rv, search]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Danh sách</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Bệnh nhân hôm nay</h1>
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, số thứ tự..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">STT</th><th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Tuổi / Giới</th><th className="px-4 py-3">Lý do khám</th>
                <th className="px-4 py-3">Chẩn đoán sơ bộ</th><th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Không có dữ liệu</td></tr>
              )}
              {filtered.map(v => {
                const p = patients.find(pt => pt.id === v.patientId);
                return (
                  <tr key={v.id} className="hover:bg-sky-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-sky-700">{v.ticketNumber}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{v.patientName}</td>
                    <td className="px-4 py-3 text-gray-600">{p ? `${p.age}t / ${p.gender === 'MALE' ? 'Nam' : 'Nữ'}` : '—'}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-gray-600">{v.chiefComplaint ?? '—'}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-gray-600">{v.provisionalDiagnosis ?? '—'}</td>
                    <td className="px-4 py-3"><VisitStatusBadge status={v.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULTS PAGE
// ─────────────────────────────────────────────────────────────
function ResultsContent({ roomId }: { roomId: string }) {
  const { visits, clsOrders, clsResults } = useHospital();
  const rv = useMemo(() => visits.filter(v => v.roomId === roomId), [visits, roomId]);
  const visitIds = useMemo(() => new Set(rv.map(v => v.id)), [rv]);
  const myOrders = useMemo(() => clsOrders.filter(o => visitIds.has(o.visitId)), [clsOrders, visitIds]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(myOrders[0]?.id ?? null);
  const selectedOrder = myOrders.find(o => o.id === selectedOrderId);
  const selectedResult = clsResults.find(r => r.orderId === selectedOrderId);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Kết quả CLS</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Kết quả cận lâm sàng</h1>
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Bệnh nhân</th><th className="px-4 py-3">Dịch vụ</th>
                  <th className="px-4 py-3">Chỉ định lúc</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">KQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myOrders.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Chưa có chỉ định CLS</td></tr>
                )}
                {myOrders.map(o => {
                  const res = clsResults.find(r => r.orderId === o.id);
                  return (
                    <tr key={o.id} onClick={() => setSelectedOrderId(o.id)}
                      className={clsx('cursor-pointer hover:bg-sky-50/60', selectedOrderId === o.id && 'bg-sky-50')}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{o.patientName}</td>
                      <td className="px-4 py-3 text-gray-600">{o.serviceName}</td>
                      <td className="px-4 py-3 text-gray-500">{o.orderedAt}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold',
                          o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          o.status === 'IN_PROGRESS' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600')}>
                          {o.status === 'COMPLETED' ? 'Đã xong' : o.status === 'IN_PROGRESS' ? 'Đang thực hiện' : o.status === 'ASSIGNED' ? 'Đã nhận' : 'Đang chờ'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {res ? (
                          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold',
                            res.isAbnormal ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}>
                            {res.isAbnormal ? 'Bất thường' : 'Bình thường'}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-900">Chi tiết kết quả</h3>
          {!selectedOrder ? (
            <p className="mt-3 text-sm text-gray-400">Chọn một chỉ định để xem chi tiết.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <p><span className="text-gray-500">Bệnh nhân: </span><span className="font-semibold text-gray-900">{selectedOrder.patientName}</span></p>
              <p><span className="text-gray-500">Dịch vụ: </span>{selectedOrder.serviceName}</p>
              {selectedOrder.clinicalNote && <p><span className="text-gray-500">Ghi chú: </span>{selectedOrder.clinicalNote}</p>}
              {selectedResult ? (
                <div className={clsx('rounded-lg border p-3 text-xs',
                  selectedResult.isAbnormal ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-gray-200 bg-gray-50 text-gray-700')}>
                  {selectedResult.isAbnormal && (
                    <p className="mb-1 flex items-center gap-1 font-bold text-rose-700"><AlertCircle size={12} />Kết quả bất thường</p>
                  )}
                  <p className="leading-relaxed">{selectedResult.result}</p>
                  {selectedResult.note && <p className="mt-1 italic text-gray-500">{selectedResult.note}</p>}
                  <p className="mt-2 text-gray-400">Thực hiện: {selectedResult.performedAt}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-400">Chưa có kết quả</div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCHEDULE PAGE
// ─────────────────────────────────────────────────────────────
function ScheduleContent() {
  const shifts = [
    { date: 'Hôm nay', time: '07:30 - 11:30', room: 'Phòng khám', booked: 14, status: 'Đang làm việc' },
    { date: 'Hôm nay', time: '13:30 - 17:00', room: 'Phòng khám', booked: 10, status: 'Sắp tới' },
  ];
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Lịch làm việc</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Lịch khám của bác sĩ</h1>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shifts.map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{s.date}</p>
                <p className="mt-1 text-xs text-gray-500">{s.time} • {s.room}</p>
              </div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{s.status}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{s.booked}<span className="ml-1 text-xs font-medium text-gray-500">bệnh nhân</span></p>
          </div>
        ))}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REPORTS PAGE
// ─────────────────────────────────────────────────────────────
function ReportsContent({ roomId }: { roomId: string }) {
  const { visits } = useHospital();
  const rv = useMemo(() => visits.filter(v => v.roomId === roomId), [visits, roomId]);
  const stats = [
    ['Tổng lượt hôm nay', String(rv.length)],
    ['Đã hoàn tất', String(rv.filter(v => ['COMPLETED', 'WAITING_PAYMENT'].includes(v.status)).length)],
    ['Có chỉ định CLS', String(rv.filter(v => (v.clsOrders?.length ?? 0) > 0).length)],
    ['Đang xử lý', String(rv.filter(v => !['COMPLETED', 'WAITING_PAYMENT', 'CANCELLED'].includes(v.status)).length)],
    ['Đã hủy', String(rv.filter(v => v.status === 'CANCELLED').length)],
  ];
  const chartData = [
    ['Chờ khám', rv.filter(v => v.status === 'WAITING_EXAM').length],
    ['Đang/Đã khám', rv.filter(v => ['IN_EXAM', 'IN_CONCLUSION'].includes(v.status)).length],
    ['Chờ CLS/KQ', rv.filter(v => ['WAITING_CLS', 'IN_CLS', 'WAITING_RESULT'].includes(v.status)).length],
    ['Chờ kết luận', rv.filter(v => ['WAITING_CONCLUSION', 'IN_CONCLUSION'].includes(v.status)).length],
    ['Hoàn tất', rv.filter(v => ['WAITING_PAYMENT', 'COMPLETED'].includes(v.status)).length],
  ] as [string, number][];
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Báo cáo</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Báo cáo cá nhân</h1>
      </section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, val]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{val}</p>
          </div>
        ))}
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-gray-900">Thống kê theo trạng thái</h2>
        {chartData.map(([label, count]) => (
          <div key={label} className="mb-3">
            <div className="mb-1 flex justify-between text-xs font-semibold text-gray-600">
              <span>{label}</span><span>{count}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: rv.length ? `${(count / rv.length) * 100}%` : '0%' }} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACCOUNT PAGE
// ─────────────────────────────────────────────────────────────
function AccountContent() {
  const { user } = useAuth();
  const { doctors } = useHospital();
  const doctor = doctors.find(d => d.roomId === user?.roomId);
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Tài khoản</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-600 text-2xl font-bold text-white">
            {user?.name.split(' ').pop()?.charAt(0)}
          </div>
          <h2 className="mt-3 text-lg font-bold text-gray-900">{user?.name}</h2>
          <p className="text-sm font-semibold text-sky-700">Bác sĩ</p>
          {doctor && <p className="mt-1 text-sm text-gray-500">{doctor.specialty} • {doctor.department}</p>}
          <div className="mt-5 w-full space-y-2 text-left text-sm text-gray-700">
            <p className="flex items-center gap-2"><Mail size={15} className="text-sky-600" />{user?.username}@mediflow.vn</p>
            <p className="flex items-center gap-2"><Shield size={15} className="text-sky-600" />{user?.department}</p>
            {doctor && <p className="flex items-center gap-2"><BarChart3 size={15} className="text-sky-600" />{doctor.qualifications}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[
            { title: 'Đổi mật khẩu', icon: Lock, fields: ['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới'] },
            { title: 'Cài đặt thông báo', icon: Settings, fields: ['Thông báo CLS mới', 'Nhắc lịch khám', 'Kết quả bất thường'] },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Icon size={16} className="text-sky-600" />{s.title}</h3>
                <div className="mt-3 space-y-2">
                  {s.fields.map(f => (
                    <input key={f} placeholder={f} type={f.includes('mật khẩu') || f.includes('Mật') ? 'password' : 'text'}
                      className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">Cập nhật</button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
          <KeyRound size={15} />Đổi mật khẩu
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WORKSPACE HOME — 3-COLUMN MAIN VIEW
// ─────────────────────────────────────────────────────────────
function DoctorWorkspaceHome({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const { visits, patients, doctors, rooms, clsOrders, clsResults, statusHistory,
    updateVisitStatus, updateDoctorInfo, orderCLS, completeVisit } = useHospital();

  const doctor = useMemo(() => doctors.find(d => d.roomId === roomId), [doctors, roomId]);
  const room = useMemo(() => rooms.find(r => r.id === roomId), [rooms, roomId]);
  const doctorName = doctor?.name ?? user?.name ?? 'Bác sĩ';

  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<'ALL' | 'WAITING' | 'AFTER_CLS' | 'PRIORITY' | 'APPOINTMENT'>('ALL');
  const [queueSearch, setQueueSearch] = useState('');
  const [clinicalForm, setClinicalForm] = useState<ClinicalNoteForm>(EMPTY_CLINICAL);
  const [conclusionForm, setConclusionForm] = useState<ConclusionForm>(EMPTY_CONCLUSION);
  const [showCLSModal, setShowCLSModal] = useState(false);
  const [clsInputs, setClsInputs] = useState<CLSInput[]>([{ ...EMPTY_CLS }]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const roomVisits = useMemo(() => visits.filter(v => v.roomId === roomId), [visits, roomId]);
  const activeVisit = useMemo(() =>
    activeVisitId ? visits.find(v => v.id === activeVisitId) ?? null : null,
    [visits, activeVisitId],
  );

  const ACTIONABLE_STATUSES: PatientStatus[] = [
    'WAITING_EXAM', 'IN_EXAM', 'WAITING_CLS', 'IN_CLS', 'WAITING_RESULT', 'WAITING_CONCLUSION', 'IN_CONCLUSION',
  ];
  const LANE_ORDER: Record<string, number> = { APPOINTMENT: 0, AFTER_CLS: 1, PRIORITY: 2, NORMAL: 3 };

  const queueVisits = useMemo(() => {
    const base = roomVisits.filter(v => ACTIONABLE_STATUSES.includes(v.status));
    return [...base].sort((a, b) => {
      const la = LANE_ORDER[a.lane] ?? 3, lb = LANE_ORDER[b.lane] ?? 3;
      if (la !== lb) return la - lb;
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return a.checkInTime.localeCompare(b.checkInTime);
    });
  }, [roomVisits]);

  const filteredQueue = useMemo(() => {
    const kw = queueSearch.trim().toLowerCase();
    let list = queueVisits;
    if (queueTab === 'WAITING') list = list.filter(v => v.status === 'WAITING_EXAM');
    else if (queueTab === 'AFTER_CLS') list = list.filter(v => v.lane === 'AFTER_CLS' || v.status === 'WAITING_CONCLUSION');
    else if (queueTab === 'PRIORITY') list = list.filter(v => v.lane === 'PRIORITY' || v.priorityScore >= 80);
    else if (queueTab === 'APPOINTMENT') list = list.filter(v => v.lane === 'APPOINTMENT');
    if (kw) list = list.filter(v => v.patientName.toLowerCase().includes(kw) || v.ticketNumber.toLowerCase().includes(kw));
    return list;
  }, [queueVisits, queueTab, queueSearch]);

  const nextPatient = useMemo(() =>
    queueVisits.find(v => v.status === 'WAITING_EXAM' || v.status === 'WAITING_CONCLUSION') ?? null,
    [queueVisits],
  );

  const stats = useMemo(() => {
    const rvIds = new Set(roomVisits.map(v => v.id));
    return {
      waiting: roomVisits.filter(v => v.status === 'WAITING_EXAM').length,
      inExam: roomVisits.filter(v => ['IN_EXAM', 'IN_CONCLUSION'].includes(v.status)).length,
      afterCLS: roomVisits.filter(v => ['WAITING_CONCLUSION', 'WAITING_RESULT'].includes(v.status)).length,
      done: roomVisits.filter(v => ['WAITING_PAYMENT', 'COMPLETED'].includes(v.status)).length,
      abnormal: clsResults.filter(r => r.isAbnormal && rvIds.has(r.visitId)).length,
    };
  }, [roomVisits, clsResults]);

  const getWaitTime = useCallback((checkInTime: string) => {
    const [h, m] = checkInTime.split(':').map(Number);
    const now = new Date();
    const mins = (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
    if (isNaN(mins) || mins < 0) return '—';
    if (mins < 60) return `${mins}p`;
    return `${Math.floor(mins / 60)}h${mins % 60}p`;
  }, []);

  const getPatient = useCallback((id: string) => patients.find(p => p.id === id), [patients]);
  const hasAbnormal = useCallback((visitId: string) =>
    clsResults.some(r => r.visitId === visitId && r.isAbnormal), [clsResults]);

  const handleSelectVisit = useCallback((visit: Visit) => {
    setActiveVisitId(visit.id);
    setClinicalForm({
      chiefComplaint: visit.chiefComplaint ?? '',
      provisionalDiagnosis: visit.provisionalDiagnosis ?? '',
      clinicalNote: visit.notes ?? '',
      treatmentDirection: (visit as Visit & { treatmentDirection?: string }).treatmentDirection ?? '',
    });
    setConclusionForm({
      finalDiagnosis: visit.finalDiagnosis ?? '',
      conclusion: visit.conclusion ?? '',
      treatmentPlan: (visit as Visit & { treatmentPlan?: string }).treatmentPlan ?? '',
    });
  }, []);

  const handleCallNext = useCallback(() => {
    if (!nextPatient) return;
    setConfirm({
      message: `Gọi bệnh nhân ${nextPatient.patientName} (${nextPatient.ticketNumber}) vào khám?`,
      onConfirm: () => {
        const newStatus: PatientStatus = nextPatient.status === 'WAITING_CONCLUSION' ? 'IN_CONCLUSION' : 'IN_EXAM';
        updateVisitStatus(nextPatient.id, newStatus, 'Bác sĩ gọi khám', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
        handleSelectVisit({ ...nextPatient, status: newStatus });
      },
    });
  }, [nextPatient, updateVisitStatus, user, handleSelectVisit]);

  const handleStartExam = useCallback((visit: Visit) => {
    updateVisitStatus(visit.id, 'IN_EXAM', 'Bắt đầu khám', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
    handleSelectVisit({ ...visit, status: 'IN_EXAM' });
  }, [updateVisitStatus, user, handleSelectVisit]);

  const handleStartConclusion = useCallback((visit: Visit) => {
    updateVisitStatus(visit.id, 'IN_CONCLUSION', 'Bác sĩ bắt đầu kết luận', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
    handleSelectVisit({ ...visit, status: 'IN_CONCLUSION' });
  }, [updateVisitStatus, user, handleSelectVisit]);

  const handleSaveClinicalNote = useCallback(() => {
    if (!activeVisitId) return;
    updateDoctorInfo(activeVisitId, {
      chiefComplaint: clinicalForm.chiefComplaint,
      provisionalDiagnosis: clinicalForm.provisionalDiagnosis,
      notes: clinicalForm.clinicalNote,
      treatmentDirection: clinicalForm.treatmentDirection,
    });
  }, [activeVisitId, clinicalForm, updateDoctorInfo]);

  const handleConcludeDirectly = useCallback(() => {
    if (!activeVisit) return;
    setConfirm({
      message: `Kết luận ngay cho ${activeVisit.patientName}? (Không qua CLS)`,
      onConfirm: () => {
        updateDoctorInfo(activeVisit.id, {
          chiefComplaint: clinicalForm.chiefComplaint,
          provisionalDiagnosis: clinicalForm.provisionalDiagnosis,
          notes: clinicalForm.clinicalNote,
          treatmentDirection: clinicalForm.treatmentDirection,
        });
        updateVisitStatus(activeVisit.id, 'IN_CONCLUSION', 'Kết luận không qua CLS', user?.id ?? 'system', user?.name ?? 'Bác sĩ');
      },
    });
  }, [activeVisit, clinicalForm, updateDoctorInfo, updateVisitStatus, user]);

  const handleOpenCLS = useCallback(() => {
    setClsInputs([{ ...EMPTY_CLS }]);
    setShowCLSModal(true);
  }, []);

  const handleSubmitCLS = useCallback(() => {
    if (!activeVisit) return;
    const valid = clsInputs.filter(i => i.serviceName.trim() !== '');
    if (!valid.length) return;
    setConfirm({
      message: `Gửi ${valid.length} chỉ định CLS cho ${activeVisit.patientName}? Bệnh nhân sẽ chuyển sang chờ CLS.`,
      onConfirm: () => {
        updateDoctorInfo(activeVisit.id, {
          chiefComplaint: clinicalForm.chiefComplaint,
          provisionalDiagnosis: clinicalForm.provisionalDiagnosis,
          notes: clinicalForm.clinicalNote,
          treatmentDirection: clinicalForm.treatmentDirection,
        });
        orderCLS(
          activeVisit.id, activeVisit.patientId, activeVisit.patientName,
          valid.map(i => ({
            serviceId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            serviceName: i.serviceName,
            roomId: DEFAULT_CLS_ROOM[i.serviceType],
            priority: i.priorityLevel === 'URGENT' ? ('URGENT' as const) : ('ROUTINE' as const),
            clinicalNote: i.note || undefined,
          })),
          user?.id ?? 'system',
        );
        setShowCLSModal(false);
        setActiveVisitId(null);
      },
    });
  }, [activeVisit, clsInputs, clinicalForm, updateDoctorInfo, orderCLS, user]);

  const handleCompleteConclusion = useCallback(() => {
    if (!activeVisit || !conclusionForm.finalDiagnosis.trim() || !conclusionForm.conclusion.trim()) return;
    setConfirm({
      message: `Hoàn tất kết luận cho ${activeVisit.patientName}? Bệnh nhân sẽ chuyển sang chờ thanh toán.`,
      onConfirm: () => {
        completeVisit(
          activeVisit.id, conclusionForm.finalDiagnosis, conclusionForm.conclusion,
          doctor?.id ?? user?.id ?? 'system', conclusionForm.treatmentPlan, user?.name ?? 'Bác sĩ',
        );
        setActiveVisitId(null);
      },
    });
  }, [activeVisit, conclusionForm, completeVisit, doctor, user]);

  const visitStatusHistory = useMemo(() =>
    activeVisit ? statusHistory.filter(h => h.visitId === activeVisit.id) : [], [statusHistory, activeVisit]);
  const visitClsOrders = useMemo(() =>
    activeVisit ? clsOrders.filter(o => o.visitId === activeVisit.id) : [], [clsOrders, activeVisit]);
  const visitClsResults = useMemo(() =>
    activeVisit ? clsResults.filter(r => r.visitId === activeVisit.id) : [], [clsResults, activeVisit]);

  const canConclude = conclusionForm.finalDiagnosis.trim() !== '' && conclusionForm.conclusion.trim() !== '';

  const QUEUE_TABS = [
    { key: 'ALL' as const, label: 'Tất cả' },
    { key: 'WAITING' as const, label: 'Chờ khám' },
    { key: 'AFTER_CLS' as const, label: 'Sau CLS' },
    { key: 'PRIORITY' as const, label: 'Ưu tiên' },
    { key: 'APPOINTMENT' as const, label: 'Đặt lịch' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── HEADER ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Phòng khám của tôi</p>
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">{doctorName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {doctor && <span className="font-medium text-indigo-700">{doctor.specialty}</span>}
              {room && <span>• {room.name}</span>}
              <span>• {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          <button
            onClick={handleCallNext}
            disabled={!nextPatient}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition',
              nextPatient ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-gray-300',
            )}
          >
            <PlayCircle size={16} />Gọi bệnh nhân tiếp theo
          </button>
        </div>
        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: 'Đang chờ khám', value: stats.waiting, cls: 'bg-blue-50 text-blue-700' },
            { label: 'Đang khám', value: stats.inExam, cls: 'bg-indigo-50 text-indigo-700' },
            { label: 'Quay lại sau CLS', value: stats.afterCLS, cls: 'bg-amber-50 text-amber-700' },
            { label: 'Đã khám hôm nay', value: stats.done, cls: 'bg-emerald-50 text-emerald-700' },
            { label: 'Kết quả bất thường', value: stats.abnormal, cls: 'bg-rose-50 text-rose-700' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-lg px-3 py-2 text-center', s.cls)}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[300px_minmax(0,1fr)_300px]">

        {/* ── LEFT: Queue ── */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={queueSearch}
              onChange={e => setQueueSearch(e.target.value)}
              placeholder="Tìm bệnh nhân..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {QUEUE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setQueueTab(t.key)}
                className={clsx(
                  'rounded px-2.5 py-1 text-xs font-semibold transition',
                  queueTab === t.key ? 'bg-sky-600 text-white' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            {filteredQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-10 text-gray-400 shadow-sm">
                <Stethoscope size={28} className="mb-2 opacity-30" />
                <p className="text-xs font-medium">Không có bệnh nhân</p>
              </div>
            ) : filteredQueue.map(visit => {
              const patient = getPatient(visit.patientId);
              const isActive = activeVisitId === visit.id;
              const isAfterCLS = visit.lane === 'AFTER_CLS' || visit.status === 'WAITING_CONCLUSION';
              const isAbn = hasAbnormal(visit.id);
              return (
                <div
                  key={visit.id}
                  onClick={() => handleSelectVisit(visit)}
                  className={clsx(
                    'cursor-pointer rounded-xl border p-3 shadow-sm transition hover:shadow-md',
                    isActive
                      ? 'border-sky-400 bg-sky-50'
                      : isAfterCLS
                        ? 'border-amber-300 bg-amber-50/60'
                        : 'border-gray-200 bg-white hover:border-sky-200',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-sky-700">{visit.ticketNumber}</span>
                    <VisitStatusBadge status={visit.status} />
                  </div>
                  <p className="mt-1.5 text-sm font-semibold leading-tight text-gray-900">{visit.patientName}</p>
                  {patient && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {patient.age}t • {patient.gender === 'MALE' ? 'Nam' : 'Nữ'}
                    </p>
                  )}
                  {visit.chiefComplaint && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-600">{visit.chiefComplaint}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className={clsx(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                      visit.lane === 'APPOINTMENT' ? 'bg-sky-100 text-sky-700' :
                      visit.lane === 'AFTER_CLS' ? 'bg-amber-100 text-amber-700' :
                      visit.lane === 'PRIORITY' ? 'bg-rose-100 text-rose-700' :
                      'bg-gray-100 text-gray-600',
                    )}>
                      {visit.lane === 'APPOINTMENT' ? 'Đặt lịch' :
                       visit.lane === 'AFTER_CLS' ? 'Sau CLS' :
                       visit.lane === 'PRIORITY' ? 'Ưu tiên' : 'Thường'}
                    </span>
                    {isAfterCLS && visit.status === 'WAITING_CONCLUSION' && (
                      <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Chờ KL
                      </span>
                    )}
                    {visit.priorityScore >= 80 && <ScoreBadge score={visit.priorityScore} />}
                    {isAbn && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        <AlertCircle size={10} />Bất thường
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400">
                      <Clock3 size={11} />{getWaitTime(visit.checkInTime)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MIDDLE: Exam panel ── */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {!activeVisit ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center" style={{ minHeight: '400px' }}>
              <Stethoscope size={48} className="mb-4 opacity-20 text-gray-400" />
              <p className="text-base font-semibold text-gray-500">Chưa chọn bệnh nhân</p>
              <p className="mt-1 max-w-xs text-sm text-gray-400">
                Chọn bệnh nhân từ hàng đợi hoặc gọi bệnh nhân tiếp theo để bắt đầu khám.
              </p>
              <button
                onClick={handleCallNext}
                disabled={!nextPatient}
                className={clsx(
                  'mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition',
                  nextPatient ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-gray-300',
                )}
              >
                <PlayCircle size={16} />Gọi bệnh nhân tiếp theo
              </button>
            </div>
          ) : (
            <>
              {/* Patient header */}
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-sky-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{activeVisit.patientName}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>Số {activeVisit.ticketNumber}</span>
                      {(() => {
                        const p = getPatient(activeVisit.patientId);
                        return p ? <span>{p.age}t • {p.gender === 'MALE' ? 'Nam' : 'Nữ'}</span> : null;
                      })()}
                      {activeVisit.chiefComplaint && (
                        <span className="text-gray-600">• {activeVisit.chiefComplaint}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <VisitStatusBadge status={activeVisit.status} />
                  <button
                    onClick={() => setActiveVisitId(null)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {/* Info bar */}
              <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                <span><span className="font-medium">Đã chờ:</span> {getWaitTime(activeVisit.checkInTime)}</span>
                <span><span className="font-medium">Làn:</span> {
                  activeVisit.lane === 'APPOINTMENT' ? 'Đặt lịch' :
                  activeVisit.lane === 'AFTER_CLS' ? 'Sau CLS' :
                  activeVisit.lane === 'PRIORITY' ? 'Ưu tiên' : 'Thường'
                }</span>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* WAITING_EXAM */}
                {activeVisit.status === 'WAITING_EXAM' && (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <p className="text-sm text-gray-500">Bệnh nhân đang chờ vào khám</p>
                    <button
                      onClick={() => handleStartExam(activeVisit)}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                    >
                      <PlayCircle size={16} />Bắt đầu khám
                    </button>
                  </div>
                )}

                {/* IN_EXAM */}
                {activeVisit.status === 'IN_EXAM' && (
                  <section>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                      <Stethoscope size={16} className="text-indigo-600" />Khám lâm sàng
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500">Lý do khám / Triệu chứng</label>
                        <textarea rows={2} value={clinicalForm.chiefComplaint}
                          onChange={e => setClinicalForm(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                          placeholder="Mô tả lý do khám và triệu chứng chính..."
                          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500">Chẩn đoán sơ bộ</label>
                        <input value={clinicalForm.provisionalDiagnosis}
                          onChange={e => setClinicalForm(prev => ({ ...prev, provisionalDiagnosis: e.target.value }))}
                          placeholder="Chẩn đoán sơ bộ..."
                          className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú khám</label>
                        <textarea rows={2} value={clinicalForm.clinicalNote}
                          onChange={e => setClinicalForm(prev => ({ ...prev, clinicalNote: e.target.value }))}
                          placeholder="Mô tả chi tiết kết quả thăm khám..."
                          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500">Hướng xử lý dự kiến</label>
                        <input value={clinicalForm.treatmentDirection}
                          onChange={e => setClinicalForm(prev => ({ ...prev, treatmentDirection: e.target.value }))}
                          placeholder="Hướng điều trị, theo dõi..."
                          className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button onClick={handleSaveClinicalNote}
                          className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                          <Save size={15} />Lưu ghi chú
                        </button>
                        <button onClick={handleOpenCLS}
                          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700">
                          <FlaskConical size={15} />Chỉ định CLS
                        </button>
                        <button onClick={handleConcludeDirectly}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                          <ClipboardCheck size={15} />Kết luận ngay
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* WAITING_CONCLUSION */}
                {activeVisit.status === 'WAITING_CONCLUSION' && (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <p className="text-sm text-gray-500">Bệnh nhân đã quay lại sau CLS — sẵn sàng kết luận</p>
                    <button
                      onClick={() => handleStartConclusion(activeVisit)}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                    >
                      <FileSearch size={16} />Gọi lại kết luận
                    </button>
                  </div>
                )}

                {/* IN_CONCLUSION */}
                {activeVisit.status === 'IN_CONCLUSION' && (
                  <section>
                    {(activeVisit.chiefComplaint || activeVisit.provisionalDiagnosis) && (
                      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Thông tin lâm sàng đã ghi</p>
                        <div className="space-y-1">
                          {activeVisit.chiefComplaint && (
                            <p><span className="text-gray-500">Lý do: </span><span className="text-gray-800">{activeVisit.chiefComplaint}</span></p>
                          )}
                          {activeVisit.provisionalDiagnosis && (
                            <p><span className="text-gray-500">Chẩn đoán sơ bộ: </span><span className="font-medium text-gray-800">{activeVisit.provisionalDiagnosis}</span></p>
                          )}
                        </div>
                      </div>
                    )}
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                      <FileSearch size={16} className="text-amber-600" />Kết luận khám
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500">Chẩn đoán cuối cùng *</label>
                        <input value={conclusionForm.finalDiagnosis}
                          onChange={e => setConclusionForm(prev => ({ ...prev, finalDiagnosis: e.target.value }))}
                          placeholder="Bệnh chính, bệnh kèm (ICD-10 nếu có)..."
                          className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500">Kết luận *</label>
                        <textarea rows={3} value={conclusionForm.conclusion}
                          onChange={e => setConclusionForm(prev => ({ ...prev, conclusion: e.target.value }))}
                          placeholder="Kết luận tổng thể về tình trạng bệnh nhân..."
                          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500">Hướng điều trị / Đơn thuốc</label>
                        <textarea rows={2} value={conclusionForm.treatmentPlan}
                          onChange={e => setConclusionForm(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                          placeholder="Phác đồ điều trị, đơn thuốc, lịch tái khám..."
                          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </div>
                      {!canConclude && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600">
                          <AlertCircle size={13} />Vui lòng nhập chẩn đoán cuối và kết luận trước khi hoàn tất.
                        </p>
                      )}
                      <button
                        disabled={!canConclude}
                        onClick={handleCompleteConclusion}
                        className={clsx(
                          'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition',
                          canConclude ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'cursor-not-allowed bg-gray-200 text-gray-400',
                        )}
                      >
                        <CheckCircle2 size={16} />Hoàn tất kết luận → Chờ thanh toán
                      </button>
                    </div>
                  </section>
                )}

                {/* OTHER STATUSES */}
                {!['WAITING_EXAM', 'IN_EXAM', 'WAITING_CONCLUSION', 'IN_CONCLUSION'].includes(activeVisit.status) && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Clock3 size={32} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">
                      {activeVisit.status === 'WAITING_CLS' && 'Bệnh nhân đang chờ thực hiện CLS'}
                      {activeVisit.status === 'IN_CLS' && 'Bệnh nhân đang được thực hiện CLS'}
                      {activeVisit.status === 'WAITING_RESULT' && 'Đang chờ kết quả CLS'}
                      {activeVisit.status === 'WAITING_PAYMENT' && 'Bệnh nhân đang chờ thanh toán'}
                      {activeVisit.status === 'COMPLETED' && 'Lượt khám đã hoàn tất'}
                      {activeVisit.status === 'CANCELLED' && 'Lượt khám đã hủy'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Context panel ── */}
        <div className="flex flex-col gap-3">
          {!activeVisit ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center shadow-sm">
              <FileSearch size={28} className="mb-2 opacity-30 text-gray-400" />
              <p className="text-xs font-medium text-gray-500">Chưa có lượt khám được chọn</p>
              <p className="mt-1 text-xs text-gray-400">Chọn bệnh nhân từ hàng đợi để xem thông tin</p>
            </div>
          ) : (
            <>
              {/* Timeline */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                  <Activity size={13} className="text-sky-600" />Timeline
                </h4>
                {visitStatusHistory.length === 0 ? (
                  <p className="text-xs text-gray-400">Chưa có lịch sử trạng thái.</p>
                ) : (
                  <div className="relative space-y-2 pl-4">
                    {visitStatusHistory.map((h, i) => (
                      <div key={h.id} className="relative">
                        <div className="absolute -left-4 top-2 h-2 w-2 rounded-full border-2 border-sky-400 bg-white" />
                        {i < visitStatusHistory.length - 1 && (
                          <div className="absolute -left-[13px] top-4 h-full w-px bg-gray-200" />
                        )}
                        <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-xs">
                          <p className="font-semibold text-gray-800">{STATUS_LABEL[h.toStatus]}</p>
                          <p className="text-gray-500">{h.timestamp} • {h.performedByName}</p>
                          {h.note && <p className="mt-0.5 italic text-gray-400">{h.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CLS Orders */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                  <FlaskConical size={13} className="text-purple-600" />Chỉ định CLS
                  <span className="ml-auto text-gray-400">({visitClsOrders.length})</span>
                </h4>
                {visitClsOrders.length === 0 ? (
                  <p className="text-xs text-gray-400">Chưa có chỉ định CLS.</p>
                ) : (
                  <div className="space-y-2">
                    {visitClsOrders.map(order => (
                      <div key={order.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs">
                        <p className="font-semibold text-gray-800">{order.serviceName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {order.priority === 'URGENT' && (
                            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-700">Khẩn</span>
                          )}
                          <span className={clsx('rounded-full px-1.5 py-0.5 font-semibold',
                            order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'IN_PROGRESS' ? 'bg-violet-100 text-violet-700' :
                            order.status === 'ASSIGNED' ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600')}>
                            {order.status === 'COMPLETED' ? 'Đã xong' :
                             order.status === 'IN_PROGRESS' ? 'Đang làm' :
                             order.status === 'ASSIGNED' ? 'Đã nhận' : 'Chờ'}
                          </span>
                          <span className="text-gray-400">{order.orderedAt}</span>
                        </div>
                        {order.clinicalNote && <p className="mt-1 italic text-gray-400">{order.clinicalNote}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CLS Results */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                  <CheckCircle2 size={13} className="text-emerald-600" />Kết quả CLS
                  <span className="ml-auto text-gray-400">({visitClsResults.length})</span>
                </h4>
                {visitClsResults.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-4 text-center text-xs text-gray-400">
                    Chưa có kết quả CLS
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visitClsResults.map(result => {
                      const order = clsOrders.find(o => o.id === result.orderId);
                      return (
                        <div key={result.id} className={clsx('rounded-lg border p-2 text-xs',
                          result.isAbnormal ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-gray-50')}>
                          {order && <p className="font-semibold text-gray-800">{order.serviceName}</p>}
                          {result.isAbnormal && (
                            <p className="mt-0.5 flex items-center gap-1 font-bold text-rose-700">
                              <AlertCircle size={11} />Kết quả bất thường
                            </p>
                          )}
                          <p className="mt-1 leading-relaxed text-gray-700">{result.result}</p>
                          {result.note && <p className="mt-1 italic text-gray-500">{result.note}</p>}
                          <p className="mt-1 text-gray-400">{result.performedAt}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showCLSModal && activeVisit && (
        <CLSModal
          visit={activeVisit}
          inputs={clsInputs}
          onChangeInput={(i, f, v) => setClsInputs(prev => prev.map((inp, idx) => idx === i ? { ...inp, [f]: v } : inp))}
          onAddInput={() => setClsInputs(prev => [...prev, { ...EMPTY_CLS }])}
          onRemoveInput={idx => setClsInputs(prev => prev.filter((_, i) => i !== idx))}
          onConfirm={handleSubmitCLS}
          onClose={() => setShowCLSModal(false)}
        />
      )}

      {confirm && <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────
export default function DoctorWorkspace({ roomId }: DoctorWorkspaceProps) {
  const [searchParams] = useSearchParams();
  const view = (searchParams.get('view') ?? 'workspace') as DoctorView;

  if (view === 'workspace') return <DoctorWorkspaceHome roomId={roomId} />;
  if (view === 'queue') return <QueuePageContent roomId={roomId} />;
  if (view === 'patients') return <PatientsContent roomId={roomId} />;
  if (view === 'results') return <ResultsContent roomId={roomId} />;
  if (view === 'schedule') return <ScheduleContent />;
  if (view === 'reports') return <ReportsContent roomId={roomId} />;
  if (view === 'account') return <AccountContent />;
  return <DoctorWorkspaceHome roomId={roomId} />;
}
