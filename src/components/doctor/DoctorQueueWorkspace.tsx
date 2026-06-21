import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSearch,
  FlaskConical,
  History,
  PlayCircle,
  Search,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { clsx } from 'clsx';
import Layout from '../layout/Layout';
import { EmptyState, ErrorState, LoadingState } from '../common/PageState';
import StatusBadge from '../ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { clsApi } from '../../services/clsApi';
import { serviceApi } from '../../services/serviceApi';
import { turnApi } from '../../services/turnApi';
import { visitApi } from '../../services/visitApi';
import type {
  ServiceDto,
  TurnDetailDto,
  TurnSummaryDto,
  VisitDetailForActionDto,
} from '../../services/backend-types';
import { formatDateTime } from '../../lib/format';
import { ApiError } from '../../services/http';

type WorkTab = 'WAITING_EXAM' | 'IN_EXAM' | 'WAITING_CONCLUSION' | 'IN_CONCLUSION' | 'FOLLOW_UP';

const TAB_CONFIG: Array<{ id: WorkTab; label: string; states: string[] }> = [
  { id: 'WAITING_EXAM', label: 'Chờ khám', states: ['WAITING_EXAM'] },
  { id: 'IN_EXAM', label: 'Đang khám', states: ['IN_EXAM'] },
  { id: 'WAITING_CONCLUSION', label: 'Chờ kết luận', states: ['WAITING_CONCLUSION'] },
  { id: 'IN_CONCLUSION', label: 'Đang kết luận', states: ['IN_CONCLUSION'] },
  {
    id: 'FOLLOW_UP',
    label: 'Theo dõi',
    states: ['WAITING_CLS', 'IN_CLS', 'WAITING_RESULT', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED'],
  },
];

const actionTurnType: Record<string, string> = {
  WAITING_EXAM: 'CLINICAL_EXAM',
  IN_EXAM: 'CLINICAL_EXAM',
  WAITING_CONCLUSION: 'CONCLUSION',
  IN_CONCLUSION: 'CONCLUSION',
};

const genderLabel: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

function tabForState(state: string): WorkTab {
  return TAB_CONFIG.find(tab => tab.states.includes(state))?.id ?? 'FOLLOW_UP';
}

function getTurnType(turn: TurnSummaryDto | Record<string, unknown>) {
  return String((turn as any).turnType ?? (turn as any).type ?? (turn as any).turn_type ?? '');
}

function getTurnVisitId(turn: TurnSummaryDto | Record<string, unknown>) {
  return String((turn as any).visitId ?? (turn as any).visit?.visitId ?? (turn as any).visit?.id ?? '');
}

function mergeTurns(...groups: Array<TurnSummaryDto[] | undefined | null>) {
  const byId = new Map<string, TurnSummaryDto>();
  groups.flatMap(group => group ?? []).forEach(turn => {
    byId.set(turn.turnId, turn);
  });
  return [...byId.values()];
}

function pickCurrentTurn(turns: TurnSummaryDto[]) {
  const score = (turn: TurnSummaryDto) => {
    const expectedType = actionTurnType[turn.visit.currentState];
    let value = getTurnType(turn) === expectedType ? 100 : 0;
    if (turn.progress?.status === 'IN_PROGRESS') value += 20;
    if (['PENDING', 'CALLED'].includes(turn.progress?.status ?? 'PENDING')) value += 10;
    return value;
  };

  return [...turns].sort((left, right) => {
    const scoreDiff = score(right) - score(left);
    if (scoreDiff) return scoreDiff;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  })[0];
}

function pickActionTurnForState(turns: TurnSummaryDto[], state?: string | null) {
  if (!state) return null;
  const expectedType = actionTurnType[state];
  if (!expectedType) return null;

  const statusScore = (status?: string | null) => {
    if (['IN_EXAM', 'IN_CONCLUSION'].includes(state) && status === 'IN_PROGRESS') return 30;
    if (['WAITING_EXAM', 'WAITING_CONCLUSION'].includes(state) && ['PENDING', 'CALLED'].includes(status ?? 'PENDING')) return 30;
    if (status === 'IN_PROGRESS') return 20;
    if (['PENDING', 'CALLED'].includes(status ?? 'PENDING')) return 10;
    return 0;
  };

  return turns
    .filter(turn => getTurnType(turn) === expectedType)
    .sort((left, right) => {
      const scoreDiff = statusScore(right.progress?.status) - statusScore(left.progress?.status);
      if (scoreDiff) return scoreDiff;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })[0] ?? null;
}

function waitLabel(turn: TurnSummaryDto) {
  const startedAt = turn.queueItem?.enqueuedAt ?? turn.createdAt;
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value || 'Chưa cập nhật'}</p>
    </div>
  );
}

