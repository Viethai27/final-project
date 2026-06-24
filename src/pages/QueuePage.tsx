import { useCallback, useEffect, useState } from 'react';
import { Ban, Clock3, Filter, Loader2, Phone, Play, Search, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import Layout from '../components/layout/Layout';
import { ErrorState, EmptyState, LoadingState, PaginationBar } from '../components/common/PageState';
import { ToastContainer } from '../components/common/ToastContainer';
import { LaneBadge, PriorityBadge } from '../components/ui/PriorityBadge';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../lib/format';
import { getToastMessage, useToastNotifications } from '../hooks/useToastNotifications';
import type { ApiPagination, QueueItemSummaryDto } from '../services/backend-types';
import { queueApi, type QueueAction, type QueueLaneFilter } from '../services/queueApi';

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Chờ',
  CALLED: 'Đã gọi',
  SERVING: 'Đang phục vụ',
  DONE: 'Hoàn tất',
  TIMEOUT: 'Quá giờ',
  CANCELLED: 'Đã hủy',
};

const ACTION_LABELS: Record<QueueAction, string> = {
  call: 'Gọi',
  start: 'Bắt đầu',
  timeout: 'Quá giờ',
  cancel: 'Hủy',
};

const ACTION_ICONS = {
  call: Phone,
  start: Play,
  timeout: Clock3,
  cancel: XCircle,
};

function StatusPill({ status }: { status: string }) {
  const color =
    status === 'SERVING'
      ? 'border-indigo-200 bg-indigo-100 text-indigo-700'
      : status === 'DONE'
        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
        : status === 'CALLED'
          ? 'border-sky-200 bg-sky-100 text-sky-700'
          : status === 'TIMEOUT'
            ? 'border-amber-200 bg-amber-100 text-amber-700'
            : status === 'CANCELLED'
              ? 'border-rose-200 bg-rose-100 text-rose-700'
              : 'border-gray-200 bg-gray-100 text-gray-600';

  return (
    <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', color)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function QueueActionButton({
  action,
  disabled,
  loading,
  onClick,
}: {
  action: QueueAction;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const Icon = ACTION_ICONS[action];

  return (
    <button
      type="button"
      title={ACTION_LABELS[action]}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        action === 'cancel'
          ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
          : action === 'timeout'
            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
            : action === 'start'
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : 'border-sky-200 text-sky-700 hover:bg-sky-50',
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {ACTION_LABELS[action]}
    </button>
  );
}

function QueueRow({
  item,
  pendingAction,
  onAction,
}: {
  item: QueueItemSummaryDto;
  pendingAction: { queueItemId: string; action: QueueAction } | null;
  onAction: (item: QueueItemSummaryDto, action: QueueAction) => void;
}) {
  const isPending = pendingAction?.queueItemId === item.queueItemId;
  const canCall = item.currentStatus === 'WAITING';
  const canStart = ['WAITING', 'CALLED'].includes(item.currentStatus) && item.turns.length > 0;
  const canExitQueue = ['WAITING', 'CALLED'].includes(item.currentStatus);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{item.queueNumber}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{item.patient.fullName}</div>
        <div className="text-xs text-gray-400">
          {item.patient.patientCode} · {item.patient.age ?? '--'} tuổi · {item.patient.phone ?? '--'}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <LaneBadge lane={item.priority.laneType} size="sm" />
          {item.priority.priorityReason && <PriorityBadge reason={item.priority.priorityReason} size="sm" />}
        </div>
        <div className="mt-1.5 text-xs font-semibold text-gray-700">
          Điểm {item.status.priorityScore.toFixed(2)}
          <span className="ml-1 font-normal text-gray-400">
            (gốc {item.priority.initialPriorityScore.toFixed(2)})
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill status={item.currentStatus} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        <p className="font-medium text-gray-800">{item.room?.name ?? 'Chưa có'}</p>
        <p className="text-gray-500">{item.visit.currentState}</p>
        <p className="text-gray-400">{item.priority.queueType}</p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        <div>{formatDateTime(item.enqueuedAt)}</div>
        <div className="text-gray-400">~{item.waitingTimeMinutes ?? 0} phút</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex min-w-[210px] flex-wrap gap-1.5">
          <QueueActionButton
            action="call"
            disabled={!canCall || isPending}
            loading={pendingAction?.queueItemId === item.queueItemId && pendingAction.action === 'call'}
            onClick={() => onAction(item, 'call')}
          />
          <QueueActionButton
            action="start"
            disabled={!canStart || isPending}
            loading={pendingAction?.queueItemId === item.queueItemId && pendingAction.action === 'start'}
            onClick={() => onAction(item, 'start')}
          />
          <QueueActionButton
            action="timeout"
            disabled={!canExitQueue || isPending}
            loading={pendingAction?.queueItemId === item.queueItemId && pendingAction.action === 'timeout'}
            onClick={() => onAction(item, 'timeout')}
          />
          <QueueActionButton
            action="cancel"
            disabled={!canExitQueue || isPending}
            loading={pendingAction?.queueItemId === item.queueItemId && pendingAction.action === 'cancel'}
            onClick={() => onAction(item, 'cancel')}
          />
        </div>
      </td>
    </tr>
  );
}

