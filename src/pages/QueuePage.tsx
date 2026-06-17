import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { queueApi } from '../services/queueApi';
import type { ApiPagination, QueueItemSummaryDto } from '../services/backend-types';
import { ErrorState, EmptyState, LoadingState, PaginationBar } from '../components/common/PageState';
import { LaneBadge, PriorityBadge } from '../components/ui/PriorityBadge';
import { formatDateTime } from '../lib/format';
import { Search, Filter } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Chờ',
  CALLED: 'Đã gọi',
  SERVING: 'Đang phục vụ',
  DONE: 'Hoàn tất',
  TIMEOUT: 'Quá giờ',
  CANCELLED: 'Đã hủy',
};

function StatusPill({ status }: { status: string }) {
  const color =
    status === 'SERVING'
      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
      : status === 'DONE'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : status === 'CALLED'
          ? 'bg-sky-100 text-sky-700 border-sky-200'
          : status === 'TIMEOUT'
            ? 'bg-amber-100 text-amber-700 border-amber-200'
            : status === 'CANCELLED'
              ? 'bg-rose-100 text-rose-700 border-rose-200'
              : 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', color)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function QueueRow({ item }: { item: QueueItemSummaryDto }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/70">
      <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{item.queueNumber}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{item.patient.fullName}</div>
        <div className="text-xs text-gray-400">
          {item.patient.patientCode} · {item.patient.age} tuổi · {item.patient.phone}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <LaneBadge lane={item.priority.laneType} size="sm" />
          {item.priority.priorityReason && <PriorityBadge reason={item.priority.priorityReason as never} size="sm" />}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill status={item.currentStatus} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        <p className="font-medium text-gray-800">{item.room?.name ?? 'Chưa có'}</p>
        <p className="text-gray-400">{item.visit.currentState}</p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        <div>{formatDateTime(item.enqueuedAt)}</div>
        <div className="text-gray-400">~{item.waitingTimeMinutes} phút</div>
      </td>
      <td className="px-4 py-3">
        <span className={clsx('rounded-full border px-2 py-1 text-xs font-semibold', item.priority.isPregnantPriority ? 'border-pink-200 bg-pink-50 text-pink-700' : 'border-gray-200 bg-gray-50 text-gray-500')}>
          {item.priority.isPregnantPriority ? 'Ưu tiên thai' : 'Bình thường'}
        </span>
      </td>
    </tr>
  );
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItemSummaryDto[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [lane, setLane] = useState<'ALL' | 'APPOINTMENT' | 'AFTER_CLS' | 'PRIORITY' | 'NORMAL'>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await queueApi.list({
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
        setError(err instanceof Error ? err.message : 'Không tải được hàng đợi.');
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

  const filteredItems = useMemo(() => {
    return items.filter(item => lane === 'ALL' || item.priority.laneType === lane);
  }, [items, lane]);

  return (
    <Layout pageTitle="Hàng Đợi">
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
                placeholder="Tìm theo tên, mã lượt khám..."
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
              <option value="WAITING">Chờ</option>
              <option value="CALLED">Đã gọi</option>
              <option value="SERVING">Đang phục vụ</option>
              <option value="DONE">Hoàn tất</option>
              <option value="TIMEOUT">Quá giờ</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
            <select
              value={lane}
              onChange={e => setLane(e.target.value as typeof lane)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="ALL">Tất cả làn</option>
              <option value="PRIORITY">Ưu tiên</option>
              <option value="APPOINTMENT">Đặt lịch</option>
              <option value="AFTER_CLS">Sau CLS</option>
              <option value="NORMAL">Thường</option>
            </select>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Filter size={14} />
              {pagination ? `${pagination.total} bản ghi` : 'Đang đếm...'}
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Đang tải hàng đợi thật từ backend..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setPage(1)} />
        ) : filteredItems.length === 0 ? (
          <EmptyState title="Chưa có bệnh nhân trong hàng đợi" description="Thử đổi bộ lọc hoặc chờ backend trả dữ liệu khác." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Mã</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Làn / Ưu tiên</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng / lượt khám</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Chờ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Thai sản</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <QueueRow key={item.queueItemId} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <PaginationBar pagination={pagination} onPageChange={setPage} />
      </div>
    </Layout>
  );
}
