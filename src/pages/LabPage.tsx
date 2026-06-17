import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FlaskConical, Search, PlayCircle, FileText, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { ErrorState, EmptyState, LoadingState, PaginationBar } from '../components/common/PageState';
import { clsApi } from '../services/clsApi';
import type {
  ApiPagination,
  CLSOrderDetailDto,
  CLSOrderSummaryDto,
  CLSResultSummaryDto,
} from '../services/backend-types';
import { formatDateTime } from '../lib/format';
import { clsx } from 'clsx';
import Modal from '../components/ui/Modal';

type LabTab = 'ORDERS' | 'RESULTS';

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ',
  ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

const ORDER_STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
  ASSIGNED: 'bg-sky-100 text-sky-700 border-sky-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-100 text-rose-700 border-rose-200',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', ORDER_STATUS_CLASS[status] ?? ORDER_STATUS_CLASS.PENDING)}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function OrderRow({
  order,
  selected,
  onSelect,
  onStart,
  onComplete,
  pending,
}: {
  order: CLSOrderSummaryDto;
  selected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onComplete: () => void;
  pending: boolean;
}) {
  const canStart = !['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(order.status);
  const canComplete = order.status === 'IN_PROGRESS';

  return (
    <tr
      className={clsx('border-b border-gray-50 hover:bg-gray-50/70', selected && 'bg-sky-50/60')}
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <div className="font-mono text-xs font-black text-sky-700">{order.clsOrderId}</div>
        <div className="mt-1 text-xs text-gray-400">{formatDateTime(order.orderedAt)}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{order.visit.patient.fullName}</div>
        <div className="text-xs text-gray-400">{order.visit.queueNumber} · {order.visit.patient.patientCode}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-800">{order.service?.name ?? 'Chưa có'}</div>
        <div className="text-xs text-gray-400">{order.room?.name ?? 'Chưa có phòng'}</div>
      </td>
      <td className="px-4 py-3">
        <StatusPill status={order.status} />
        <div className="mt-2 text-xs text-gray-400">{order.priority}</div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        <div>{order.clinicalNote ?? 'Không có ghi chú'}</div>
        <div className="mt-1 text-gray-400">{order.note ?? ''}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onStart();
            }}
            disabled={!canStart || pending}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              canStart && !pending ? 'bg-sky-600 text-white hover:bg-sky-700' : 'cursor-not-allowed bg-gray-200 text-gray-400',
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
            disabled={!canComplete || pending}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              canComplete && !pending ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'cursor-not-allowed bg-gray-200 text-gray-400',
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

function ResultRow({
  result,
  selected,
  onSelect,
}: {
  result: CLSResultSummaryDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      className={clsx('border-b border-gray-50 hover:bg-gray-50/70', selected && 'bg-sky-50/60')}
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <div className="font-mono text-xs font-black text-sky-700">{result.clsResultId}</div>
        <div className="mt-1 text-xs text-gray-400">{formatDateTime(result.resultAt ?? result.resultDate ?? '')}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{result.clsOrder.visit.patient.fullName}</div>
        <div className="text-xs text-gray-400">{result.clsOrder.visit.queueNumber}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-800">{result.clsOrder.service?.name ?? 'Chưa có'}</div>
        <div className="text-xs text-gray-400">{result.clsOrder.room?.name ?? 'Chưa có phòng'}</div>
      </td>
      <td className="px-4 py-3">
        <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', result.isAbnormal ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {result.isAbnormal ? 'Bất thường' : 'Bình thường'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        <div>{result.resultText ?? 'Không có kết quả'}</div>
        <div className="mt-1 text-gray-400">{result.note ?? ''}</div>
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

function OrderDetailPanel({
  order,
  onStart,
  onOpenComplete,
  pending,
}: {
  order: CLSOrderDetailDto;
  onStart: () => void;
  onOpenComplete: () => void;
  pending: boolean;
}) {
  const canStart = !['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(order.status);
  const canComplete = order.status === 'IN_PROGRESS';

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chi tiết CLS</p>
          <h3 className="mt-1 text-base font-bold text-gray-900">{order.visit.patient.fullName}</h3>
          <p className="mt-1 text-xs text-gray-500">{order.clsOrderId}</p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailField label="Mã lượt" value={order.visit.queueNumber} />
        <DetailField label="Trạng thái lượt" value={order.visit.currentState} />
        <DetailField label="Dịch vụ" value={order.service?.name} />
        <DetailField label="Phòng" value={order.room?.name} />
        <DetailField label="Bác sĩ" value={order.orderedBy?.name} />
        <DetailField label="Ưu tiên" value={order.priority} />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Thông tin lâm sàng</p>
        <p className="mt-2 text-sm text-gray-700">{order.clinicalNote ?? 'Không có ghi chú lâm sàng'}</p>
        <p className="mt-2 text-xs text-gray-400">{order.note ?? ''}</p>
      </div>

      {order.result && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Kết quả</p>
          <p className="mt-2 text-sm text-gray-800">{order.result.resultText ?? 'Không có kết quả'}</p>
          <p className="mt-2 text-xs text-emerald-700">
            {order.result.isAbnormal ? 'Bất thường' : 'Bình thường'} · {formatDateTime(order.result.resultAt ?? order.result.resultDate ?? '')}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart || pending}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
            canStart && !pending ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-gray-300',
          )}
        >
          <PlayCircle size={16} />
          Bắt đầu
        </button>
        <button
          type="button"
          onClick={onOpenComplete}
          disabled={!canComplete || pending}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
            canComplete && !pending ? 'bg-emerald-600 hover:bg-emerald-700' : 'cursor-not-allowed bg-gray-300',
          )}
        >
          <CheckCircle2 size={16} />
          Hoàn tất
        </button>
      </div>
    </div>
  );
}

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<LabTab>('ORDERS');
  const [orders, setOrders] = useState<CLSOrderSummaryDto[]>([]);
  const [ordersPagination, setOrdersPagination] = useState<ApiPagination | null>(null);
  const [results, setResults] = useState<CLSResultSummaryDto[]>([]);
  const [resultsPagination, setResultsPagination] = useState<ApiPagination | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [error, setError] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CLSOrderDetailDto | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<CLSResultSummaryDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [resultText, setResultText] = useState('');
  const [resultFileUrl, setResultFileUrl] = useState('');
  const [resultNote, setResultNote] = useState('');
  const [isAbnormal, setIsAbnormal] = useState(false);

  const loadOrders = useMemo(() => async () => {
    setLoadingOrders(true);
    setError('');
    try {
      const response = await clsApi.listOrders({
        page: orderPage,
        limit: 10,
        search: orderSearch.trim() || undefined,
        status: orderStatus || undefined,
        sort: 'desc',
      });
      setOrders(response.data);
      setOrdersPagination(response.pagination ?? null);
      setSelectedOrderId(prev =>
        prev && response.data.some(item => item.clsOrderId === prev)
          ? prev
          : response.data[0]?.clsOrderId ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được CLS orders.');
    } finally {
      setLoadingOrders(false);
    }
  }, [orderPage, orderSearch, orderStatus]);

  const loadResults = useMemo(() => async () => {
    setLoadingResults(true);
    setError('');
    try {
      const response = await clsApi.listResults({
        page: resultPage,
        limit: 10,
        search: resultSearch.trim() || undefined,
        sort: 'desc',
      });
      setResults(response.data);
      setResultsPagination(response.pagination ?? null);
      setSelectedResultId(prev =>
        prev && response.data.some(item => item.clsResultId === prev)
          ? prev
          : response.data[0]?.clsResultId ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được CLS results.');
    } finally {
      setLoadingResults(false);
    }
  }, [resultPage, resultSearch]);

  useEffect(() => {
    if (activeTab === 'ORDERS') {
      void loadOrders();
    } else {
      void loadResults();
    }
  }, [activeTab, loadOrders, loadResults]);

  useEffect(() => {
    if (activeTab !== 'ORDERS' || !selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    let active = true;
    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        const response = await clsApi.getOrderById(selectedOrderId);
        if (active) {
          setSelectedOrder(response.data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được chi tiết CLS order.');
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
  }, [activeTab, selectedOrderId]);

  useEffect(() => {
    if (activeTab !== 'RESULTS' || !selectedResultId) {
      setSelectedResult(null);
      return;
    }

    let active = true;
    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        const response = await clsApi.getResultById(selectedResultId);
        if (active) {
          setSelectedResult(response.data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được chi tiết CLS result.');
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
  }, [activeTab, selectedResultId]);

  const handleStartOrder = async (orderId: string) => {
    setMutatingId(orderId);
    setError('');
    try {
      await clsApi.startOrder(orderId);
      await loadOrders();
      if (selectedOrderId === orderId) {
        const refreshed = await clsApi.getOrderById(orderId);
        setSelectedOrder(refreshed.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu CLS order.');
    } finally {
      setMutatingId(null);
    }
  };

  const handleOpenComplete = () => {
    setResultText('');
    setResultFileUrl('');
    setResultNote('');
    setIsAbnormal(false);
    setCompletionOpen(true);
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    setMutatingId(selectedOrder.clsOrderId);
    setError('');
    try {
      await clsApi.completeOrder(selectedOrder.clsOrderId, {
        resultText: resultText.trim() || null,
        resultFileUrl: resultFileUrl.trim() || null,
        isAbnormal,
        note: resultNote.trim() || null,
      });
      setCompletionOpen(false);
      await loadOrders();
      await loadResults();
      const refreshed = await clsApi.getOrderById(selectedOrder.clsOrderId);
      setSelectedOrder(refreshed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể hoàn tất CLS order.');
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <Layout pageTitle="Cận Lâm Sàng">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          {([
            ['ORDERS', 'CLS Orders'],
            ['RESULTS', 'CLS Results'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                activeTab === tab ? 'bg-sky-600 text-white' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => void (activeTab === 'ORDERS' ? loadOrders() : loadResults())} />
        ) : activeTab === 'ORDERS' ? (
          loadingOrders ? (
            <LoadingState label="Đang tải CLS orders..." />
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có CLS order" description="Bộ lọc hiện tại chưa có dữ liệu." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[240px] flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={orderSearch}
                        onChange={e => {
                          setOrderSearch(e.target.value);
                          setOrderPage(1);
                        }}
                        placeholder="Tìm theo mã order, bệnh nhân, dịch vụ..."
                        className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <select
                      value={orderStatus}
                      onChange={e => {
                        setOrderStatus(e.target.value);
                        setOrderPage(1);
                      }}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="">Tất cả trạng thái</option>
                      {Object.keys(ORDER_STATUS_LABELS).map(key => (
                        <option key={key} value={key}>
                          {ORDER_STATUS_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Order</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dịch vụ / Phòng</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ghi chú</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <OrderRow
                            key={order.clsOrderId}
                            order={order}
                            selected={selectedOrderId === order.clsOrderId}
                            onSelect={() => setSelectedOrderId(order.clsOrderId)}
                            onStart={() => void handleStartOrder(order.clsOrderId)}
                            onComplete={() => {
                              setSelectedOrderId(order.clsOrderId);
                              setCompletionOpen(true);
                            }}
                            pending={mutatingId === order.clsOrderId}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <PaginationBar pagination={ordersPagination} onPageChange={setOrderPage} />
              </div>

              <div className="space-y-4">
                {detailLoading ? (
                  <LoadingState label="Đang tải chi tiết order..." />
                ) : selectedOrder ? (
                  <OrderDetailPanel
                    order={selectedOrder}
                    onStart={() => void handleStartOrder(selectedOrder.clsOrderId)}
                    onOpenComplete={() => setCompletionOpen(true)}
                    pending={mutatingId === selectedOrder.clsOrderId}
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
                    <FlaskConical className="mx-auto mb-3 text-sky-600" size={24} />
                    Chọn một CLS order để xem chi tiết.
                  </div>
                )}

                {selectedOrder && (
                  <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kết quả hiện có</p>
                    <div className="mt-3">
                      {selectedOrder.result ? (
                        <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                          <p className="font-semibold text-gray-800">{selectedOrder.result.resultText ?? 'Không có kết quả'}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {selectedOrder.result.isAbnormal ? 'Bất thường' : 'Bình thường'} · {formatDateTime(selectedOrder.result.resultAt ?? selectedOrder.result.resultDate ?? '')}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                          Chưa có kết quả cho order này.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : loadingResults ? (
          <LoadingState label="Đang tải CLS results..." />
        ) : results.length === 0 ? (
          <EmptyState title="Chưa có CLS result" description="Bộ lọc hiện tại chưa có dữ liệu." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[240px] flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={resultSearch}
                      onChange={e => {
                        setResultSearch(e.target.value);
                        setResultPage(1);
                      }}
                      placeholder="Tìm theo mã result, bệnh nhân, kết quả..."
                      className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText size={14} />
                    {resultsPagination ? `${resultsPagination.total} kết quả` : 'Đang đếm...'}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Result</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dịch vụ / Phòng</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Đánh giá</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(result => (
                        <ResultRow
                          key={result.clsResultId}
                          result={result}
                          selected={selectedResultId === result.clsResultId}
                          onSelect={() => setSelectedResultId(result.clsResultId)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <PaginationBar pagination={resultsPagination} onPageChange={setResultPage} />
            </div>

            <div className="space-y-4">
              {detailLoading ? (
                <LoadingState label="Đang tải chi tiết result..." />
              ) : selectedResult ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chi tiết result</p>
                      <h3 className="mt-1 text-base font-bold text-gray-900">
                        {selectedResult.clsOrder.visit.patient.fullName}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">{selectedResult.clsResultId}</p>
                    </div>
                    <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', selectedResult.isAbnormal ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                      {selectedResult.isAbnormal ? 'Bất thường' : 'Bình thường'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailField label="Mã lượt" value={selectedResult.clsOrder.visit.queueNumber} />
                    <DetailField label="Order" value={selectedResult.clsOrder.status} />
                    <DetailField label="Dịch vụ" value={selectedResult.clsOrder.service?.name} />
                    <DetailField label="Phòng" value={selectedResult.clsOrder.room?.name} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nội dung</p>
                    <p className="mt-2 text-sm text-gray-700">{selectedResult.resultText ?? 'Không có kết quả'}</p>
                    <p className="mt-2 text-xs text-gray-500">{selectedResult.note ?? ''}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
                  <AlertCircle className="mx-auto mb-3 text-sky-600" size={24} />
                  Chọn một CLS result để xem chi tiết.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
        title="Hoàn tất CLS order"
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCompletionOpen(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleCompleteOrder()}
              disabled={!selectedOrder || mutatingId === selectedOrder?.clsOrderId}
              className={clsx(
                'rounded-lg px-4 py-2 text-sm font-semibold text-white transition',
                selectedOrder && mutatingId !== selectedOrder.clsOrderId
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'cursor-not-allowed bg-gray-300',
              )}
            >
              {mutatingId === selectedOrder?.clsOrderId ? 'Đang lưu...' : 'Xác nhận hoàn tất'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-800">{selectedOrder?.visit.patient.fullName ?? 'Chưa chọn'}</p>
            <p className="mt-1 text-xs text-gray-500">
              {selectedOrder?.service?.name ?? 'Không có dịch vụ'} · {selectedOrder?.priority ?? 'N/A'}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Kết quả *</label>
            <textarea
              value={resultText}
              onChange={e => setResultText(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              placeholder="Nhập kết quả CLS..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">File kết quả</label>
            <input
              value={resultFileUrl}
              onChange={e => setResultFileUrl(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              placeholder="URL file nếu có"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú</label>
            <input
              value={resultNote}
              onChange={e => setResultNote(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              placeholder="Ghi chú thêm..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <input
              type="checkbox"
              checked={isAbnormal}
              onChange={e => setIsAbnormal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-rose-600"
            />
            Đánh dấu bất thường
          </label>
        </div>
      </Modal>
    </Layout>
  );
}
