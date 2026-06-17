import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, FileSearch, FlaskConical, PlayCircle, Search, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { ErrorState, EmptyState, LoadingState, PaginationBar } from '../components/common/PageState';
import { clsApi } from '../services/clsApi';
import { dashboardApi } from '../services/dashboardApi';
import { doctorApi } from '../services/doctorApi';
import { serviceApi } from '../services/serviceApi';
import { turnApi } from '../services/turnApi';
import { visitApi } from '../services/visitApi';
import type {
  ApiPagination,
  CLSResultSummaryDto,
  DashboardOverviewDto,
  DoctorDto,
  ServiceDto,
  TurnDetailDto,
  TurnSummaryDto,
  VisitListItemDto,
} from '../services/backend-types';
import { formatDateTime } from '../lib/format';
import StatusBadge from '../components/ui/StatusBadge';
import { LaneBadge, PriorityBadge } from '../components/ui/PriorityBadge';
import { clsx } from 'clsx';
import type { PatientStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';

const TURN_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ gọi',
  CALLED: 'Đã gọi',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn tất',
  TIMEOUT: 'Quá giờ',
  CANCELLED: 'Đã hủy',
};

const TURN_STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
  CALLED: 'bg-sky-100 text-sky-700 border-sky-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  TIMEOUT: 'bg-amber-100 text-amber-700 border-amber-200',
  CANCELLED: 'bg-rose-100 text-rose-700 border-rose-200',
};

function TurnStatusPill({ status }: { status: string }) {
  return (
    <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', TURN_STATUS_CLASS[status] ?? TURN_STATUS_CLASS.PENDING)}>
      {TURN_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TurnRow({
  turn,
  selected,
  onSelect,
  onStart,
  onComplete,
  pendingAction,
}: {
  turn: TurnSummaryDto;
  selected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onComplete: () => void;
  pendingAction: boolean;
}) {
  const progressStatus = turn.progress?.status ?? 'PENDING';
  const canStart = !['IN_PROGRESS', 'COMPLETED', 'TIMEOUT', 'CANCELLED'].includes(progressStatus);
  const canComplete = progressStatus === 'IN_PROGRESS';

  return (
    <tr
      className={clsx(
        'border-b border-gray-50 transition hover:bg-gray-50/70',
        selected && 'bg-sky-50/60',
      )}
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <div className="font-mono text-xs font-black text-sky-700">{turn.turnId}</div>
        <div className="mt-1 text-xs text-gray-400">{formatDateTime(turn.createdAt)}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{turn.visit.patient.fullName}</div>
        <div className="text-xs text-gray-400">
          {turn.visit.queueNumber} · {turn.visit.patient.patientCode}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={turn.visit.currentState as PatientStatus} size="sm" />
          <LaneBadge lane={turn.visit.appointment ? 'APPOINTMENT' : turn.queueItem?.laneType ?? 'NORMAL'} size="sm" />
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-gray-800">{turn.room?.name ?? 'Chưa có'}</p>
        <p className="text-xs text-gray-400">{turn.doctor?.name ?? 'Không có bác sĩ'}</p>
      </td>
      <td className="px-4 py-3">
        <TurnStatusPill status={progressStatus} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {turn.queueItem?.priorityReason && <PriorityBadge reason={turn.queueItem.priorityReason as never} size="sm" />}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        <div>{turn.queueItem?.queueType ?? 'N/A'}</div>
        <div className="text-gray-400">{turn.service?.name ?? 'Không có dịch vụ'}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onStart();
            }}
            disabled={!canStart || pendingAction}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              canStart && !pendingAction
                ? 'bg-sky-600 text-white hover:bg-sky-700'
                : 'cursor-not-allowed bg-gray-200 text-gray-400',
            )}
          >
            <PlayCircle size={13} />
            Start
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onComplete();
            }}
            disabled={!canComplete || pendingAction}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              canComplete && !pendingAction
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'cursor-not-allowed bg-gray-200 text-gray-400',
            )}
          >
            <CheckCircle2 size={13} />
            Complete
          </button>
        </div>
      </td>
    </tr>
  );
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value ?? 'N/A'}</p>
    </div>
  );
}

