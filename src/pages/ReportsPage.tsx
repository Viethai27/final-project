import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Search, ShieldAlert, Users } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { ErrorState, EmptyState, LoadingState } from '../components/common/PageState';
import { dashboardApi } from '../services/dashboardApi';
import { visitApi } from '../services/visitApi';
import { queueApi } from '../services/queueApi';
import { doctorApi } from '../services/doctorApi';
import { serviceApi } from '../services/serviceApi';
import { clsApi } from '../services/clsApi';
import { dispatchApi } from '../services/dispatchApi';
import type {
  DashboardOverviewDto,
  DoctorDto,
  DispatchDecisionSummaryDto,
  QueueItemSummaryDto,
  ServiceDto,
  VisitListItemDto,
  CLSOrderSummaryDto,
  CLSResultSummaryDto,
} from '../services/backend-types';
import { formatDateTime } from '../lib/format';
import StatusBadge from '../components/ui/StatusBadge';
import { LaneBadge } from '../components/ui/PriorityBadge';
import type { PatientStatus } from '../types';
import { clsx } from 'clsx';

const VISIT_ACTIVE_STATUSES: PatientStatus[] = [
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

function SimpleTable({
  title,
  description,
  children,
  right,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        {right}
      </div>
      {children}
    </div>
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

function QueueRow({ item }: { item: QueueItemSummaryDto }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/70">
      <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{item.queueNumber}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{item.patient.fullName}</div>
        <div className="text-xs text-gray-400">{item.patient.patientCode}</div>
      </td>
      <td className="px-4 py-3">
        <LaneBadge lane={item.priority.laneType} size="sm" />
      </td>
      <td className="px-4 py-3 text-gray-600">{item.room?.name ?? 'Chưa có'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{item.waitingTimeMinutes} phút</td>
    </tr>
  );
}

function ResultRow({ result }: { result: CLSResultSummaryDto }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/70">
      <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{result.clsResultId}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{result.clsOrder.visit.patient.fullName}</div>
        <div className="text-xs text-gray-400">{result.clsOrder.visit.queueNumber}</div>
      </td>
      <td className="px-4 py-3">
        <span className={clsx(
          'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
          result.clsOrder.status === 'COMPLETED'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : result.clsOrder.status === 'IN_PROGRESS'
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
              : result.clsOrder.status === 'ASSIGNED'
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : result.clsOrder.status === 'CANCELLED'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600',
        )}>
          {result.clsOrder.status}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {result.clsOrder.service?.name ?? 'Chưa có'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{result.isAbnormal ? 'Bất thường' : 'Bình thường'}</td>
    </tr>
  );
}

function DecisionRow({ decision }: { decision: DispatchDecisionSummaryDto }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/70">
      <td className="px-4 py-3 font-mono text-xs font-black text-sky-700">{decision.dispatchDecisionId}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-800">{decision.visit.patient.fullName}</div>
        <div className="text-xs text-gray-400">{decision.visit.queueNumber}</div>
      </td>
      <td className="px-4 py-3 text-gray-600">{decision.outcomeRoom?.name ?? 'Chưa có'}</td>
      <td className="px-4 py-3 text-gray-600">{decision.outcomeDoctor?.name ?? 'Chưa có'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{decision.decisionType}</td>
    </tr>
  );
}

export default function ReportsPage() {
  const [overview, setOverview] = useState<DashboardOverviewDto | null>(null);
  const [visits, setVisits] = useState<VisitListItemDto[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItemSummaryDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [clsOrders, setClsOrders] = useState<CLSOrderSummaryDto[]>([]);
  const [clsResults, setClsResults] = useState<CLSResultSummaryDto[]>([]);
  const [dispatchDecisions, setDispatchDecisions] = useState<DispatchDecisionSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [
          overviewRes,
          visitRes,
          queueRes,
          doctorRes,
          serviceRes,
          clsOrderRes,
          clsResultRes,
          decisionRes,
        ] = await Promise.all([
          dashboardApi.getOverview(),
          visitApi.list({ limit: 200, page: 1, sort: 'desc' }),
          queueApi.list({ limit: 200, page: 1, sort: 'desc' }),
          doctorApi.list({ limit: 200, page: 1, sort: 'desc' }),
          serviceApi.list({ limit: 200, page: 1, sort: 'desc' }),
          clsApi.listOrders({ limit: 200, page: 1, sort: 'desc' }),
          clsApi.listResults({ limit: 200, page: 1, sort: 'desc' }),
          dispatchApi.listDecisions({ limit: 200, page: 1, sort: 'desc' }),
        ]);

        if (!active) return;

        setOverview(overviewRes.data);
        setVisits(visitRes.data);
        setQueueItems(queueRes.data);
        setDoctors(doctorRes.data);
        setServices(serviceRes.data);
        setClsOrders(clsOrderRes.data);
        setClsResults(clsResultRes.data);
        setDispatchDecisions(decisionRes.data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được báo cáo.');
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

  const filteredVisits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visits;
    return visits.filter(visit =>
      [visit.queueNumber, visit.patient.fullName, visit.patient.patientCode, visit.doctor?.name ?? '', visit.room?.name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [search, visits]);

  const activeVisits = visits.filter(visit => VISIT_ACTIVE_STATUSES.includes(visit.currentState as PatientStatus));
  const completedVisits = visits.filter(visit => visit.currentState === 'COMPLETED');
  const waitingVisits = visits.filter(visit => ['WAITING_EXAM', 'WAITING_CLS', 'WAITING_RESULT', 'WAITING_CONCLUSION', 'WAITING_PAYMENT'].includes(visit.currentState));
  const activeQueueCount = queueItems.filter(item => !['DONE', 'CANCELLED'].includes(item.status.currentStatus)).length;

  const visitStatusCounts = useMemo(() => {
    return visits.reduce<Record<string, number>>((acc, visit) => {
      acc[visit.currentState] = (acc[visit.currentState] ?? 0) + 1;
      return acc;
    }, {});
  }, [visits]);

  const clsStatusCounts = useMemo(() => {
    return clsOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [clsOrders]);

  const doctorCounts = useMemo(() => {
    return visits.reduce<Record<string, number>>((acc, visit) => {
      if (!visit.doctor?.name) return acc;
      acc[visit.doctor.name] = (acc[visit.doctor.name] ?? 0) + 1;
      return acc;
    }, {});
  }, [visits]);

  const serviceCounts = useMemo(() => {
    return clsOrders.reduce<Record<string, number>>((acc, order) => {
      const name = order.service?.name ?? 'Không rõ';
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {});
  }, [clsOrders]);

  const topDoctors = useMemo(
    () => Object.entries(doctorCounts).sort((left, right) => right[1] - left[1]).slice(0, 5),
    [doctorCounts],
  );

  const topServices = useMemo(
    () => Object.entries(serviceCounts).sort((left, right) => right[1] - left[1]).slice(0, 5),
    [serviceCounts],
  );

  if (loading) {
    return (
      <Layout pageTitle="Báo Cáo">
        <LoadingState label="Đang tải báo cáo thật từ backend..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="Báo Cáo">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Báo Cáo">
      <div className="space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Báo cáo vận hành</p>
              <p className="text-xs text-gray-500">Dữ liệu tổng hợp từ dashboard, visits, queue, CLS và dispatch</p>
            </div>
            <div className="relative ml-auto min-w-[240px] flex-1 md:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm lượt khám..."
                className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              <Download size={14} />
              Xuất báo cáo
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Tổng lượt khám" value={overview?.totalVisits ?? visits.length} sub="Từ /dashboard/overview" accent="text-sky-600" />
          <StatCard label="Lượt hoàn thành" value={completedVisits.length} sub="COMPLETED" accent="text-emerald-600" />
          <StatCard label="Lượt đang chờ" value={waitingVisits.length} sub="Active visits" accent="text-amber-600" />
          <StatCard label="Hàng đợi hoạt động" value={activeQueueCount} sub="Từ /queue" accent="text-indigo-600" />
          <StatCard label="CLS order" value={clsOrders.length} sub="Orders tổng" accent="text-purple-600" />
          <StatCard label="Dispatch decision" value={dispatchDecisions.length} sub="Từ /dispatch/decisions" accent="text-rose-600" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <SimpleTable
              title="Lượt khám gần đây"
              description={`Đang hiển thị ${filteredVisits.length} lượt khám từ backend`}
              right={<Users className="text-gray-400" size={18} />}
            >
              {filteredVisits.length === 0 ? (
                <div className="px-5 py-10">
                  <EmptyState title="Không có lượt khám phù hợp" description="Thử thay đổi ô tìm kiếm." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Lượt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Tạo lúc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisits.slice(0, 8).map(visit => <VisitRow key={visit.visitId} visit={visit} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </SimpleTable>

            <SimpleTable
              title="Danh sách queue đang hoạt động"
              description={`${activeQueueCount} queue item đang xử lý`}
              right={<ShieldAlert className="text-gray-400" size={18} />}
            >
              {queueItems.length === 0 ? (
                <div className="px-5 py-10">
                  <EmptyState title="Không có queue item" description="Backend hiện không trả về queue nào." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Queue</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Làn</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Chờ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueItems.slice(0, 8).map(item => <QueueRow key={item.queueItemId} item={item} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </SimpleTable>

            <SimpleTable
              title="Kết quả CLS"
              description={`${clsResults.length} kết quả lấy từ backend`}
              right={<FileText className="text-gray-400" size={18} />}
            >
              {clsResults.length === 0 ? (
                <div className="px-5 py-10">
                  <EmptyState title="Chưa có kết quả CLS" description="Không có kết quả để báo cáo." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Result</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Order</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dịch vụ</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Đánh dấu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clsResults.slice(0, 8).map(result => <ResultRow key={result.clsResultId} result={result} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </SimpleTable>
          </div>

          <div className="space-y-4">
            <SimpleTable
              title="Phân bố trạng thái lượt khám"
              description="Tính từ /visits"
              right={<Users className="text-gray-400" size={18} />}
            >
              <div className="grid grid-cols-2 gap-3 p-5">
                {Object.entries(visitStatusCounts)
                  .sort((left, right) => right[1] - left[1])
                  .map(([status, count]) => (
                    <div key={status} className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">{status}</p>
                      <p className="mt-1 text-2xl font-black text-gray-800">{count}</p>
                    </div>
                  ))}
              </div>
            </SimpleTable>

            <SimpleTable
              title="CLS theo trạng thái"
              description="Tính từ /cls/orders"
              right={<FileText className="text-gray-400" size={18} />}
            >
              <div className="grid grid-cols-2 gap-3 p-5">
                {Object.entries(clsStatusCounts)
                  .sort((left, right) => right[1] - left[1])
                  .map(([status, count]) => (
                    <div key={status} className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">{status}</p>
                      <p className="mt-1 text-2xl font-black text-gray-800">{count}</p>
                    </div>
                  ))}
              </div>
            </SimpleTable>

            <SimpleTable
              title="Top bác sĩ"
              description="Đếm từ lượt khám đã tải"
              right={<Users className="text-gray-400" size={18} />}
            >
              {topDoctors.length === 0 ? (
                <div className="px-5 py-10">
                  <EmptyState title="Chưa có bác sĩ" description="Không đủ dữ liệu để thống kê." />
                </div>
              ) : (
                <div className="space-y-2 p-5">
                  {topDoctors.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                      <span className="font-medium text-gray-800">{name}</span>
                      <span className="font-bold text-sky-700">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </SimpleTable>

            <SimpleTable
              title="Top dịch vụ CLS"
              description="Đếm theo service trong CLS orders"
              right={<FileText className="text-gray-400" size={18} />}
            >
              {topServices.length === 0 ? (
                <div className="px-5 py-10">
                  <EmptyState title="Chưa có dịch vụ CLS" description="Không đủ dữ liệu để thống kê." />
                </div>
              ) : (
                <div className="space-y-2 p-5">
                  {topServices.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                      <span className="font-medium text-gray-800">{name}</span>
                      <span className="font-bold text-purple-700">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </SimpleTable>

            <SimpleTable
              title="Dispatch decisions"
              description={`${dispatchDecisions.length} quyết định điều phối`}
              right={<ShieldAlert className="text-gray-400" size={18} />}
            >
              {dispatchDecisions.length === 0 ? (
                <div className="px-5 py-10">
                  <EmptyState title="Chưa có quyết định điều phối" description="Backend hiện chưa có dữ liệu." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Decision</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Phòng</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bác sĩ</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchDecisions.slice(0, 8).map(decision => <DecisionRow key={decision.dispatchDecisionId} decision={decision} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </SimpleTable>
          </div>
        </div>
      </div>
    </Layout>
  );
}
