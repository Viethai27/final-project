import { useState } from 'react';
import Layout from '../components/layout/Layout';
import DispatchSuggestionPanel from '../components/dispatch/DispatchSuggestionPanel';
import { useHospital } from '../context/HospitalContext';
import StatusBadge from '../components/ui/StatusBadge';
import { PriorityBadge, LaneBadge } from '../components/ui/PriorityBadge';
import { ArrowRightLeft, History } from 'lucide-react';
import type { Visit } from '../types';

export default function DispatchPage() {
  const { visits, queueItems, dispatchHistory, rooms } = useHospital();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Show visits that need dispatch: waiting for exam/CLS
  const dispatchableVisits = visits.filter(v =>
    ['WAITING_EXAM', 'WAITING_CLS', 'IN_EXAM'].includes(v.status) &&
    v.roomId
  );

  const getRoom = (id?: string) => rooms.find(r => r.id === id);

  return (
    <Layout pageTitle="Điều Phối Bệnh Nhân">
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left: Visits to dispatch */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Bệnh Nhân Cần Điều Phối ({dispatchableVisits.length})</h3>
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {dispatchableVisits.map(visit => {
              const room = getRoom(visit.roomId);
              return (
                <button
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit)}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-all hover:shadow-md ${selectedVisit?.id === visit.id ? 'border-sky-400 ring-2 ring-sky-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-sky-600">{visit.ticketNumber}</span>
                        <LaneBadge lane={visit.lane} size="sm" />
                        {visit.priorityReason && <PriorityBadge reason={visit.priorityReason} size="sm" />}
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{visit.patientName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{visit.chiefComplaint}</p>
                      {room && (
                        <p className="text-xs text-gray-400 mt-1">Phòng: {room.name} · {room.currentWaiting} đang chờ</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={visit.status} size="sm" />
                      <p className="text-xs text-gray-400">{visit.checkInTime?.slice(0, 5)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {dispatchableVisits.length === 0 && (
              <div className="text-center py-12 text-sm text-gray-400">
                <ArrowRightLeft size={32} className="mx-auto mb-2 opacity-30" />
                Không có bệnh nhân cần điều phối
              </div>
            )}
          </div>
        </div>

        {/* Right: Dispatch panel + history */}
        <div className="space-y-4">
          {selectedVisit ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft size={16} className="text-sky-600" />
                <h3 className="text-sm font-semibold text-gray-800">Điều Phối: {selectedVisit.patientName}</h3>
              </div>
              <DispatchSuggestionPanel
                visit={selectedVisit}
                targetType={['WAITING_CLS', 'IN_CLS'].includes(selectedVisit.status) ? 'LAB' : 'EXAM'}
                onConfirm={() => setSelectedVisit(null)}
                onCancel={() => setSelectedVisit(null)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
              <ArrowRightLeft size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chọn bệnh nhân để điều phối</p>
            </div>
          )}

          {/* Dispatch history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <History size={14} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Lịch Sử Điều Phối Hôm Nay</h3>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {[...dispatchHistory].reverse().map(d => (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{d.patientName}</p>
                      <p className="text-xs text-gray-500">→ {d.toRoomName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{d.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{d.dispatchedAt.slice(0, 5)}</p>
                      <p className="text-xs text-gray-400">{d.dispatchedByName.split(' ').slice(-1)[0]}</p>
                      {d.followedSuggestion ? (
                        <span className="text-xs text-green-600 font-medium">✓ Theo gợi ý</span>
                      ) : (
                        <span className="text-xs text-gray-400">Thủ công</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
