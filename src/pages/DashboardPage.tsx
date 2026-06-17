import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { dashboardApi } from '../services/dashboardApi';
import { roomApi } from '../services/roomApi';
import { visitApi } from '../services/visitApi';
import { queueApi } from '../services/queueApi';
import type {
  DashboardOverviewDto,
  RoomDto,
  VisitListItemDto,
  QueueItemSummaryDto,
} from '../services/backend-types';
import { ErrorState, LoadingState } from '../components/common/PageState';
import { AlertTriangle, ArrowRightLeft, Clock, Users } from 'lucide-react';
import { LoadBadge } from '../components/ui/PriorityBadge';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDateTime } from '../lib/format';

type RoomMetric = RoomDto & {
  currentWaiting: number;
  utilizationRate: number;
  avgWaitMinutes: number;
  loadLevel: 'NORMAL' | 'WARNING' | 'OVERLOAD';
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function RoomRow({ room }: { room: RoomMetric }) {
  const pct = Math.min(100, room.utilizationRate);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{room.name}</p>
          <p className="mt-1 text-xs text-gray-500">
            {room.department.name} · {room.code}
          </p>
        </div>
        <LoadBadge level={room.loadLevel} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users size={11} /> {room.currentWaiting} đang chờ
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} /> ~{room.avgWaitMinutes} phút
        </span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${
            room.loadLevel === 'OVERLOAD'
              ? 'bg-red-500'
              : room.loadLevel === 'WARNING'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>Sức chứa: {room.capacity ?? 'N/A'}</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

function VisitRow({ visit }: { visit: VisitListItemDto }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black text-sky-700">{visit.queueNumber}</span>
            <StatusBadge status={visit.currentState as never} size="sm" />
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-800">{visit.patient.fullName}</p>
          <p className="mt-1 text-xs text-gray-500">
            {visit.patient.patientCode} · {visit.patient.age} tuổi · {visit.patient.phone}
          </p>
        </div>
        <span className="text-xs text-gray-400">{formatDateTime(visit.createdAt)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 sm:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Khoa</p>
          <p className="mt-1 text-gray-700">{visit.department?.name ?? 'Chưa có'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Phòng</p>
          <p className="mt-1 text-gray-700">{visit.room?.name ?? 'Chưa có'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Bác sĩ</p>
          <p className="mt-1 text-gray-700">{visit.doctor?.name ?? 'Chưa có'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Ưu tiên</p>
          <p className="mt-1 text-gray-700">{visit.priorityReason ?? 'Bình thường'}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverviewDto | null>(null);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [visits, setVisits] = useState<VisitListItemDto[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItemSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [overviewRes, roomsRes, visitsRes, queueRes] = await Promise.all([
          dashboardApi.getOverview(),
          roomApi.list({ limit: 50, page: 1 }),
          visitApi.list({ limit: 20, page: 1, sort: 'desc' }),
          queueApi.list({ limit: 50, page: 1, sort: 'desc' }),
        ]);

        if (!active) return;

        setOverview(overviewRes.data);
        setRooms(roomsRes.data);
        setVisits(visitsRes.data);
        setQueueItems(queueRes.data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không tải được dashboard.');
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
  }, []);

  const roomMetrics = useMemo<RoomMetric[]>(() => {
    return rooms
      .map(room => {
        const related = queueItems.filter(item => item.room?.id === room.id);
        const currentWaiting = related.filter(item =>
          ['WAITING', 'CALLED', 'SERVING'].includes(item.status.currentStatus),
        ).length;
        const avgWait =
          related.length > 0
            ? Math.round(
                related.reduce((sum, item) => sum + item.waitingTimeMinutes, 0) / related.length,
              )
            : 0;
        const utilizationRate = room.capacity ? Math.round((currentWaiting / room.capacity) * 100) : 0;
        const loadLevel: RoomMetric['loadLevel'] =
          utilizationRate >= 100 ? 'OVERLOAD' : utilizationRate >= 70 ? 'WARNING' : 'NORMAL';

        return {
          ...room,
          currentWaiting,
          utilizationRate,
          avgWaitMinutes: avgWait,
          loadLevel,
        };
      })
      .sort((a, b) => b.currentWaiting - a.currentWaiting);
  }, [queueItems, rooms]);

  const recentVisits = useMemo(() => {
    return [...visits].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  }, [visits]);

  if (loading) {
    return (
      <Layout pageTitle="Tổng Quan">
        <LoadingState label="Đang tải dashboard thật từ backend..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="Tổng Quan">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Tổng Quan">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Tổng bệnh nhân" value={overview?.totalPatients ?? 0} sub="Từ backend thật" accent="text-sky-600" />
          <StatCard label="Tổng bác sĩ" value={overview?.totalDoctors ?? 0} sub="Đang hoạt động" accent="text-indigo-600" />
          <StatCard label="Tổng lượt khám" value={overview?.totalVisits ?? 0} sub="Dữ liệu demo" accent="text-purple-600" />
          <StatCard label="Đang chờ" value={overview?.waitingPatients ?? 0} sub="Chưa hoàn tất" accent="text-amber-600" />
          <StatCard label="Hàng đợi" value={overview?.activeQueues ?? 0} sub="Queue item đang hoạt động" accent="text-emerald-600" />
          <StatCard label="Hoàn tất" value={overview?.completedVisits ?? 0} sub="Đã đóng lượt" accent="text-red-600" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Lượt khám gần đây</p>
                  <p className="mt-1 text-xs text-gray-500">Danh sách lấy từ <code>/visits</code></p>
                </div>
                <ArrowRightLeft className="text-gray-400" size={18} />
              </div>

              <div className="mt-4 space-y-3">
                {recentVisits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                    Chưa có lượt khám nào.
                  </div>
                ) : (
                  recentVisits.map(visit => <VisitRow key={visit.visitId} visit={visit} />)
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Tải phòng hiện tại</p>
                  <p className="mt-1 text-xs text-gray-500">Tính từ queue item thật</p>
                </div>
                <Users className="text-gray-400" size={18} />
              </div>

              <div className="mt-4 space-y-3">
                {roomMetrics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                    Chưa có dữ liệu phòng.
                  </div>
                ) : (
                  roomMetrics.slice(0, 5).map(room => <RoomRow key={room.id} room={room} />)
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={18} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Điểm cần chú ý</p>
                  <p className="mt-1 text-xs text-gray-500">Bệnh nhân ưu tiên và phòng quá tải</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-700">Bệnh nhân chờ</p>
                  <p className="mt-1 text-2xl font-black text-amber-700">{overview?.waitingPatients ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs text-red-700">Phòng quá tải</p>
                  <p className="mt-1 text-2xl font-black text-red-700">
                    {roomMetrics.filter(room => room.loadLevel === 'OVERLOAD').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
