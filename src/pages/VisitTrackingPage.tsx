import { useState } from 'react';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/ui/StatusBadge';
import VisitTimeline from '../components/patient/VisitTimeline';
import { PriorityBadge, LaneBadge } from '../components/ui/PriorityBadge';
import { useHospital } from '../context/HospitalContext';
import { Search, X, User, Clock } from 'lucide-react';

export default function VisitTrackingPage() {
  const { visits, patients, statusHistory, clsOrders } = useHospital();
  const [query, setQuery] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const getPatient = (pid: string) => patients.find(p => p.id === pid);

  const filteredVisits = visits.filter(v => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      v.ticketNumber.toLowerCase().includes(q) ||
      v.patientName.toLowerCase().includes(q) ||
      (getPatient(v.patientId)?.phone ?? '').includes(q) ||
      (getPatient(v.patientId)?.idNumber ?? '').toLowerCase().includes(q)
    );
  }).slice(0, 20);

  const selectedVisit = visits.find(v => v.id === selectedVisitId);
  const visitHistory = statusHistory.filter(h => h.visitId === selectedVisitId);
  const visitOrders = clsOrders.filter(o => o.visitId === selectedVisitId);

  const STATUS_LABELS: Record<string, string> = {
    WAITING_EXAM: 'Chờ khám',
    IN_EXAM: 'Đang khám',
    WAITING_CLS: 'Chờ CLS',
    IN_CLS: 'Đang CLS',
    WAITING_RESULT: 'Chờ kết quả',
    WAITING_CONCLUSION: 'Chờ kết luận',
    WAITING_PAYMENT: 'Chờ thanh toán',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy',
  };

  return (
    <Layout pageTitle="Theo Dõi Hành Trình Bệnh Nhân">
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left: Search + list */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm theo số thứ tự, tên, SĐT, CCCD..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-400 px-1">{filteredVisits.length} lượt khám</div>

          <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {filteredVisits.map(visit => {
              const patient = getPatient(visit.patientId);
              return (
                <button
                  key={visit.id}
                  onClick={() => setSelectedVisitId(visit.id === selectedVisitId ? null : visit.id)}
                  className={`w-full text-left bg-white rounded-xl border p-3.5 transition-all hover:shadow-sm ${selectedVisitId === visit.id ? 'border-sky-400 ring-2 ring-sky-100' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-sky-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-sky-600">{visit.ticketNumber}</span>
                          <LaneBadge lane={visit.lane} size="sm" />
                          {visit.priorityReason && <PriorityBadge reason={visit.priorityReason} size="sm" />}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">{visit.patientName}</p>
                        <p className="text-xs text-gray-400">{patient?.phone}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={visit.status} size="sm" />
                      <span className="text-xs text-gray-400">{visit.checkInTime?.slice(0, 5)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredVisits.length === 0 && (
              <div className="text-center py-12 text-sm text-gray-400">
                <Search size={32} className="mx-auto mb-2 opacity-30" />
                Không tìm thấy lượt khám nào
              </div>
            )}
          </div>
        </div>

        {/* Right: Visit detail */}
        <div>
          {selectedVisit ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-sky-600">{selectedVisit.ticketNumber}</span>
                      <StatusBadge status={selectedVisit.status} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedVisit.patientName}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedVisit.chiefComplaint}</p>
                  </div>
                  <button
                    onClick={() => setSelectedVisitId(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={12} /> Check-in: {selectedVisit.checkInTime?.slice(0, 5)}</span>
                  <LaneBadge lane={selectedVisit.lane} size="sm" />
                  {selectedVisit.priorityReason && <PriorityBadge reason={selectedVisit.priorityReason} size="sm" />}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Hành Trình Khám</h4>
                <VisitTimeline
                  currentStatus={selectedVisit.status}
                  history={visitHistory}
                  showCLS={visitOrders.length > 0}
                />
              </div>

              {/* CLS orders */}
              {visitOrders.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700">Chỉ Định CLS ({visitOrders.length})</h4>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {visitOrders.map(order => (
                      <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{order.serviceName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{order.roomId}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          order.status === 'IN_PROGRESS' ? 'bg-violet-100 text-violet-700' :
                          order.status === 'PENDING' ? 'bg-gray-100 text-gray-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status === 'COMPLETED' ? 'Hoàn thành' :
                           order.status === 'IN_PROGRESS' ? 'Đang thực hiện' :
                           order.status === 'PENDING' ? 'Chờ thực hiện' : 'Đã giao'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {(selectedVisit.provisionalDiagnosis || selectedVisit.finalDiagnosis) && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Chẩn Đoán</h4>
                  {selectedVisit.provisionalDiagnosis && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Sơ bộ:</p>
                      <p className="text-sm text-gray-800">{selectedVisit.provisionalDiagnosis}</p>
                    </div>
                  )}
                  {selectedVisit.finalDiagnosis && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Kết luận:</p>
                      <p className="text-sm font-medium text-gray-800">{selectedVisit.finalDiagnosis}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-300">
              <Search size={48} className="mb-3" />
              <p className="text-sm text-gray-400">Chọn lượt khám để xem chi tiết hành trình</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
