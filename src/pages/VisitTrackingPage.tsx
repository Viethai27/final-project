import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import Modal from '../components/ui/Modal';
import VisitTimeline from '../components/patient/VisitTimeline';
import StatusBadge from '../components/ui/StatusBadge';
import { visitApi } from '../services/visitApi';
import type { ApiPagination, VisitDetailForActionDto, VisitListItemDto } from '../services/backend-types';
import { ErrorState, EmptyState, LoadingState, PaginationBar } from '../components/common/PageState';
import { formatDateTime, formatCurrency } from '../lib/format';
import { Search, FileSearch, User } from 'lucide-react';
import type { PatientStatus, StatusHistoryEntry } from '../types';

function HistoryTimeline({ histories }: { histories: StatusHistoryEntry[] }) {
  return <VisitTimeline currentStatus={(histories[histories.length - 1]?.toStatus ?? 'WAITING_EXAM') as PatientStatus} history={histories} />;
}

function mapHistories(detail: VisitDetailForActionDto): StatusHistoryEntry[] {
  return detail.stateHistories.map(item => ({
    id: item.id,
    visitId: detail.visitId,
    fromStatus: item.fromState as PatientStatus | undefined,
    toStatus: item.toState as PatientStatus,
    timestamp: item.transitionedAt,
    performedBy: item.triggeredBy?.id ?? 'system',
    performedByName: item.triggeredBy?.fullName ?? 'Hệ thống',
    note: item.note ?? undefined,
  }));
}

