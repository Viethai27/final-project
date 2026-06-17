import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Filter, Search, Sparkles, ArrowRightLeft } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { ErrorState, EmptyState, LoadingState, PaginationBar } from '../components/common/PageState';
import { dispatchApi } from '../services/dispatchApi';
import type {
  ApiPagination,
  DispatchDecisionCreateInput,
  DispatchSuggestionCandidateDto,
  DispatchSuggestionDto,
} from '../services/backend-types';
import { formatDateTime } from '../lib/format';
import { clsx } from 'clsx';

const ACTIVE_STATES = [
  'WAITING_EXAM',
  'IN_EXAM',
  'WAITING_CLS',
  'IN_CLS',
  'WAITING_RESULT',
  'WAITING_CONCLUSION',
  'IN_CONCLUSION',
  'WAITING_PAYMENT',
] as const;

type SuggestionState = (typeof ACTIVE_STATES)[number] | 'ALL';

const STATE_LABELS: Record<SuggestionState, string> = {
  ALL: 'Tất cả',
  WAITING_EXAM: 'Chờ khám',
  IN_EXAM: 'Đang khám',
  WAITING_CLS: 'Chờ CLS',
  IN_CLS: 'Đang CLS',
  WAITING_RESULT: 'Chờ kết quả',
  WAITING_CONCLUSION: 'Chờ kết luận',
  IN_CONCLUSION: 'Đang kết luận',
  WAITING_PAYMENT: 'Chờ thanh toán',
};

const ALERT_CLASS: Record<DispatchSuggestionCandidateDto['alertLevel'], string> = {
  NORMAL: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  OVERLOAD: 'border-red-200 bg-red-50 text-red-700',
};

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: DispatchSuggestionCandidateDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-2xl border p-4 text-left transition',
        selected ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              #{candidate.rank}
            </span>
            {candidate.wasSelected && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Gợi ý chính
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-800">
            {candidate.room?.name ?? 'Chưa có phòng'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {candidate.doctor?.name ?? 'Chưa có bác sĩ'} · {candidate.service?.name ?? 'Chưa có dịch vụ'}
          </p>
          <p className="mt-2 text-xs text-gray-500">{candidate.reason}</p>
        </div>
        <ChevronRight size={16} className="mt-1 shrink-0 text-gray-400" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
        <div>
          <p className="uppercase tracking-wide text-gray-400">Điểm</p>
          <p className="mt-1 font-semibold text-gray-800">{candidate.resourceScore.toFixed(2)}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-gray-400">Hàng chờ</p>
          <p className="mt-1 font-semibold text-gray-800">{candidate.queueLength}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-gray-400">Util</p>
          <p className="mt-1 font-semibold text-gray-800">{Math.round(candidate.utilizationRate * 100)}%</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-gray-400">Chờ ước tính</p>
          <p className="mt-1 font-semibold text-gray-800">{candidate.estimatedWaitMinutes} phút</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={clsx('rounded-full border px-2.5 py-1 text-xs font-semibold', ALERT_CLASS[candidate.alertLevel])}>
          {candidate.alertLevel}
        </span>
        <span className="text-xs text-gray-400">Lần ưu tiên {candidate.rank}</span>
      </div>
    </button>
  );
}

