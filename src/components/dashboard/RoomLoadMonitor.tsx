import { AlertTriangle, Users, Clock, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { Room, RoomLoadLevel } from '../../types';
import { LoadBadge } from '../ui/PriorityBadge';

const LOAD_BAR: Record<RoomLoadLevel, string> = {
  NORMAL: 'bg-green-500',
  WARNING: 'bg-amber-500',
  OVERLOAD: 'bg-red-500',
};

function RoomRow({ room, rank }: { room: Room; rank?: number }) {
  const pct = Math.min(100, Math.round(room.utilizationRate));
  return (
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-gray-50',
      room.loadLevel === 'OVERLOAD' && 'border-red-200 bg-red-50/40',
      room.loadLevel === 'WARNING' && 'border-amber-200',
      room.loadLevel === 'NORMAL' && 'border-gray-100'
    )}>
      {rank !== undefined && (
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
          {rank}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{room.name}</p>
          <LoadBadge level={room.loadLevel} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-1.5">
          <span className="flex items-center gap-1"><Users size={11} />{room.currentWaiting} chờ</span>
          <span className="flex items-center gap-1"><Clock size={11} />~{room.avgWaitMinutes} phút</span>
          <span className="flex items-center gap-1"><TrendingUp size={11} />{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={clsx('h-1.5 rounded-full transition-all', LOAD_BAR[room.loadLevel])}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface RoomLoadMonitorProps {
  rooms: Room[];
}

export default function RoomLoadMonitor({ rooms }: RoomLoadMonitorProps) {
  const overloaded = rooms.filter(r => r.loadLevel === 'OVERLOAD' && r.status === 'ACTIVE');
  const warnings = rooms.filter(r => r.loadLevel === 'WARNING' && r.status === 'ACTIVE');
  const active = rooms.filter(r => r.status === 'ACTIVE');
  const sorted = [...active].sort((a, b) => b.currentWaiting - a.currentWaiting);
  const top5 = sorted.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Alert strip */}
      {overloaded.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Cảnh báo: {overloaded.length} phòng đang quá tải!</p>
            <p className="text-xs text-red-600 mt-0.5">{overloaded.map(r => r.name).join(', ')}</p>
          </div>
        </div>
      )}
      {warnings.length > 0 && overloaded.length === 0 && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{warnings.length} phòng ở mức cảnh báo</p>
            <p className="text-xs text-amber-600 mt-0.5">{warnings.map(r => r.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Top rooms by queue length */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hàng Đợi Dài Nhất</p>
        <div className="space-y-2">
          {top5.map((room, i) => <RoomRow key={room.id} room={room} rank={i + 1} />)}
        </div>
      </div>
    </div>
  );
}
