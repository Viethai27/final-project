import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { LoadBadge } from '../components/ui/PriorityBadge';
import { useHospital } from '../context/HospitalContext';
import type { Room, RoomLoadLevel } from '../types';
import { AlertTriangle, LayoutGrid, List, RefreshCw } from 'lucide-react';

const ROOM_TYPE_LABEL: Record<string, string> = { EXAM: 'Khám', LAB: 'Xét nghiệm', IMAGING: 'Chẩn đoán hình ảnh' };
const ROOM_TYPE_COLOR: Record<string, string> = { EXAM: 'bg-sky-100 text-sky-700', LAB: 'bg-purple-100 text-purple-700', IMAGING: 'bg-indigo-100 text-indigo-700' };

function RoomCard({ room }: { room: Room }) {
  const utilPct = room.capacity > 0 ? Math.min(100, Math.round((room.currentWaiting / room.capacity) * 100)) : 0;
  const barColor = room.loadLevel === 'OVERLOAD' ? 'bg-red-500' : room.loadLevel === 'WARNING' ? 'bg-amber-400' : 'bg-green-400';

  return (
    <div className={`bg-white rounded-xl border p-4 ${room.loadLevel === 'OVERLOAD' ? 'border-red-300 shadow-sm' : room.loadLevel === 'WARNING' ? 'border-amber-200' : 'border-gray-200'}`}>
      {room.loadLevel === 'OVERLOAD' && (
        <div className="flex items-center gap-1 text-red-600 text-xs font-semibold mb-2">
          <AlertTriangle size={12} />
          Quá tải
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">{room.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${ROOM_TYPE_COLOR[room.type]}`}>
              {ROOM_TYPE_LABEL[room.type]}
            </span>
            <LoadBadge level={room.loadLevel} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-gray-800">{room.currentWaiting}</p>
          <p className="text-xs text-gray-400">/ {room.capacity}</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Sử dụng</span>
          <span className={room.loadLevel === 'OVERLOAD' ? 'text-red-600 font-semibold' : ''}>{utilPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${utilPct}%` }} />
        </div>
      </div>
      {room.avgWaitMinutes > 0 && (
        <p className="text-xs text-gray-400 mt-2">Chờ TB: {room.avgWaitMinutes} phút</p>
      )}
      {room.doctorId && (
        <p className="text-xs text-gray-500 mt-1 truncate">BS ID: {room.doctorId}</p>
      )}
    </div>
  );
}

export default function MonitoringPage() {
  const { rooms } = useHospital();
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXAM' | 'LAB' | 'IMAGING'>('ALL');
  const [loadFilter, setLoadFilter] = useState<'ALL' | RoomLoadLevel>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredRooms = rooms
    .filter(r => typeFilter === 'ALL' || r.type === typeFilter)
    .filter(r => loadFilter === 'ALL' || r.loadLevel === loadFilter)
    .sort((a, b) => {
      const ORDER = { OVERLOAD: 0, WARNING: 1, NORMAL: 2 };
      return ORDER[a.loadLevel] - ORDER[b.loadLevel];
    });

  const overloaded = rooms.filter(r => r.loadLevel === 'OVERLOAD');
  const warned = rooms.filter(r => r.loadLevel === 'WARNING');
  const totalWaiting = rooms.reduce((s, r) => s + r.currentWaiting, 0);

  return (
    <Layout pageTitle="Giám Sát Phòng Khám">
      <div className="space-y-5">
        {/* Alert banner */}
        {overloaded.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {overloaded.length} phòng đang quá tải!
              </p>
              <p className="text-xs text-red-500 mt-1">
                {overloaded.map(r => r.name).join(', ')} — Cần điều phối ngay.
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng phòng', value: rooms.length, color: 'text-gray-800' },
            { label: 'Quá tải', value: overloaded.length, color: 'text-red-600' },
            { label: 'Cảnh báo', value: warned.length, color: 'text-amber-600' },
            { label: 'Tổng đang chờ', value: totalWaiting, color: 'text-sky-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Loại:</span>
            <div className="flex gap-1">
              {(['ALL', 'EXAM', 'LAB', 'IMAGING'] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${typeFilter === t ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t === 'ALL' ? 'Tất cả' : ROOM_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Tải:</span>
            <div className="flex gap-1">
              {(['ALL', 'OVERLOAD', 'WARNING', 'NORMAL'] as const).map(l => (
                <button key={l} onClick={() => setLoadFilter(l)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${loadFilter === l ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {l === 'ALL' ? 'Tất cả' : l === 'OVERLOAD' ? 'Quá tải' : l === 'WARNING' ? 'Cảnh báo' : 'Bình thường'}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Rooms */}
        {viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredRooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phòng</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Loại</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Đang chờ</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sức chứa</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Chờ TB</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tải</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map(room => (
                  <tr key={room.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{room.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${ROOM_TYPE_COLOR[room.type]}`}>
                        {ROOM_TYPE_LABEL[room.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800">{room.currentWaiting}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{room.capacity}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{room.avgWaitMinutes} ph</td>
                    <td className="px-4 py-3 text-center">
                      <LoadBadge level={room.loadLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
