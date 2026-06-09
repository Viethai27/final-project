import { useState } from 'react';
import { Search, Filter, Phone, ArrowRightLeft, XCircle, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import type { QueueItem, QueueLane, PatientStatus } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { PriorityBadge, LaneBadge } from '../ui/PriorityBadge';
import { ConfirmModal } from '../ui/Modal';

const LANE_ORDER: QueueLane[] = ['PRIORITY', 'APPOINTMENT', 'AFTER_CLS', 'NORMAL'];

function PriorityScore({ score }: { score: number }) {
  const color = score >= 85 ? 'text-red-600 bg-red-50' : score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-50';
  return <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded', color)}>{score}</span>;
}

interface QueueTableProps {
  items: QueueItem[];
  onCall?: (id: string) => void;
  onDispatch?: (item: QueueItem) => void;
  onCancel?: (item: QueueItem) => void;
  showActions?: boolean;
  title?: string;
}

export default function QueueTable({ items, onCall, onDispatch, onCancel, showActions = true, title }: QueueTableProps) {
  const [search, setSearch] = useState('');
  const [laneFilter, setLaneFilter] = useState<QueueLane | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<'priorityScore' | 'queuedAt'>('priorityScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [cancelTarget, setCancelTarget] = useState<QueueItem | null>(null);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = items
    .filter(item => {
      if (search && !item.patientName.toLowerCase().includes(search.toLowerCase()) &&
          !item.ticketNumber.toLowerCase().includes(search.toLowerCase())) return false;
      if (laneFilter !== 'ALL' && item.lane !== laneFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'priorityScore') return (a.priorityScore - b.priorityScore) * mult;
      return a.queuedAt.localeCompare(b.queuedAt) * mult;
    });

  // Group by lane for display
  const byLane: Record<QueueLane, QueueItem[]> = { PRIORITY: [], APPOINTMENT: [], AFTER_CLS: [], NORMAL: [] };
  filtered.forEach(item => byLane[item.lane].push(item));

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : <Minus size={12} className="opacity-30" />;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
        {title && <h3 className="text-sm font-semibold text-gray-800 self-center">{title}</h3>}
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tên, số thứ tự..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          {/* Lane filter */}
          <select
            value={laneFilter}
            onChange={e => setLaneFilter(e.target.value as typeof laneFilter)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <option value="ALL">Tất cả làn</option>
            <option value="PRIORITY">Ưu tiên</option>
            <option value="APPOINTMENT">Đặt lịch</option>
            <option value="NORMAL">Thường</option>
            <option value="AFTER_CLS">Sau CLS</option>
          </select>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="WAITING_EXAM">Chờ khám</option>
            <option value="IN_EXAM">Đang khám</option>
            <option value="WAITING_CLS">Chờ CLS</option>
            <option value="WAITING_CONCLUSION">Chờ kết luận</option>
            <option value="WAITING_PAYMENT">Chờ thanh toán</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} bệnh nhân</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">STT</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Bệnh Nhân</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Làn / Ưu Tiên</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Trạng Thái</th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none"
                onClick={() => toggleSort('priorityScore')}
              >
                <span className="flex items-center gap-1">Điểm ưu tiên <SortIcon field="priorityScore" /></span>
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none"
                onClick={() => toggleSort('queuedAt')}
              >
                <span className="flex items-center gap-1">Thời gian chờ <SortIcon field="queuedAt" /></span>
              </th>
              {showActions && <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Thao Tác</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  Không có bệnh nhân trong hàng đợi
                </td>
              </tr>
            )}
            {LANE_ORDER.map(lane => {
              const group = byLane[lane];
              if (group.length === 0) return null;
              return group.map((item, idx) => (
                <tr key={item.id} className={clsx(
                  'border-b border-gray-50 hover:bg-gray-50/70 transition-colors',
                  item.priorityReason === 'EMERGENCY' && 'bg-red-50/50',
                  idx === 0 && lane !== 'NORMAL' && 'border-t-2 border-t-gray-200'
                )}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-sky-700 text-sm">{item.ticketNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.patientName}</div>
                    <div className="text-xs text-gray-400">
                      {item.patientAge} tuổi · {item.patientGender === 'MALE' ? 'Nam' : 'Nữ'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <LaneBadge lane={item.lane} size="sm" />
                      {item.priorityReason && <PriorityBadge reason={item.priorityReason} size="sm" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityScore score={item.priorityScore} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div>{item.queuedAt.slice(0, 5)}</div>
                    <div className="text-gray-400">~{item.estimatedWaitMinutes} phút</div>
                  </td>
                  {showActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {onCall && (
                          <button
                            onClick={() => onCall(item.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                            title="Gọi bệnh nhân"
                          >
                            <Phone size={12} />
                            Gọi
                          </button>
                        )}
                        {onDispatch && (
                          <button
                            onClick={() => onDispatch(item)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                            title="Chuyển phòng"
                          >
                            <ArrowRightLeft size={12} />
                          </button>
                        )}
                        {onCancel && (
                          <button
                            onClick={() => setCancelTarget(item)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Hủy lượt khám"
                          >
                            <XCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* Cancel confirm */}
      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget && onCancel) {
            onCancel(cancelTarget);
            setCancelTarget(null);
          }
        }}
        title="Xác nhận hủy lượt khám"
        message={`Bạn có chắc muốn hủy lượt khám của bệnh nhân ${cancelTarget?.patientName}? Thao tác này không thể hoàn tác.`}
        confirmLabel="Hủy Lượt Khám"
        confirmVariant="danger"
      />
    </div>
  );
}