function VisitRow({
  visit,
  onSelect,
}: {
  visit: VisitListItemDto;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black text-sky-700">{visit.queueNumber}</span>
            <StatusBadge status={visit.currentState as PatientStatus} size="sm" />
            {visit.priorityReason && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                {visit.priorityReason}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-800">{visit.patient.fullName}</p>
          <p className="mt-1 text-xs text-gray-500">
            {visit.patient.patientCode} · {visit.patient.age} tuổi · {visit.patient.phone}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {visit.room?.name ?? 'Chưa có phòng'} · {visit.doctor?.name ?? 'Chưa có bác sĩ'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{formatDateTime(visit.createdAt)}</p>
          <p className="mt-1 text-xs text-gray-500">{visit.expectedFinishTime ? `Dự kiến: ${formatDateTime(visit.expectedFinishTime)}` : 'Chưa có ETA'}</p>
        </div>
      </div>
    </button>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function VisitTrackingPage() {
  const [items, setItems] = useState<VisitListItemDto[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedVisit, setSelectedVisit] = useState<VisitDetailForActionDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await visitApi.list({
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: status || undefined,
          sort: 'desc',
        });
        if (!active) return;
        setItems(response.data);
        setPagination(response.pagination ?? null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không tải được lượt khám.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [page, search, status]);

  const historyEntries = useMemo(() => {
    if (!selectedVisit) return [];
    return mapHistories(selectedVisit);
  }, [selectedVisit]);

  const openDetail = async (visitId: string) => {
    try {
      setDetailLoading(true);
      setDetailError('');
      const detail = await visitApi.getById(visitId);
      setSelectedVisit(detail.data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Không tải được chi tiết lượt khám.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <Layout pageTitle="Lượt Khám">
      <div className="space-y-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên, mã lượt khám, mã bệnh nhân..."
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
              <option value="WAITING_EXAM">Chờ khám</option>
              <option value="IN_EXAM">Đang khám</option>
              <option value="WAITING_CLS">Chờ CLS</option>
              <option value="IN_CLS">Đang CLS</option>
              <option value="WAITING_RESULT">Chờ kết quả</option>
              <option value="WAITING_CONCLUSION">Chờ kết luận</option>
              <option value="IN_CONCLUSION">Đang kết luận</option>
              <option value="WAITING_PAYMENT">Chờ thanh toán</option>
              <option value="COMPLETED">Hoàn tất</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileSearch size={14} />
              {pagination ? `${pagination.total} lượt khám` : 'Đang đếm...'}
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Đang tải lượt khám thật từ backend..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setPage(1)} />
        ) : items.length === 0 ? (
          <EmptyState title="Không có lượt khám nào" description="Thử đổi bộ lọc hoặc tìm kiếm bằng mã bệnh nhân." />
        ) : (
          <div className="space-y-3">
            {items.map(visit => (
              <VisitRow key={visit.visitId} visit={visit} onSelect={() => void openDetail(visit.visitId)} />
            ))}
          </div>
        )}

        <PaginationBar pagination={pagination} onPageChange={setPage} />
      </div>

      <Modal
        open={Boolean(selectedVisit) || detailLoading}
        onClose={() => setSelectedVisit(null)}
        title={selectedVisit ? `Chi tiết lượt khám - ${selectedVisit.queueNumber}` : 'Đang tải chi tiết...'}
        size="xl"
      >
        {detailLoading && !selectedVisit ? (
          <LoadingState label="Đang tải chi tiết lượt khám..." />
        ) : detailError ? (
          <ErrorState message={detailError} onRetry={() => selectedVisit && void openDetail(selectedVisit.visitId)} />
        ) : selectedVisit ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <DetailSection title="Bệnh nhân">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-gray-800">{selectedVisit.patient.fullName}</p>
                  <p className="text-gray-500">{selectedVisit.patient.patientCode} · {selectedVisit.patient.age} tuổi</p>
                  <p className="text-gray-500">{selectedVisit.patient.phone}</p>
                </div>
              </DetailSection>
              <DetailSection title="Lượt khám">
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-sky-700">{selectedVisit.queueNumber}</span>
                    <StatusBadge status={selectedVisit.currentState as PatientStatus} size="sm" />
                  </div>
                  <p className="text-gray-500">Phòng: {selectedVisit.room?.name ?? 'Chưa có'}</p>
                  <p className="text-gray-500">Bác sĩ: {selectedVisit.doctor?.name ?? 'Chưa có'}</p>
                  <p className="text-gray-500">Ngày tạo: {formatDateTime(selectedVisit.createdAt)}</p>
                  <p className="text-gray-500">ETA: {selectedVisit.expectedFinishTime ? formatDateTime(selectedVisit.expectedFinishTime) : 'Chưa có'}</p>
                </div>
              </DetailSection>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <DetailSection title="Tiến trình">
                <VisitTimeline currentStatus={selectedVisit.currentState as PatientStatus} history={historyEntries} />
              </DetailSection>
              <DetailSection title="Chỉ định & CLS">
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Turn</p>
                    <p className="mt-1 text-gray-700">{selectedVisit.turns.length > 0 ? `${selectedVisit.turns.length} turn` : 'Chưa có'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">CLS</p>
                    <p className="mt-1 text-gray-700">{selectedVisit.clsOrders.length > 0 ? `${selectedVisit.clsOrders.length} chỉ định` : 'Chưa có'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Thanh toán</p>
                    <p className="mt-1 text-gray-700">
                      {selectedVisit.invoice ? `${formatCurrency(selectedVisit.invoice.totalAmount)} VND` : 'Chưa có hóa đơn'}
                    </p>
                  </div>
                </div>
              </DetailSection>
            </div>

            {selectedVisit.clsOrders.length > 0 && (
              <DetailSection title="Danh sách CLS">
                <div className="space-y-3">
                  {selectedVisit.clsOrders.map(order => (
                    <div key={order.clsOrderId} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{order.service?.name ?? 'Chưa có dịch vụ'}</p>
                          <p className="text-xs text-gray-500">{order.room?.name ?? 'Chưa có phòng'}</p>
                        </div>
                        <StatusBadge status={selectedVisit.currentState as PatientStatus} size="sm" />
                      </div>
                      {order.result && (
                        <p className="mt-2 text-xs text-gray-600">
                          Kết quả: {order.result.resultText ?? 'Chưa có'}{order.result.isAbnormal ? ' · Bất thường' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {selectedVisit.turns.length > 0 && (
              <DetailSection title="Danh sách Turn">
                <div className="space-y-3">
                  {selectedVisit.turns.map(turn => (
                    <div key={turn.turnId} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{turn.turnType}</p>
                          <p className="text-xs text-gray-500">{turn.room?.name ?? 'Chưa có phòng'}</p>
                        </div>
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600">
                          {turn.progress?.status ?? 'Chưa có'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {selectedVisit.invoice && (
              <DetailSection title="Hóa đơn">
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">Tổng tiền: {formatCurrency(selectedVisit.invoice.totalAmount)} VND</p>
                  <p className="text-gray-700">Đã thanh toán: {formatCurrency(selectedVisit.invoice.paidAmount)} VND</p>
                  <p className="text-gray-700">Trạng thái: {selectedVisit.invoice.status}</p>
                  <p className="text-gray-700">Thanh toán lúc: {selectedVisit.invoice.paidAt ? formatDateTime(selectedVisit.invoice.paidAt) : 'Chưa có'}</p>
                  {selectedVisit.invoice.items && selectedVisit.invoice.items.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedVisit.invoice.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-800">{item.service?.name ?? 'Dịch vụ'}</p>
                            <p className="text-xs text-gray-500">SL {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-gray-800">{formatCurrency(item.totalPrice)} VND</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DetailSection>
            )}
          </div>
        ) : null}
      </Modal>
    </Layout>
  );
}
