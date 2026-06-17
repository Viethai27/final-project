import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Search, Stethoscope, Users } from 'lucide-react';
import { clsx } from 'clsx';
import Layout from '../components/layout/Layout';
import { dashboardApi } from '../services/dashboardApi';
import { roomApi } from '../services/roomApi';
import { queueApi } from '../services/queueApi';
import { visitApi } from '../services/visitApi';
import { doctorApi } from '../services/doctorApi';
import type {
  DashboardOverviewDto,
  DoctorDto,
  QueueItemSummaryDto,
  RoomDto,
  VisitListItemDto,
} from '../services/backend-types';
import { ErrorState, EmptyState, LoadingState } from '../components/common/PageState';
import { LoadBadge } from '../components/ui/PriorityBadge';
import StatusBadge from '../components/ui/StatusBadge';
import type { PatientStatus } from '../types';
import { formatDateTime } from '../lib/format';

type RoomMetric = RoomDto & {
  activeQueueCount: number;
  utilizationRate: number;
  avgWaitMinutes: number;
  loadLevel: 'NORMAL' | 'WARNING' | 'OVERLOAD';
  attendingDoctor?: DoctorDto | null;
};

const ACTIVE_QUEUE_STATUSES = ['WAITING', 'CALLED', 'SERVING'];
const ACTIVE_VISIT_STATUSES: PatientStatus[] = [
  'WAITING_EXAM',
  'IN_EXAM',
  'WAITING_CLS',
  'IN_CLS',
  'WAITING_RESULT',
  'WAITING_CONCLUSION',
  'IN_CONCLUSION',
  'WAITING_PAYMENT',
];

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={clsx('mt-2 text-3xl font-black', accent)}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function RoomCard({ room }: { room: RoomMetric }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{room.name}</p>
          <p className="mt-1 text-xs text-gray-500">
            {room.code} · {room.roomType} · {room.department.name}
          </p>
          <p className="mt-1 text-xs text-gray-500">{room.attendingDoctor?.name ?? 'Chưa có bác sĩ chính'}</p>
        </div>
        <LoadBadge level={room.loadLevel} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-gray-600">
        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Đang chờ</p>
          <p className="mt-1 text-lg font-bold text-gray-800">{room.activeQueueCount}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Util</p>
          <p className="mt-1 text-lg font-bold text-gray-800">{room.utilizationRate}%</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Chờ TB</p>
          <p className="mt-1 text-lg font-bold text-gray-800">{room.avgWaitMinutes}p</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={clsx(
            'h-full rounded-full',
            room.loadLevel === 'OVERLOAD'
              ? 'bg-red-500'
              : room.loadLevel === 'WARNING'
                ? 'bg-amber-500'
                : 'bg-emerald-500',
          )}
          style={{ width: `${Math.min(100, room.utilizationRate)}%` }}
        />
      </div>
    </div>
  );
}

function QueueRow({ item }: { item: QueueItemSummaryDto }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/70">
      <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{item.queueNumber}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{item.patient.fullName}</div>
        <div className="text-xs text-gray-400">{item.patient.patientCode} · {item.patient.phone}</div>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {item.priority.laneType}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={item.visit.currentState as PatientStatus} size="sm" />
      </td>
      <td className="px-4 py-3 text-gray-600">
        <div>{item.room?.name ?? 'Chưa có'}</div>
        <div className="text-xs text-gray-400">{item.service?.name ?? 'Chưa có'} · {item.doctor?.name ?? 'Không có bác sĩ'}</div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        <div>{item.waitingTimeMinutes} phút</div>
        <div className="text-gray-400">{formatDateTime(item.enqueuedAt)}</div>
      </td>
    </tr>
  );
}

function VisitRow({ visit }: { visit: VisitListItemDto }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/70">
      <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{visit.queueNumber}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{visit.patient.fullName}</div>
        <div className="text-xs text-gray-400">{visit.patient.patientCode} · {visit.patient.phone}</div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={visit.currentState as PatientStatus} size="sm" />
      </td>
      <td className="px-4 py-3 text-gray-600">
        <div>{visit.room?.name ?? 'Chưa có'}</div>
        <div className="text-xs text-gray-400">{visit.doctor?.name ?? 'Chưa có'}</div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(visit.createdAt)}</td>
    </tr>
  );
}