function VisitListItem({
  turn,
  selected,
  onSelect,
}: {
  turn: TurnSummaryDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-2xl border p-4 text-left transition',
        selected
          ? 'border-sky-400 bg-sky-50 shadow-sm ring-2 ring-sky-100'
          : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-gray-900">{turn.visit.patient.fullName}</p>
          <p className="mt-1 text-xs text-gray-500">
            Số {turn.visit.queueNumber} · {turn.visit.patient.patientCode}
          </p>
        </div>
        <StatusBadge status={turn.visit.currentState} size="sm" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <span>{turn.room?.department?.name ?? turn.room?.name ?? 'Chưa phân khoa'}</span>
        <span className="text-right">Chờ {waitLabel(turn)}</span>
        <span className="truncate">{turn.room?.name ?? 'Chưa phân phòng'}</span>
        <span className="truncate text-right">{turn.doctor?.name ?? 'Chưa phân bác sĩ'}</span>
      </div>
    </button>
  );
}

function ClsResults({ visit }: { visit: VisitDetailForActionDto }) {
  const ordersWithResults = visit.clsOrders.filter(order => order.result);

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2">
        <FlaskConical size={16} className="text-purple-600" />
        <h4 className="text-sm font-bold text-gray-800">Kết quả cận lâm sàng</h4>
        <span className="ml-auto text-xs text-gray-400">{ordersWithResults.length}/{visit.clsOrders.length} có kết quả</span>
      </div>
      {visit.clsOrders.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Chưa có chỉ định CLS.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {visit.clsOrders.map(order => (
            <div key={order.clsOrderId} className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-gray-800">{order.service?.name ?? 'Dịch vụ CLS'}</p>
                <span className="text-xs font-semibold text-gray-500">{order.status}</span>
              </div>
              {order.result ? (
                <div className={clsx('mt-2 rounded-lg p-3', order.result.isAbnormal ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-gray-700')}>
                  {order.result.isAbnormal && <p className="mb-1 font-semibold">Kết quả bất thường</p>}
                  <p className="whitespace-pre-wrap">{order.result.resultText || 'Đã có kết quả đính kèm.'}</p>
                  {order.result.note && <p className="mt-1 text-xs italic">{order.result.note}</p>}
                  {order.result.resultFileUrl && (
                    <a className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:underline" href={order.result.resultFileUrl} target="_blank" rel="noreferrer">
                      Mở tệp kết quả
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">Chưa có kết quả.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DoctorQueueWorkspace({ pageTitle = 'Hàng đợi khám' }: { pageTitle?: string }) {
  const { user } = useAuth();
  const [turns, setTurns] = useState<TurnSummaryDto[]>([]);
  const [activeTab, setActiveTab] = useState<WorkTab>('WAITING_EXAM');
  const [search, setSearch] = useState('');
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<TurnDetailDto | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitDetailForActionDto | null>(null);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT'>('ROUTINE');
  const [clinicalNote, setClinicalNote] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const mutationInFlight = useRef(false);

  const loadTurns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await turnApi.list({ page: 1, limit: 100, orderBy: 'createdAt', sort: 'desc' });
      setTurns(response.data);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách lượt khám.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTurns();
    void serviceApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' })
      .then(response => {
        const clsServices = response.data.filter(service => ['LAB', 'IMAGING', 'OTHER'].includes(service.serviceType));
        setServices(clsServices);
        setServiceId(current => current || clsServices[0]?.id || '');
      })
      .catch(() => setError('Không tải được danh mục dịch vụ CLS.'));
  }, [loadTurns]);

  const visitTurns = useMemo(() => {
    const scopedTurns = user?.doctorProfileId
      ? turns.filter(turn => turn.doctorId === user.doctorProfileId || turn.doctor?.id === user.doctorProfileId)
      : turns;
    const grouped = new Map<string, TurnSummaryDto[]>();
    scopedTurns.forEach(turn => {
      const visitId = getTurnVisitId(turn);
      grouped.set(visitId, [...(grouped.get(visitId) ?? []), turn]);
    });
    return [...grouped.values()].map(pickCurrentTurn).filter(Boolean);
  }, [turns, user?.doctorProfileId]);

  const filteredTurns = useMemo(() => {
    const states = TAB_CONFIG.find(tab => tab.id === activeTab)?.states ?? [];
    const query = search.trim().toLocaleLowerCase('vi');
    return visitTurns.filter(turn => {
      if (!states.includes(turn.visit.currentState)) return false;
      if (!query) return true;
      return [turn.visit.patient.fullName, turn.visit.patient.patientCode, turn.visit.queueNumber, turn.room?.name]
        .some(value => value?.toLocaleLowerCase('vi').includes(query));
    });
  }, [activeTab, search, visitTurns]);

  const activeOtherVisit = useMemo(
    () => visitTurns.find(turn =>
      getTurnVisitId(turn) !== selectedTurn?.visit.visitId
      && ['IN_EXAM', 'IN_CONCLUSION'].includes(turn.visit.currentState)
      && turn.progress?.status === 'IN_PROGRESS',
    ),
    [selectedTurn?.visit.visitId, visitTurns],
  );

  useEffect(() => {
    if (!selectedTurnId) {
      setSelectedTurn(null);
      setSelectedVisit(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    turnApi.getById(selectedTurnId)
      .then(async turnResponse => {
        const [visitResponse, visitTurnsResponse] = await Promise.all([
          visitApi.getById(turnResponse.data.visit.visitId),
          turnApi.getByVisitId(turnResponse.data.visit.visitId),
        ]);
        const mergedTurns = mergeTurns(visitResponse.data.turns, visitTurnsResponse.data);
        const enrichedVisit = { ...visitResponse.data, turns: mergedTurns };
        const actionTurn = pickActionTurnForState(mergedTurns, enrichedVisit.currentState);
        const effectiveTurnResponse = actionTurn && actionTurn.turnId !== turnResponse.data.turnId
          ? await turnApi.getById(actionTurn.turnId)
          : turnResponse;
        if (!active) return;
        if (effectiveTurnResponse.data.turnId !== selectedTurnId) {
          setSelectedTurnId(effectiveTurnResponse.data.turnId);
        }
        setSelectedTurn(effectiveTurnResponse.data);
        setSelectedVisit(enrichedVisit);
        setFinalDiagnosis(enrichedVisit.clinical?.finalDiagnosis ?? '');
        setConclusion(enrichedVisit.clinical?.conclusion ?? '');
        setTreatmentPlan(enrichedVisit.clinical?.treatmentPlan ?? '');
      })
      .catch(err => active && setError(err instanceof Error ? err.message : 'Không tải được chi tiết lượt khám.'))
      .finally(() => active && setDetailLoading(false));
    return () => { active = false; };
  }, [selectedTurnId]);

  const refreshSelected = async (turnId: string) => {
    const [turnResponse, nextTurns] = await Promise.all([turnApi.getById(turnId), loadTurns()]);
    const [visitResponse, visitTurnsResponse] = await Promise.all([
      visitApi.getById(turnResponse.data.visit.visitId),
      turnApi.getByVisitId(turnResponse.data.visit.visitId),
    ]);
    const mergedTurns = mergeTurns(visitResponse.data.turns, visitTurnsResponse.data);
    const enrichedVisit = { ...visitResponse.data, turns: mergedTurns };
    setSelectedTurn(turnResponse.data);
    setSelectedVisit(enrichedVisit);
    setActiveTab(tabForState(enrichedVisit.currentState));
    const currentTurn =
      pickActionTurnForState(mergedTurns, enrichedVisit.currentState)
      ?? pickCurrentTurn(nextTurns.filter(turn => getTurnVisitId(turn) === enrichedVisit.visitId));
    if (currentTurn && currentTurn.turnId !== turnId) setSelectedTurnId(currentTurn.turnId);
  };

  const perform = async (action: () => Promise<unknown>, refreshTurnId = selectedTurn?.turnId) => {
    if (!selectedTurn || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setMutating(true);
    setError('');
    try {
      await action();
      if (refreshTurnId) await refreshSelected(refreshTurnId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thực hiện được thao tác.';
      if (err instanceof ApiError && err.status === 409) {
        await refreshSelected(refreshTurnId ?? selectedTurn.turnId).catch(() => undefined);
      }
      setError(message);
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
    }
  };

  const startSelectedTurn = () => {
    if (!selectedTurn || activeOtherVisit) return;
    const state = selectedVisit?.currentState ?? selectedTurn.visit.currentState;
    const expectedType = actionTurnType[state];
    if (!['WAITING_EXAM', 'WAITING_CONCLUSION'].includes(state)) return;

    const actionTurn = selectedVisit
      ? pickActionTurnForState(selectedVisit.turns, state)
      : getTurnType(selectedTurn) === expectedType
        ? selectedTurn
        : null;

    if (!actionTurn) {
      setError(state === 'WAITING_CONCLUSION'
        ? 'Không tìm thấy lượt kết luận cho bệnh nhân này.'
        : 'Không tìm thấy lượt khám cho bệnh nhân này.');
      return;
    }

    if (!['PENDING', 'CALLED'].includes(actionTurn.progress?.status ?? 'PENDING')) return;
    void perform(() => turnApi.start(actionTurn.turnId, { updatedById: user?.id ?? null }), actionTurn.turnId);
  };

  const orderCls = () => {
    if (!selectedTurn || !serviceId || selectedTurn.visit.currentState !== 'IN_EXAM') return;
    const orderedById = user?.doctorProfileId ?? selectedTurn.doctorId ?? selectedTurn.doctor?.id;
    if (!orderedById) {
      setError('Không xác định được hồ sơ bác sĩ để chỉ định CLS.');
      return;
    }
    void perform(async () => {
      await clsApi.createOrder({
        visitId: selectedTurn.visit.visitId,
        orderedById,
        serviceId,
        priority,
        clinicalNote: clinicalNote.trim() || null,
        note: clinicalNote.trim() || null,
        updatedById: user?.id ?? null,
      });
      setClinicalNote('');
    });
  };

  const completeConclusion = () => {
    if (!selectedVisit || !finalDiagnosis.trim() || !conclusion.trim()) return;
    void perform(() => visitApi.conclude(selectedVisit.visitId, {
      finalDiagnosis: finalDiagnosis.trim(),
      conclusion: conclusion.trim(),
      treatmentPlan: treatmentPlan.trim() || null,
      updatedById: user?.id ?? null,
    }));
  };

  const state = selectedVisit?.currentState ?? selectedTurn?.visit.currentState;
  const selectedActionTurn = selectedVisit ? pickActionTurnForState(selectedVisit.turns, state) : null;
  const hasExpectedActionTurn = selectedActionTurn || !state || !actionTurnType[state];
  const startBlocked = Boolean(activeOtherVisit);
  const selectedTurnStartable = ['PENDING', 'CALLED'].includes(selectedActionTurn?.progress?.status ?? selectedTurn?.progress?.status ?? 'PENDING');

  return (
    <Layout pageTitle={pageTitle}>
      <div className="space-y-4">
        {error && <ErrorState message={error} onRetry={loadTurns} />}

        <div className="grid min-h-[680px] gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Tìm bệnh nhân, mã, số thứ tự..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {TAB_CONFIG.map(tab => {
                const count = visitTurns.filter(turn => tab.states.includes(turn.visit.currentState)).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition',
                      activeTab === tab.id ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="mt-4 max-h-[570px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <LoadingState label="Đang tải lượt khám..." />
              ) : filteredTurns.length === 0 ? (
                <EmptyState title="Không có lượt khám" description="Chưa có bệnh nhân trong nhóm trạng thái này." />
              ) : filteredTurns.map(turn => (
                <VisitListItem
                  key={turn.turnId}
                  turn={turn}
                  selected={selectedTurnId === turn.turnId}
                  onSelect={() => setSelectedTurnId(turn.turnId)}
                />
              ))}
            </div>
          </aside>

          <main className="min-w-0">
            {detailLoading ? (
              <LoadingState label="Đang tải hồ sơ lượt khám..." />
            ) : !selectedTurn || !selectedVisit ? (
              <div className="flex min-h-[680px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <UserRound size={34} className="text-sky-500" />
                <h3 className="mt-3 font-bold text-gray-800">Chọn một bệnh nhân để bắt đầu</h3>
                <p className="mt-1 max-w-md text-sm text-gray-500">Mọi thao tác khám, chỉ định CLS và kết luận chỉ xuất hiện trong hồ sơ đang được chọn.</p>
              </div>
            ) : (
              <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Hồ sơ lượt khám</p>
                    <h2 className="mt-1 text-xl font-black text-gray-900">{selectedVisit.patient.fullName}</h2>
                    <p className="mt-1 text-sm text-gray-500">Số {selectedVisit.queueNumber} · {selectedVisit.patient.patientCode}</p>
                  </div>
                  <StatusBadge status={selectedVisit.currentState} />
                </header>

                <section className="grid gap-4 rounded-2xl border border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailField label="Tuổi / ngày sinh" value={selectedVisit.patient.dateOfBirth ? `${selectedVisit.patient.age} tuổi · ${new Intl.DateTimeFormat('vi-VN').format(new Date(selectedVisit.patient.dateOfBirth))}` : `${selectedVisit.patient.age} tuổi`} />
                  <DetailField label="Giới tính" value={genderLabel[selectedVisit.patient.gender]} />
                  <DetailField label="Số điện thoại" value={selectedVisit.patient.phone} />
                  <DetailField label="BHYT" value={selectedVisit.patient.insuranceNumber} />
                  <DetailField label="Lý do khám" value={selectedVisit.chiefComplaint} />
                  <DetailField label="Khoa" value={selectedVisit.department?.name ?? selectedTurn.room?.department?.name} />
                  <DetailField label="Phòng" value={selectedVisit.room?.name ?? selectedTurn.room?.name} />
                  <DetailField label="Bác sĩ" value={selectedVisit.doctor?.name ?? selectedTurn.doctor?.name} />
                </section>

                {selectedVisit.clinical?.provisionalDiagnosis && (
                  <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Chẩn đoán sơ bộ</p>
                    <p className="mt-1 text-sm font-medium text-indigo-950">{selectedVisit.clinical.provisionalDiagnosis}</p>
                  </section>
                )}

                <ClsResults visit={selectedVisit} />

                {state === 'WAITING_EXAM' && (
                  <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <h4 className="flex items-center gap-2 font-bold text-sky-900"><Stethoscope size={18} />Sẵn sàng khám</h4>
                    {startBlocked && (
                      <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertCircle size={17} className="mt-0.5 shrink-0" />
                        Bạn đang có một bệnh nhân đang khám. Hãy hoàn tất hoặc chuyển trạng thái trước khi gọi bệnh nhân tiếp theo.
                      </p>
                    )}
                    {!selectedTurnStartable && (
                      <p className="mt-3 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                        <AlertCircle size={17} className="mt-0.5 shrink-0" />
                        Turn khám này đã kết thúc hoặc không còn hợp lệ để bắt đầu. Vui lòng làm mới dữ liệu hàng đợi.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={startSelectedTurn}
                      disabled={mutating || startBlocked || !selectedTurnStartable || getTurnType(selectedActionTurn ?? {}) !== 'CLINICAL_EXAM'}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <PlayCircle size={17} />Bắt đầu khám
                    </button>
                  </section>
                )}

                {state === 'IN_EXAM' && (
                  <>
                    <section className="rounded-2xl border border-purple-200 p-4">
                      <h4 className="flex items-center gap-2 font-bold text-gray-900"><FlaskConical size={18} className="text-purple-600" />Chỉ định cận lâm sàng</h4>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">Dịch vụ CLS *</label>
                          <select value={serviceId} onChange={event => setServiceId(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100">
                            {services.map(service => <option key={service.id} value={service.id}>{service.name} · {service.serviceType}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">Mức ưu tiên</label>
                          <select value={priority} onChange={event => setPriority(event.target.value as 'ROUTINE' | 'URGENT')} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100">
                            <option value="ROUTINE">Thường</option>
                            <option value="URGENT">Khẩn</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú lâm sàng</label>
                          <textarea value={clinicalNote} onChange={event => setClinicalNote(event.target.value)} rows={3} placeholder="Lý do chỉ định, triệu chứng liên quan..." className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                        </div>
                      </div>
                      <button type="button" onClick={orderCls} disabled={mutating || !serviceId} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                        <FlaskConical size={17} />Chỉ định CLS
                      </button>
                    </section>

                    <section className="rounded-2xl border border-emerald-200 p-4">
                      <h4 className="flex items-center gap-2 font-bold text-gray-900"><ClipboardCheck size={18} className="text-emerald-600" />Kết luận không cần CLS</h4>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">Chẩn đoán cuối *</label>
                          <input value={finalDiagnosis} onChange={event => setFinalDiagnosis(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">Hướng xử lý / điều trị</label>
                          <textarea value={treatmentPlan} onChange={event => setTreatmentPlan(event.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú / kết luận *</label>
                          <textarea value={conclusion} onChange={event => setConclusion(event.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100" />
                        </div>
                      </div>
                      <button type="button" onClick={completeConclusion} disabled={mutating || !finalDiagnosis.trim() || !conclusion.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                        <CheckCircle2 size={17} />Hoàn tất khám
                      </button>
                    </section>
                  </>
                )}

                {state === 'WAITING_CONCLUSION' && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="font-bold text-amber-900">Bệnh nhân đã sẵn sàng kết luận</h4>
                    {startBlocked && <p className="mt-2 text-sm text-amber-800">Hãy hoàn tất lượt đang xử lý trước khi bắt đầu kết luận cho bệnh nhân này.</p>}
                    {!hasExpectedActionTurn && <p className="mt-2 text-sm text-rose-700">Không tìm thấy lượt kết luận cho bệnh nhân này.</p>}
                    {hasExpectedActionTurn && !selectedTurnStartable && <p className="mt-2 text-sm text-rose-700">Turn kết luận không còn ở trạng thái có thể bắt đầu.</p>}
                    <button type="button" onClick={startSelectedTurn} disabled={mutating || startBlocked || !selectedTurnStartable || getTurnType(selectedActionTurn ?? {}) !== 'CONCLUSION'} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                      <FileSearch size={17} />Bắt đầu kết luận
                    </button>
                  </section>
                )}

                {state === 'IN_CONCLUSION' && (
                  <section className="rounded-2xl border border-emerald-200 p-4">
                    <h4 className="flex items-center gap-2 font-bold text-gray-900"><FileSearch size={18} className="text-emerald-600" />Kết luận khám</h4>
                    <div className="mt-4 space-y-3">
                      <div><label className="mb-1 block text-xs font-semibold text-gray-500">Chẩn đoán cuối *</label><input value={finalDiagnosis} onChange={event => setFinalDiagnosis(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100" /></div>
                      <div><label className="mb-1 block text-xs font-semibold text-gray-500">Kết luận *</label><textarea value={conclusion} onChange={event => setConclusion(event.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100" /></div>
                      <div><label className="mb-1 block text-xs font-semibold text-gray-500">Hướng xử lý / điều trị</label><textarea value={treatmentPlan} onChange={event => setTreatmentPlan(event.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100" /></div>
                    </div>
                    <button type="button" onClick={completeConclusion} disabled={mutating || !finalDiagnosis.trim() || !conclusion.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                      <CheckCircle2 size={17} />Hoàn tất kết luận
                    </button>
                  </section>
                )}

                {['WAITING_CLS', 'IN_CLS', 'WAITING_RESULT'].includes(state ?? '') && (
                  <section className="flex gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-purple-900">
                    <Clock3 size={20} className="shrink-0" />
                    <p className="text-sm font-medium">Bệnh nhân đang chờ/thực hiện cận lâm sàng. Bác sĩ chỉ có thể theo dõi trạng thái và kết quả tại đây.</p>
                  </section>
                )}

                {['WAITING_PAYMENT', 'COMPLETED', 'CANCELLED'].includes(state ?? '') && (
                  <section className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-700">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                    <p className="text-sm font-medium">Lượt khám ở trạng thái chỉ đọc. Không còn thao tác khám hoặc kết luận.</p>
                  </section>
                )}

                {selectedVisit.stateHistories.length > 0 && (
                  <section className="rounded-2xl border border-gray-200 p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800"><History size={16} className="text-gray-500" />Lịch sử trạng thái gần nhất</h4>
                    <div className="mt-3 space-y-2">
                      {selectedVisit.stateHistories.slice(0, 5).map(history => (
                        <div key={history.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                          <span className="font-semibold text-gray-700">{history.fromState ?? 'Khởi tạo'} → {history.toState}</span>
                          <span className="text-gray-400">{formatDateTime(history.transitionedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