export default function QueuePage() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToastNotifications();
  const [items, setItems] = useState<QueueItemSummaryDto[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    queueItemId: string;
    action: QueueAction;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [lane, setLane] = useState<QueueLaneFilter>('ALL');
  const [page, setPage] = useState(1);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await queueApi.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status,
        lane,
        sort: 'asc',
      });
      setItems(response.data);
      setPagination(response.pagination ?? null);
    } catch (err) {
      const message = getToastMessage(err, 'Không tải được hàng đợi.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [addToast, lane, page, search, status]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleAction = async (item: QueueItemSummaryDto, action: QueueAction) => {
    setPendingAction({ queueItemId: item.queueItemId, action });
    setActionError('');
    setSuccessMessage('');
    try {
      await queueApi[action](item.queueItemId, {
        updatedById: user?.id ?? null,
        note: ACTION_LABELS[action] + ' từ QueuePage',
      });
      setSuccessMessage(ACTION_LABELS[action] + ' thành công cho ' + item.patient.fullName + '.');
      addToast({
        type: 'success',
        action: `${ACTION_LABELS[action]} queue`,
        message: `${ACTION_LABELS[action]} thành công cho ${item.patient.fullName}.`,
      });
      await loadQueue();
    } catch (err) {
      const message = getToastMessage(err, 'Không thể ' + ACTION_LABELS[action].toLowerCase() + ' bệnh nhân.');
      setActionError(message);
      addToast({
        type: 'error',
        action: `${ACTION_LABELS[action]} queue`,
        message,
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Layout pageTitle="Hàng Đợi">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên, mã lượt khám..."
                className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <select
              value={status}
              onChange={event => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="WAITING">Chờ</option>
              <option value="CALLED">Đã gọi</option>
              <option value="SERVING">Đang phục vụ</option>
              <option value="DONE">Hoàn tất</option>
              <option value="TIMEOUT">Quá giờ</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            <select
              value={lane}
              onChange={event => {
                setLane(event.target.value as QueueLaneFilter);
                setPage(1);
              }}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="ALL">Tất cả làn</option>
              <option value="PRIORITY">Ưu tiên</option>
              <option value="APPOINTMENT">Đặt lịch</option>
              <option value="AFTER_CLS">Sau CLS</option>
              <option value="NORMAL">Thường</option>
            </select>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Filter size={14} />
              {pagination ? pagination.total + ' bản ghi' : 'Đang đếm...'}
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

        {actionError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <Ban size={16} className="mt-0.5 shrink-0" />
            {actionError}
          </div>
        )}

        <ToastContainer toasts={toasts} onDismiss={removeToast} />

        {loading ? (
          <LoadingState label="Đang tải hàng đợi thật từ backend..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadQueue} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Chưa có bệnh nhân trong hàng đợi"
            description="Thử đổi bộ lọc hoặc chờ backend trả dữ liệu khác."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Mã</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Làn / ưu tiên</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng / lượt khám</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Chờ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <QueueRow
                      key={item.queueItemId}
                      item={item}
                      pendingAction={pendingAction}
                      onAction={handleAction}
                    />
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