export default function MonitoringPage() {
  const [overview, setOverview] = useState<DashboardOverviewDto | null>(null);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItemSummaryDto[]>([]);
  const [visits, setVisits] = useState<VisitListItemDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [overviewRes, roomsRes, queueRes, visitRes, doctorRes] = await Promise.all([
          dashboardApi.getOverview(),
          roomApi.list({ limit: 100, page: 1, sort: 'desc' }),
          queueApi.list({ limit: 100, page: 1, sort: 'desc' }),
          visitApi.list({ limit: 100, page: 1, sort: 'desc' }),
          doctorApi.list({ limit: 100, page: 1, sort: 'desc' }),
        ]);

        if (!active) return;

        setOverview(overviewRes.data);
        setRooms(roomsRes.data);
        setQueueItems(queueRes.data);
        setVisits(visitRes.data);
        setDoctors(doctorRes.data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được dashboard giám sát.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const roomMetrics = useMemo<RoomMetric[]>(() => {
    const doctorByRoom = new Map(doctors.filter(doctor => doctor.defaultRoomId).map(doctor => [doctor.defaultRoomId as string, doctor]));

    return rooms
      .map(room => {
        const relatedQueueItems = queueItems.filter(item => item.room?.id === room.id);
        const activeQueueCount = relatedQueueItems.filter(item => ACTIVE_QUEUE_STATUSES.includes(item.status.currentStatus)).length;
        const avgWaitMinutes = relatedQueueItems.length
          ? Math.round(relatedQueueItems.reduce((sum, item) => sum + item.waitingTimeMinutes, 0) / relatedQueueItems.length)
          : 0;
        const utilizationRate = room.capacity ? Math.round((activeQueueCount / room.capacity) * 100) : 0;
        const loadLevel: RoomMetric['loadLevel'] =
          utilizationRate >= 100 ? 'OVERLOAD' : utilizationRate >= 70 ? 'WARNING' : 'NORMAL';

        return {
          ...room,
          activeQueueCount,
          utilizationRate,
          avgWaitMinutes,
          loadLevel,
          attendingDoctor: doctorByRoom.get(room.id) ?? null,
        };
      })
      .sort((a, b) => b.activeQueueCount - a.activeQueueCount);
  }, [doctors, queueItems, rooms]);

  const filteredRoomMetrics = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roomMetrics;
    return roomMetrics.filter(room =>
      [room.name, room.code, room.department.name, room.attendingDoctor?.name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [roomMetrics, search]);

  const activeVisits = useMemo(
    () => visits.filter(visit => ACTIVE_VISIT_STATUSES.includes(visit.currentState as PatientStatus)),
    [visits],
  );

  const waitingQueue = useMemo(
    () => queueItems.filter(item => ACTIVE_QUEUE_STATUSES.includes(item.status.currentStatus)),
    [queueItems],
  );

  const overloadedRooms = roomMetrics.filter(room => room.loadLevel === 'OVERLOAD');
  const warnedRooms = roomMetrics.filter(room => room.loadLevel === 'WARNING');

  if (loading) {
    return (
      <Layout pageTitle="Giám Sát">
        <LoadingState label="Đang tải dữ liệu giám sát thật từ backend..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="Giám Sát">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Giám Sát">
      <div className="space-y-5">
        {overloadedRooms.length > 0 && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {overloadedRooms.length} phòng đang quá tải
                </p>
                <p className="mt-1 text-xs text-red-600">
                  {overloadedRooms.map(room => room.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Tổng lượt khám" value={overview?.totalVisits ?? visits.length} sub="Từ /dashboard/overview" accent="text-sky-600" />
          <StatCard label="Đang chờ" value={overview?.waitingPatients ?? activeVisits.length} sub="Bệnh nhân chờ xử lý" accent="text-amber-600" />
          <StatCard label="Hàng đợi" value={overview?.activeQueues ?? waitingQueue.length} sub="Queue item active" accent="text-emerald-600" />
          <StatCard label="Hoàn tất" value={overview?.completedVisits ?? visits.filter(visit => visit.currentState === 'COMPLETED').length} sub="Lượt đã hoàn thành" accent="text-indigo-600" />
          <StatCard label="Phòng báo động" value={warnedRooms.length} sub="WARNING" accent="text-orange-600" />
          <StatCard label="Quá tải" value={overloadedRooms.length} sub="OVERLOAD" accent="text-red-600" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Trạng thái phòng</p>
                  <p className="mt-1 text-xs text-gray-500">Tính từ /rooms và /queue</p>
                </div>
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm phòng, khoa, bác sĩ..."
                    className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredRoomMetrics.length === 0 ? (
                  <EmptyState title="Không có phòng phù hợp" description="Thử thay đổi bộ lọc tìm kiếm." />
                ) : (
                  filteredRoomMetrics.map(room => <RoomCard key={room.id} room={room} />)
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                <Clock3 size={16} className="text-sky-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Hàng đợi đang hoạt động</p>
                  <p className="text-xs text-gray-500">Danh sách lấy từ /queue</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                {waitingQueue.length === 0 ? (
                  <div className="px-5 py-10">
                    <EmptyState title="Chưa có queue item hoạt động" description="Không có bệnh nhân nào đang chờ." />
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Queue</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Lượt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Chờ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitingQueue.slice(0, 8).map(item => (
                        <QueueRow key={item.queueItemId} item={item} />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-sky-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Lượt khám đang xử lý</p>
                  <p className="text-xs text-gray-500">Dữ liệu thật từ /visits</p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                {activeVisits.length === 0 ? (
                  <EmptyState title="Không có lượt đang xử lý" description="Các lượt hoàn tất/hủy sẽ không hiển thị ở đây." />
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Lượt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeVisits.slice(0, 8).map(visit => <VisitRow key={visit.visitId} visit={visit} />)}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">Bộ lọc nhanh</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Phòng hoạt động</p>
                  <p className="mt-1 text-2xl font-black text-gray-800">{rooms.filter(room => room.isActive).length}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Bác sĩ</p>
                  <p className="mt-1 text-2xl font-black text-gray-800">{doctors.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
