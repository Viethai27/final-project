import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import Layout from '../components/layout/Layout';
import { useHospital } from '../context/HospitalContext';
import { PATIENT_FLOW_CHART_DATA, WAIT_TIME_CHART_DATA, DEPARTMENT_STATS } from '../data/mockData';
import { Download, Filter, Calendar } from 'lucide-react';

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const { visits, rooms, clsOrders, dashboardStats } = useHospital();

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState<'flow' | 'wait' | 'dept' | 'cls'>('flow');

  const completedVisits = visits.filter(v => v.status === 'COMPLETED');
  const cancelledVisits = visits.filter(v => v.status === 'CANCELLED');

  // CLS stats
  const completedOrders = clsOrders.filter(o => o.status === 'COMPLETED');
  const pendingOrders = clsOrders.filter(o => o.status === 'PENDING');
  const inProgressOrders = clsOrders.filter(o => o.status === 'IN_PROGRESS');

  // Room type distribution
  const roomTypeCounts = [
    { name: 'Phòng khám', value: rooms.filter(r => r.type === 'EXAM').length },
    { name: 'Xét nghiệm', value: rooms.filter(r => r.type === 'LAB').length },
    { name: 'Chẩn đoán hình ảnh', value: rooms.filter(r => r.type === 'IMAGING').length },
  ];

  // Load distribution
  const loadDist = [
    { name: 'Bình thường', value: rooms.filter(r => r.loadLevel === 'NORMAL').length, fill: '#10b981' },
    { name: 'Cảnh báo', value: rooms.filter(r => r.loadLevel === 'WARNING').length, fill: '#f59e0b' },
    { name: 'Quá tải', value: rooms.filter(r => r.loadLevel === 'OVERLOAD').length, fill: '#ef4444' },
  ];

  const statusPieData = [
    { name: 'Hoàn tất', value: completedVisits.length },
    { name: 'Đang khám', value: visits.filter(v => ['IN_EXAM', 'WAITING_EXAM'].includes(v.status)).length },
    { name: 'Đang CLS', value: visits.filter(v => ['IN_CLS', 'WAITING_CLS', 'WAITING_CONCLUSION'].includes(v.status)).length },
    { name: 'Chờ TT', value: visits.filter(v => v.status === 'WAITING_PAYMENT').length },
    { name: 'Đã hủy', value: cancelledVisits.length },
  ];

  const KPI_DATA = [
    { label: 'Tổng lượt khám', value: visits.length, sub: 'Hôm nay', color: 'text-sky-600' },
    { label: 'Hoàn tất', value: completedVisits.length, sub: `${Math.round((completedVisits.length / Math.max(visits.length, 1)) * 100)}% tổng số`, color: 'text-green-600' },
    { label: 'TG chờ TB', value: `${dashboardStats.avgWaitMinutes}ph`, sub: 'Toàn bệnh viện', color: dashboardStats.avgWaitMinutes > 45 ? 'text-red-600' : 'text-sky-600' },
    { label: 'Chỉ định CLS', value: clsOrders.length, sub: `${completedOrders.length} hoàn thành`, color: 'text-purple-600' },
    { label: 'Điều phối hôm nay', value: dashboardStats.dispatchCount, sub: 'Số lần điều chuyển', color: 'text-indigo-600' },
    { label: 'Phòng quá tải', value: dashboardStats.overloadedRooms, sub: `/ ${rooms.length} phòng`, color: dashboardStats.overloadedRooms > 0 ? 'text-red-600' : 'text-green-600' },
  ];

  return (
    <Layout pageTitle="Báo Cáo & Thống Kê">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {([['today', 'Hôm nay'], ['week', '7 ngày'], ['month', '30 ngày']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setDateRange(val)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${dateRange === val ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button className="ml-auto flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700">
            <Download size={14} />
            Xuất Báo Cáo
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {KPI_DATA.map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">{kpi.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            ['flow', 'Luồng BN'],
            ['wait', 'Thời Gian'],
            ['dept', 'Theo Khoa'],
            ['cls', 'CLS & Trạng Thái'],
          ] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Main chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            {activeTab === 'flow' && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Luồng Bệnh Nhân Theo Giờ</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={PATIENT_FLOW_CHART_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="check_in" name="Check-in" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completed" name="Hoàn tất" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="waiting" name="Đang chờ" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}

            {activeTab === 'wait' && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Thời Gian Chờ & Khám Theo Ngày</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={WAIT_TIME_CHART_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit=" ph" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_wait" name="TG chờ TB" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avg_service" name="TG khám TB" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="max_wait" name="TG chờ max" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}

            {activeTab === 'dept' && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Thống Kê Theo Khoa</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={DEPARTMENT_STATS} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={60} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="patients" name="Số BN" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="avgWait" name="Chờ TB (ph)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}

            {activeTab === 'cls' && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Trạng Thái CLS</h3>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Chờ thực hiện', count: pendingOrders.length, color: 'text-gray-600' },
                    { label: 'Đang thực hiện', count: inProgressOrders.length, color: 'text-violet-600' },
                    { label: 'Hoàn thành', count: completedOrders.length, color: 'text-green-600' },
                  ].map(item => (
                    <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Xét nghiệm', pending: 3, inProgress: 2, completed: 4 },
                    { name: 'Hình ảnh', pending: 2, inProgress: 1, completed: 3 },
                    { name: 'Điện tim', pending: 1, inProgress: 0, completed: 1 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pending" name="Chờ" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" name="Đang làm" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="completed" name="Xong" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Side charts */}
          <div className="space-y-4">
            {/* Status pie */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Phân Bố Trạng Thái</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {statusPieData.filter(d => d.value > 0).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Load distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tình Trạng Phòng</h3>
              <div className="space-y-2">
                {loadDist.map(item => (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                      {item.name}
                    </div>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: item.fill, width: `${(item.value / rooms.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-4 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top rooms by waiting */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Phòng Đông Nhất</h3>
              <div className="space-y-2">
                {[...rooms].sort((a, b) => b.currentWaiting - a.currentWaiting).slice(0, 5).map(room => (
                  <div key={room.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-600 flex-1 truncate">{room.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${room.loadLevel === 'OVERLOAD' ? 'bg-red-500' : room.loadLevel === 'WARNING' ? 'bg-amber-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(100, (room.currentWaiting / room.capacity) * 100)}%` }} />
                      </div>
                      <span className="font-semibold text-gray-700 w-8 text-right">{room.currentWaiting}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