export default function DispatchPage() {
  const [items, setItems] = useState<DispatchSuggestionDto[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SuggestionState>('ALL');
  const [page, setPage] = useState(1);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<DispatchSuggestionDto | null>(null);
  const [selectedCandidateRank, setSelectedCandidateRank] = useState<number>(1);
  const [decisionNote, setDecisionNote] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadSuggestions = useMemo(() => async () => {
    setLoading(true);
    setError('');
    try {
      const response = await dispatchApi.listSuggestions({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: status === 'ALL' ? undefined : status,
        sort: 'desc',
      });
      setItems(response.data);
      setPagination(response.pagination ?? null);
      setSelectedVisitId(prev =>
        prev && response.data.some(item => item.visit.visitId === prev)
          ? prev
          : response.data[0]?.visit.visitId ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được gợi ý điều phối.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (!selectedVisitId) {
      setSelectedSuggestion(null);
      return;
    }

    let active = true;

    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        const response = await dispatchApi.getSuggestionByVisitId(selectedVisitId);
        if (!active) {
          return;
        }

        setSelectedSuggestion(response.data);
        setSelectedCandidateRank(response.data.candidates.find(candidate => candidate.wasSelected)?.rank ?? response.data.candidates[0]?.rank ?? 1);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được chi tiết điều phối.');
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
  }, [selectedVisitId]);

  const selectedCandidate = useMemo(() => {
    if (!selectedSuggestion) {
      return null;
    }

    return (
      selectedSuggestion.candidates.find(candidate => candidate.rank === selectedCandidateRank) ??
      selectedSuggestion.candidates[0] ??
      null
    );
  }, [selectedCandidateRank, selectedSuggestion]);

  const handleSubmitDecision = async () => {
    if (!selectedSuggestion || !selectedCandidate || !selectedCandidate.room) {
      return;
    }

    setSubmitting(true);
    setError('');

    const recommendations = selectedSuggestion.candidates
      .filter(candidate => Boolean(candidate.room?.id))
      .map(candidate => ({
        rank: candidate.rank,
        roomId: candidate.room?.id ?? '',
        resourceScore: candidate.resourceScore,
        queueLength: candidate.queueLength,
        utilizationRate: candidate.utilizationRate,
        estimatedWaitMinutes: candidate.estimatedWaitMinutes,
        alertLevel: candidate.alertLevel,
        reason: candidate.reason,
        wasSelected: candidate.rank === selectedCandidateRank,
      }));

    const recommendedWait = selectedSuggestion.candidates[0]?.estimatedWaitMinutes ?? null;
    const actualWait = selectedCandidate.estimatedWaitMinutes ?? null;

    const body: DispatchDecisionCreateInput = {
      visitId: selectedSuggestion.visit.visitId,
      queueItemId: selectedSuggestion.queueItem?.queueItemId ?? null,
      decisionType: selectedCandidate.rank === 1 ? 'SYSTEM_SUGGESTED' : 'MANUAL',
      outcomeRoomId: selectedCandidate.room.id,
      outcomeDoctorId: selectedCandidate.doctor?.id ?? null,
      serviceId: selectedCandidate.service?.id ?? null,
      note: decisionNote.trim() || null,
      recommendations,
      outcome: {
        serviceId: selectedCandidate.service?.id ?? null,
        followedRecommendation: selectedCandidate.rank === 1,
        actualWaitMinutes: actualWait,
        recommendedWaitEstimate: recommendedWait,
        waitDifference:
          actualWait !== null && recommendedWait !== null ? actualWait - recommendedWait : null,
      },
    };

    try {
      await dispatchApi.createDecision(body);
      setSuccessMessage(`Đã lưu quyết định điều phối cho ${selectedSuggestion.visit.patient.fullName}.`);
      setDecisionNote('');
      await loadSuggestions();
      const refreshed = await dispatchApi.getSuggestionByVisitId(selectedSuggestion.visit.visitId);
      setSelectedSuggestion(refreshed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được quyết định điều phối.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => items, [items]);

  return (
    <Layout pageTitle="Điều phối">
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
                placeholder="Tìm theo mã lượt khám, tên bệnh nhân..."
                className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value as SuggestionState);
                setPage(1);
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              {(['ALL', ...ACTIVE_STATES] as SuggestionState[]).map(state => (
                <option key={state} value={state}>
                  {STATE_LABELS[state]}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Filter size={14} />
              {pagination ? `${pagination.total} gợi ý` : 'Đang đếm...'}
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {error ? (
          <ErrorState message={error} onRetry={loadSuggestions} />
        ) : loading ? (
          <LoadingState label="Đang tải gợi ý điều phối thật từ backend..." />
        ) : filteredItems.length === 0 ? (
          <EmptyState title="Chưa có lượt cần điều phối" description="Backend hiện không trả về lượt phù hợp với bộ lọc." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-3">
              {filteredItems.map(item => (
                <button
                  type="button"
                  key={item.visit.visitId}
                  onClick={() => setSelectedVisitId(item.visit.visitId)}
                  className={clsx(
                    'w-full rounded-2xl border p-4 text-left transition',
                    selectedVisitId === item.visit.visitId
                      ? 'border-sky-400 bg-sky-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-sky-700">
                          {item.visit.queueNumber}
                        </span>
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          {item.stage}
                        </span>
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          {item.queueItem?.queueType ?? 'N/A'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-800">{item.visit.patient.fullName}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.visit.patient.patientCode} · {item.visit.patient.age} tuổi · {item.visit.patient.phone}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {item.queueItem?.laneType ?? 'N/A'} · {item.queueItem?.priorityReason ?? 'Không có ưu tiên'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-gray-400" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
                    <div>
                      <p className="uppercase tracking-wide text-gray-400">Ứớc tính</p>
                      <p className="mt-1 font-semibold text-gray-800">
                        {item.candidates[0]?.estimatedWaitMinutes ?? 0} phút
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide text-gray-400">Gợi ý</p>
                      <p className="mt-1 font-semibold text-gray-800">
                        {item.candidates[0]?.room?.name ?? 'Chưa có'}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide text-gray-400">Điểm</p>
                      <p className="mt-1 font-semibold text-gray-800">
                        {item.candidates[0]?.resourceScore.toFixed(2) ?? '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide text-gray-400">Cập nhật</p>
                      <p className="mt-1 font-semibold text-gray-800">{formatDateTime(item.visit.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
              <PaginationBar pagination={pagination} onPageChange={setPage} />
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chi tiết</p>
                    <h3 className="mt-1 text-base font-bold text-gray-900">
                      {selectedSuggestion ? selectedSuggestion.visit.patient.fullName : 'Chọn một lượt khám'}
                    </h3>
                  </div>
                  <ArrowRightLeft size={18} className="text-sky-600" />
                </div>

                {!selectedSuggestion ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    Chọn một lượt để xem gợi ý điều phối.
                  </div>
                ) : detailLoading ? (
                  <div className="mt-4">
                    <LoadingState label="Đang tải chi tiết gợi ý..." />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lượt khám</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {selectedSuggestion.visit.queueNumber} · {selectedSuggestion.visit.patient.fullName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedSuggestion.visit.patient.patientCode} · {selectedSuggestion.visit.patient.phone}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {selectedSuggestion.queueItem?.queueType ?? 'N/A'} · {selectedSuggestion.queueItem?.laneType ?? 'N/A'} · {selectedSuggestion.queueItem?.priorityReason ?? 'Không có ưu tiên'}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {selectedSuggestion.candidates.map(candidate => (
                        <CandidateCard
                          key={`${candidate.rank}-${candidate.room?.id ?? 'none'}`}
                          candidate={candidate}
                          selected={selectedCandidateRank === candidate.rank}
                          onSelect={() => setSelectedCandidateRank(candidate.rank)}
                        />
                      ))}
                    </div>

                    <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-sky-600" />
                        <p className="text-sm font-semibold text-gray-800">Ghi nhận quyết định</p>
                      </div>
                      <textarea
                        value={decisionNote}
                        onChange={e => setDecisionNote(e.target.value)}
                        rows={3}
                        placeholder="Nhập ghi chú điều phối nếu cần..."
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSubmitDecision()}
                        disabled={submitting || !selectedCandidate || !selectedCandidate.room}
                        className={clsx(
                          'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
                          submitting || !selectedCandidate || !selectedCandidate.room
                            ? 'cursor-not-allowed bg-gray-300'
                            : 'bg-sky-600 hover:bg-sky-700',
                        )}
                      >
                        <CheckCircle2 size={16} />
                        {submitting ? 'Đang lưu...' : 'Lưu quyết định điều phối'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