function TurnDetailCard({
  turn,
  onStart,
  onComplete,
  onOrderCls,
  onConclude,
  pendingAction,
}: {
  turn: TurnDetailDto;
  onStart: () => void;
  onComplete: () => void;
  onOrderCls: () => void;
  onConclude: () => void;
  pendingAction: boolean;
}) {
  const progressStatus = turn.progress?.status ?? 'PENDING';
  const canStart = !['IN_PROGRESS', 'COMPLETED', 'TIMEOUT', 'CANCELLED'].includes(progressStatus);
  const canComplete = progressStatus === 'IN_PROGRESS';
  const canOrderCls = turn.turnType === 'CLINICAL_EXAM' && turn.visit.currentState === 'IN_EXAM';
  const canConclude = turn.turnType === 'CONCLUSION' && turn.visit.currentState === 'IN_CONCLUSION';

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chi tiết turn</p>
          <h3 className="mt-1 text-base font-bold text-gray-900">{turn.visit.patient.fullName}</h3>
          <p className="mt-1 text-xs text-gray-500">
            {turn.turnId} · {turn.turnType}
          </p>
        </div>
        <TurnStatusPill status={progressStatus} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailField label="Lượt khám" value={turn.visit.queueNumber} />
        <DetailField label="Trạng thái lượt" value={turn.visit.currentState} />
        <DetailField label="Phòng" value={turn.room?.name} />
        <DetailField label="Bác sĩ" value={turn.doctor?.name} />
        <DetailField label="Dịch vụ" value={turn.service?.name} />
        <DetailField label="Hàng chờ" value={turn.queueItem?.queueType} />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tiến trình</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <DetailField label="Gọi lúc" value={turn.progress?.calledAt ? formatDateTime(turn.progress.calledAt) : 'N/A'} />
          <DetailField label="Bắt đầu" value={turn.progress?.startedAt ? formatDateTime(turn.progress.startedAt) : 'N/A'} />
          <DetailField label="Kết thúc" value={turn.progress?.endedAt ? formatDateTime(turn.progress.endedAt) : 'N/A'} />
        </div>
        {turn.progress?.note && <p className="mt-3 text-sm text-gray-600">{turn.progress.note}</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart || pendingAction}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
            canStart && !pendingAction ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-gray-300',
          )}
        >
          <PlayCircle size={16} />
          Bắt đầu
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={!canComplete || pendingAction}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
            canComplete && !pendingAction ? 'bg-emerald-600 hover:bg-emerald-700' : 'cursor-not-allowed bg-gray-300',
          )}
        >
          <CheckCircle2 size={16} />
          Hoàn tất
        </button>
        {canOrderCls ? (
          <button
            type="button"
            onClick={onOrderCls}
            disabled={pendingAction}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <FlaskConical size={16} />
            Chỉ định CLS
          </button>
        ) : null}
        {canConclude ? (
          <button
            type="button"
            onClick={onConclude}
            disabled={pendingAction}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <ClipboardCheck size={16} />
            Ghi kết luận
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DoctorTurnsPage({ pageTitle = 'Hàng đợi khám' }: { pageTitle?: string }) {
  const [items, setItems] = useState<TurnSummaryDto[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<TurnDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [clsServices, setClsServices] = useState<ServiceDto[]>([]);
  const [clsModalOpen, setClsModalOpen] = useState(false);
  const [clsServiceId, setClsServiceId] = useState('');
  const [clsPriority, setClsPriority] = useState<'ROUTINE' | 'URGENT'>('ROUTINE');
  const [clsNote, setClsNote] = useState('');
  const [conclusionModalOpen, setConclusionModalOpen] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const { user } = useAuth();

  const loadTurns = useMemo(() => async () => {
    setLoading(true);
    setError('');
    try {
      const response = await turnApi.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: status || undefined,
        orderBy: 'createdAt',
        sort: 'desc',
      });
      setItems(response.data);
      setPagination(response.pagination ?? null);
      setSelectedTurnId(prev =>
        prev && response.data.some(item => item.turnId === prev)
          ? prev
          : response.data[0]?.turnId ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách turn.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void loadTurns();
  }, [loadTurns]);

  useEffect(() => {
    let active = true;
    const loadClsServices = async () => {
      try {
        const response = await serviceApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' });
        if (!active) return;
        const services = response.data.filter(service => ['LAB', 'IMAGING', 'OTHER'].includes(service.serviceType));
        setClsServices(services);
        setClsServiceId(current => current || services[0]?.id || '');
      } catch (err) {
        console.warn('[Doctor] Unable to load CLS services', err);
      }
    };

    void loadClsServices();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTurnId) {
      setSelectedTurn(null);
      return;
    }

    let active = true;
    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        const response = await turnApi.getById(selectedTurnId);
        if (!active) {
          return;
        }
        setSelectedTurn(response.data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được chi tiết turn.');
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [selectedTurnId]);

  const handleMutation = async (turnId: string, action: 'start' | 'complete') => {
    setMutatingId(turnId);
    setError('');
    try {
      if (action === 'start') {
        await turnApi.start(turnId);
      } else {
        await turnApi.complete(turnId);
      }
      await loadTurns();
      if (selectedTurnId === turnId) {
        const refreshed = await turnApi.getById(turnId);
        setSelectedTurn(refreshed.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được turn.');
    } finally {
      setMutatingId(null);
    }
  };

  const refreshSelectedTurn = async (turnId: string) => {
    await loadTurns();
    const refreshed = await turnApi.getById(turnId);
    setSelectedTurn(refreshed.data);
  };

  const handleCreateClsOrder = async () => {
    if (!selectedTurn || !clsServiceId) {
      return;
    }

    const orderedById = user?.doctorProfileId ?? selectedTurn.doctorId ?? selectedTurn.doctor?.id ?? null;
    if (!orderedById) {
      setError('Không xác định được hồ sơ bác sĩ để chỉ định CLS.');
      return;
    }

    setMutatingId(selectedTurn.turnId);
    setError('');
    try {
      await clsApi.createOrder({
        visitId: selectedTurn.visit.visitId,
        orderedById,
        serviceId: clsServiceId,
        priority: clsPriority,
        clinicalNote: clsNote.trim() || null,
        note: clsNote.trim() || null,
        updatedById: user?.id ?? null,
      });
      setClsModalOpen(false);
      setClsNote('');
      await refreshSelectedTurn(selectedTurn.turnId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được chỉ định CLS.');
    } finally {
      setMutatingId(null);
    }
  };

  const handleConcludeVisit = async () => {
    if (!selectedTurn) {
      return;
    }

    setMutatingId(selectedTurn.turnId);
    setError('');
    try {
      await visitApi.conclude(selectedTurn.visit.visitId, {
        finalDiagnosis,
        conclusion,
        treatmentPlan: treatmentPlan.trim() || null,
        updatedById: user?.id ?? null,
      });
      setConclusionModalOpen(false);
      setFinalDiagnosis('');
      setConclusion('');
      setTreatmentPlan('');
      await refreshSelectedTurn(selectedTurn.turnId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được kết luận.');
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <Layout pageTitle={pageTitle}>
      <div className="space-y-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo mã turn, bệnh nhân, phòng..."
                className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.keys(TURN_STATUS_LABELS).map(key => (
                <option key={key} value={key}>
                  {TURN_STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={loadTurns} />
        ) : loading ? (
          <LoadingState label="Đang tải danh sách turn từ backend..." />
        ) : items.length === 0 ? (
          <EmptyState title="Chưa có turn nào" description="Bộ lọc hiện tại chưa trả về dữ liệu." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Turn</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái lượt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng / Bác sĩ</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Tiến trình</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dịch vụ</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(turn => (
                        <TurnRow
                          key={turn.turnId}
                          turn={turn}
                          selected={selectedTurnId === turn.turnId}
                          onSelect={() => setSelectedTurnId(turn.turnId)}
                          onStart={() => void handleMutation(turn.turnId, 'start')}
                          onComplete={() => void handleMutation(turn.turnId, 'complete')}
                          pendingAction={mutatingId === turn.turnId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <PaginationBar pagination={pagination} onPageChange={setPage} />
            </div>

            <div className="space-y-4">
              {detailLoading ? (
                <LoadingState label="Đang tải chi tiết turn..." />
              ) : selectedTurn ? (
                <TurnDetailCard
                  turn={selectedTurn}
                  onStart={() => void handleMutation(selectedTurn.turnId, 'start')}
                  onComplete={() => void handleMutation(selectedTurn.turnId, 'complete')}
                  onOrderCls={() => setClsModalOpen(true)}
                  onConclude={() => setConclusionModalOpen(true)}
                  pendingAction={mutatingId === selectedTurn.turnId}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
                  <Stethoscope className="mx-auto mb-3 text-sky-600" size={24} />
                  Chọn một turn để xem chi tiết.
                </div>
              )}

              {selectedTurn && (
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tóm tắt trạng thái</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Progress</p>
                      <p className="mt-1 font-semibold text-gray-800">{selectedTurn.progress?.status ?? 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Queue</p>
                      <p className="mt-1 font-semibold text-gray-800">{selectedTurn.queueItem?.status?.currentStatus ?? 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Lane</p>
                      <p className="mt-1 font-semibold text-gray-800">{selectedTurn.queueItem?.laneType ?? 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Thời lượng</p>
                      <p className="mt-1 font-semibold text-gray-800">{selectedTurn.progress?.durationMinutes ?? 0} phút</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Modal
          open={clsModalOpen}
          onClose={() => setClsModalOpen(false)}
          title="Chỉ định cận lâm sàng"
          footer={
            <>
              <button
                type="button"
                onClick={() => setClsModalOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleCreateClsOrder()}
                disabled={!clsServiceId || !selectedTurn || mutatingId === selectedTurn?.turnId}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Tạo chỉ định
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-800">{selectedTurn?.visit.patient.fullName}</p>
              <p className="mt-1 text-xs text-gray-500">{selectedTurn?.visit.queueNumber}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Dịch vụ CLS</label>
              <select
                value={clsServiceId}
                onChange={event => setClsServiceId(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-100"
              >
                {clsServices.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.serviceType}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Mức ưu tiên</label>
              <select
                value={clsPriority}
                onChange={event => setClsPriority(event.target.value as 'ROUTINE' | 'URGENT')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="ROUTINE">Thường</option>
                <option value="URGENT">Khẩn</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú lâm sàng</label>
              <textarea
                value={clsNote}
                onChange={event => setClsNote(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="Lý do chỉ định, triệu chứng liên quan..."
              />
            </div>
          </div>
        </Modal>

        <Modal
          open={conclusionModalOpen}
          onClose={() => setConclusionModalOpen(false)}
          title="Ghi kết luận cuối"
          footer={
            <>
              <button
                type="button"
                onClick={() => setConclusionModalOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConcludeVisit()}
                disabled={!finalDiagnosis.trim() || !conclusion.trim() || !selectedTurn || mutatingId === selectedTurn?.turnId}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Chuyển chờ thanh toán
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Chẩn đoán cuối *</label>
              <input
                value={finalDiagnosis}
                onChange={event => setFinalDiagnosis(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Kết luận *</label>
              <textarea
                value={conclusion}
                onChange={event => setConclusion(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Hướng điều trị</label>
              <textarea
                value={treatmentPlan}
                onChange={event => setTreatmentPlan(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}

type DoctorView = 'overview' | 'queue' | 'patients' | 'results' | 'schedule' | 'reports' | 'account';
type IconComponent = typeof Stethoscope;

function StatTile({ label, value, sub, tone = 'text-sky-600' }: { label: string; value: string | number; sub: string; tone?: string }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={clsx('mt-2 text-3xl font-black', tone)}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function DoctorViewShell({
  pageTitle,
  title,
  description,
  icon: Icon,
  children,
}: {
  pageTitle: string;
  title: string;
  description: string;
  icon: IconComponent;
  children: ReactNode;
}) {
  return (
    <Layout pageTitle={pageTitle}>
      <div className="space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <Icon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </Layout>
  );
}

function DoctorOverviewView() {
  const [overview, setOverview] = useState<DashboardOverviewDto | null>(null);
  const [turns, setTurns] = useState<TurnSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [overviewRes, turnRes] = await Promise.all([
          dashboardApi.getOverview(),
          turnApi.list({ page: 1, limit: 5, sort: 'desc' }),
        ]);

        if (!active) return;
        setOverview(overviewRes.data);
        setTurns(turnRes.data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được tổng quan bác sĩ.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <Layout pageTitle="Tổng quan bác sĩ">
        <LoadingState label="Đang tải tổng quan bác sĩ..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="Tổng quan bác sĩ">
        <ErrorState message={error} onRetry={() => setReloadKey(value => value + 1)} />
      </Layout>
    );
  }

  return (
    <DoctorViewShell
      pageTitle="Tổng quan bác sĩ"
      title="Tổng quan bác sĩ"
      description="Tóm tắt nhanh lượt khám, hàng đợi và trạng thái vận hành."
      icon={Stethoscope}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Tổng lượt khám" value={overview?.totalVisits ?? 0} sub="Từ dashboard backend" />
        <StatTile label="Đang chờ" value={overview?.waitingPatients ?? 0} sub="Bệnh nhân chưa hoàn tất" tone="text-amber-600" />
        <StatTile label="Hàng đợi hoạt động" value={overview?.activeQueues ?? 0} sub="Queue item đang mở" tone="text-indigo-600" />
        <StatTile label="Đã hoàn tất" value={overview?.completedVisits ?? 0} sub="Lượt khám hoàn tất" tone="text-emerald-600" />
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-800">Turn gần đây</p>
          <p className="mt-1 text-xs text-gray-500">Dữ liệu lấy từ /turns</p>
        </div>
        {turns.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Chưa có turn gần đây" description="Backend chưa trả về turn nào." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Turn</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {turns.map(turn => (
                <tr key={turn.turnId} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{turn.turnId}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{turn.visit.patient.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{turn.room?.name ?? 'Chưa có'}</td>
                  <td className="px-4 py-3">
                    <TurnStatusPill status={turn.progress?.status ?? 'PENDING'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DoctorViewShell>
  );
}

function DoctorPatientsView() {
  const [visits, setVisits] = useState<VisitListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await visitApi.list({ page: 1, limit: 100, sort: 'desc' });
        if (active) setVisits(response.data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được danh sách bệnh nhân.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) return <Layout pageTitle="Danh sách bệnh nhân"><LoadingState label="Đang tải danh sách bệnh nhân..." /></Layout>;
  if (error) return <Layout pageTitle="Danh sách bệnh nhân"><ErrorState message={error} onRetry={() => setReloadKey(value => value + 1)} /></Layout>;

  return (
    <DoctorViewShell pageTitle="Danh sách bệnh nhân" title="Danh sách bệnh nhân" description="Các lượt khám gần đây kèm thông tin bệnh nhân." icon={UserRound}>
      {visits.length === 0 ? (
        <EmptyState title="Chưa có bệnh nhân" description="Backend chưa trả về lượt khám nào." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Lượt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng / Bác sĩ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => (
                <tr key={visit.visitId} className="border-t border-gray-50 hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{visit.patient.fullName}</div>
                    <div className="text-xs text-gray-400">{visit.patient.patientCode} · {visit.patient.phone}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{visit.queueNumber}</td>
                  <td className="px-4 py-3"><StatusBadge status={visit.currentState as PatientStatus} size="sm" /></td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{visit.room?.name ?? 'Chưa có'}</div>
                    <div className="text-xs text-gray-400">{visit.doctor?.name ?? 'Chưa có'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(visit.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DoctorViewShell>
  );
}

function DoctorResultsView() {
  const [results, setResults] = useState<CLSResultSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await clsApi.listResults({ page: 1, limit: 100, sort: 'desc' });
        if (active) setResults(response.data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được kết quả cận lâm sàng.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) return <Layout pageTitle="Kết quả cận lâm sàng"><LoadingState label="Đang tải kết quả CLS..." /></Layout>;
  if (error) return <Layout pageTitle="Kết quả cận lâm sàng"><ErrorState message={error} onRetry={() => setReloadKey(value => value + 1)} /></Layout>;

  return (
    <DoctorViewShell pageTitle="Kết quả cận lâm sàng" title="Kết quả cận lâm sàng" description="Danh sách kết quả CLS từ backend." icon={FileSearch}>
      {results.length === 0 ? (
        <EmptyState title="Chưa có kết quả CLS" description="Backend chưa trả về kết quả nào." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Kết quả</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dịch vụ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Đánh dấu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {results.map(result => (
                <tr key={result.clsResultId} className="border-t border-gray-50 hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{result.clsResultId}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{result.clsOrder.visit.patient.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{result.clsOrder.service?.name ?? 'Chưa có'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', result.isAbnormal ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
                      {result.isAbnormal ? 'Bất thường' : 'Bình thường'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(result.resultAt ?? result.resultDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DoctorViewShell>
  );
}

function DoctorScheduleView() {
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await doctorApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' });
        if (active) setDoctors(response.data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được lịch làm việc.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) return <Layout pageTitle="Lịch làm việc"><LoadingState label="Đang tải lịch làm việc..." /></Layout>;
  if (error) return <Layout pageTitle="Lịch làm việc"><ErrorState message={error} onRetry={() => setReloadKey(value => value + 1)} /></Layout>;

  return (
    <DoctorViewShell pageTitle="Lịch làm việc" title="Lịch làm việc" description="Tổng hợp bác sĩ, khoa và phòng mặc định từ backend." icon={CalendarDays}>
      {doctors.length === 0 ? (
        <EmptyState title="Chưa có lịch/bác sĩ" description="Backend chưa trả về danh sách bác sĩ." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map(doctor => (
            <div key={doctor.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="font-bold text-gray-900">{doctor.name}</p>
              <p className="mt-1 text-sm text-gray-500">{doctor.specialty ?? 'Chưa có chuyên khoa'}</p>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p>Khoa: {doctor.department?.name ?? 'Chưa có'}</p>
                <p>Phòng mặc định: {doctor.defaultRoom?.name ?? 'Chưa phân phòng'}</p>
                <p>Chứng chỉ: {doctor.licenseNumber ?? 'Chưa có'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DoctorViewShell>
  );
}

function DoctorReportsView() {
  const [overview, setOverview] = useState<DashboardOverviewDto | null>(null);
  const [visits, setVisits] = useState<VisitListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [overviewRes, visitRes] = await Promise.all([
          dashboardApi.getOverview(),
          visitApi.list({ page: 1, limit: 100, sort: 'desc' }),
        ]);
        if (!active) return;
        setOverview(overviewRes.data);
        setVisits(visitRes.data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được báo cáo cá nhân.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const completed = visits.filter(visit => visit.currentState === 'COMPLETED').length;
  const active = visits.filter(visit => !['COMPLETED', 'CANCELLED'].includes(visit.currentState)).length;

  if (loading) return <Layout pageTitle="Báo cáo cá nhân"><LoadingState label="Đang tải báo cáo cá nhân..." /></Layout>;
  if (error) return <Layout pageTitle="Báo cáo cá nhân"><ErrorState message={error} onRetry={() => setReloadKey(value => value + 1)} /></Layout>;

  return (
    <DoctorViewShell pageTitle="Báo cáo cá nhân" title="Báo cáo cá nhân" description="Các chỉ số khám bệnh chính trong dữ liệu hiện có." icon={BarChart3}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Tổng lượt" value={overview?.totalVisits ?? visits.length} sub="Từ dashboard/visits" />
        <StatTile label="Đang xử lý" value={active} sub="Chưa hoàn tất" tone="text-amber-600" />
        <StatTile label="Hoàn tất" value={completed} sub="COMPLETED" tone="text-emerald-600" />
        <StatTile label="Bệnh nhân" value={overview?.totalPatients ?? 0} sub="Tổng hồ sơ" tone="text-indigo-600" />
      </div>
    </DoctorViewShell>
  );
}

function DoctorAccountView() {
  const { user } = useAuth();

  return (
    <DoctorViewShell pageTitle="Tài khoản" title="Tài khoản" description="Thông tin đăng nhập hiện tại." icon={ShieldCheck}>
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-lg font-black text-white">
            {user?.name.split(' ').pop()?.charAt(0) ?? 'U'}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user?.name ?? 'Chưa đăng nhập'}</p>
            <p className="mt-1 text-sm text-gray-500">{user?.username ?? 'N/A'} · {user?.role ?? 'N/A'}</p>
          </div>
        </div>
      </div>
    </DoctorViewShell>
  );
}

export default function DoctorPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const fallbackView: DoctorView = user?.role === 'DOCTOR' ? 'overview' : 'queue';
  const view = (searchParams.get('view') ?? fallbackView) as DoctorView;

  if (view === 'queue') return <DoctorTurnsPage pageTitle="Hàng đợi khám" />;
  if (view === 'patients') return <DoctorPatientsView />;
  if (view === 'results') return <DoctorResultsView />;
  if (view === 'schedule') return <DoctorScheduleView />;
  if (view === 'reports') return <DoctorReportsView />;
  if (view === 'account') return <DoctorAccountView />;

  return <DoctorOverviewView />;
}
