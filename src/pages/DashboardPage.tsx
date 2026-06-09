import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Layout from '../components/layout/Layout';
import DashboardCards from '../components/dashboard/DashboardCards';
import RoomLoadMonitor from '../components/dashboard/RoomLoadMonitor';
import { useHospital } from '../context/HospitalContext';
import { PATIENT_FLOW_CHART_DATA, WAIT_TIME_CHART_DATA, DEPARTMENT_STATS } from '../data/mockData';
import { ArrowRightLeft, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { dashboardStats, rooms, visits, dispatchHistory } = useHospital();
  const [activeTab, setActiveTab] = useState<'flow' | 'wait' | 'dept'>('flow');

  const recentDispatches = [...dispatchHistory].reverse().slice(0, 5);
  const activeVisits = visits.filter(v => !['COMPLETED', 'CANCELLED'].includes(v.status));

  return (
    <Layout pageTitle="Tổng Quan">
      <div className="space-y-5">
        {/* Stats cards */}
        <DashboardCards stats={dashboardStats} />

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Charts - takes 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            {/* Chart tabs */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Biểu Đồ Theo Dõi</h3>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {([['flow','Luồng BN'], ['wait','Thời Gian Chờ'], ['dept','Theo Khoa']] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'flow' && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={PATIENT_FLOW_CHART_DATA}>
                    <defs>
                      <linearGradient id="colorCheckin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="check_in" name="Check-in" stroke="#0ea5e9" fill="url(#colorCheckin)" strokeWidth={2} />
                    <Area type="monotone" dataKey="completed" name="Hoàn tất" stroke="#10b981" fill="url(#colorCompleted)" strokeWidth={2} />
                    <Area type="monotone" dataKey="waiting" name="Đang chờ" stroke="#f59e0b" fill="none" strokeDasharray="4 4" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'wait' && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={WAIT_TIME_CHART_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit=" ph" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_wait" name="TG chờ TB (phút)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avg_service" name="TG khám TB (phút)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'dept' && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={DEPARTMENT_STATS} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={55} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="patients" name="Số BN" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="avgWait" name="Chờ TB (ph)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Active visits summary */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Bệnh Nhân Đang Hoạt Động ({activeVisits.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">STT</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Bệnh Nhân</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Trạng Thái</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeVisits.slice(0, 8).map(visit => (
                      <tr key={visit.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-sky-700 text-xs">{visit.ticketNumber}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800 text-xs">{visit.patientName}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            visit.status === 'IN_EXAM' ? 'bg-indigo-100 text-indigo-700' :
                            visit.status === 'WAITING_EXAM' ? 'bg-blue-100 text-blue-700' :
                            visit.status === 'WAITING_CLS' ? 'bg-purple-100 text-purple-700' :
                            visit.status === 'IN_CLS' ? 'bg-violet-100 text-violet-700' :
                            visit.status === 'WAITING_CONCLUSION' ? 'bg-amber-100 text-amber-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {visit.status === 'WAITING_EXAM' ? 'Chờ khám' :
                             visit.status === 'IN_EXAM' ? 'Đang khám' :
                             visit.status === 'WAITING_CLS' ? 'Chờ CLS' :
                             visit.status === 'IN_CLS' ? 'Đang CLS' :
                             visit.status === 'WAITING_CONCLUSION' ? 'Chờ kết luận' :
                             visit.status === 'WAITING_PAYMENT' ? 'Chờ TT' : visit.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{visit.checkInTime?.slice(0, 5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column - Room monitor + dispatch history */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Tải Phòng Hiện Tại</h3>
              <RoomLoadMonitor rooms={rooms} />
            </div>

            {/* Recent dispatches */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <ArrowRightLeft size={14} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-800">Điều Phối Gần Đây</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {recentDispatches.length === 0 && <p className="px-4 py-4 text-xs text-gray-400">Chưa có điều phối</p>}
                {recentDispatches.map(d => (
                  <div key={d.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{d.patientName}</p>
                        <p className="text-xs text-gray-500">→ {d.toRoomName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs text-gray-400">{d.dispatchedAt.slice(0, 5)}</span>
                        {d.followedSuggestion && (
                          <span className="text-xs text-green-600 font-medium">✓ Theo gợi ý</span>
                        )}
                      </div>
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
