import { useState } from 'react';
import { CheckCircle, Users, Clock, Zap, AlertTriangle, ThumbsUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { Room, Visit } from '../../types';
import { LoadBadge } from '../ui/PriorityBadge';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';

interface SuggestedRoom extends Room {
  suggestionScore: number;
  reasons: string[];
  isRecommended: boolean;
}

function scoreRoom(room: Room, targetType: Room['type']): SuggestedRoom {
  let score = 100;
  const reasons: string[] = [];

  // Penalize by load level
  if (room.loadLevel === 'OVERLOAD') { score -= 50; }
  else if (room.loadLevel === 'WARNING') { score -= 20; }
  else { reasons.push('Phòng ít tải hơn'); }

  // Penalize by wait time
  if (room.avgWaitMinutes > 60) { score -= 30; reasons.push('⚠ Thời gian chờ dài'); }
  else if (room.avgWaitMinutes <= 20) { score += 10; reasons.push('Thời gian chờ ngắn'); }

  // Penalize by current waiting
  score -= room.currentWaiting * 3;
  if (room.currentWaiting <= 3) reasons.push('Hàng đợi ngắn');

  // Type match bonus
  if (room.type === targetType) { score += 15; reasons.push('Phù hợp dịch vụ'); }

  // Status
  if (room.status !== 'ACTIVE') score = -999;

  return { ...room, suggestionScore: Math.max(0, score), reasons, isRecommended: false };
}

interface DispatchSuggestionPanelProps {
  visit: Visit;
  targetType?: Room['type'];
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function DispatchSuggestionPanel({ visit, targetType = 'EXAM', onConfirm, onCancel }: DispatchSuggestionPanelProps) {
  const { rooms, dispatchPatient } = useHospital();
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const eligibleRooms: SuggestedRoom[] = rooms
    .filter(r => r.type === targetType && r.status === 'ACTIVE')
    .map(r => scoreRoom(r, targetType))
    .sort((a, b) => b.suggestionScore - a.suggestionScore)
    .map((r, i) => ({ ...r, isRecommended: i === 0 }));

  const displayedRooms = showAll ? eligibleRooms : eligibleRooms.slice(0, 4);
  const recommended = eligibleRooms[0];

  const handleDispatch = () => {
    if (!selectedRoomId || !user) return;
    const followedSuggestion = selectedRoomId === recommended?.id;
    setDispatching(true);
    setTimeout(() => {
      dispatchPatient(
        visit.id,
        selectedRoomId,
        followedSuggestion,
        reason || 'Điều phối thủ công',
        user.id,
        user.name
      );
      setDispatching(false);
      onConfirm?.();
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Visit summary */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-xs text-slate-500 font-medium">Bệnh nhân cần điều phối</p>
        <p className="font-semibold text-sm text-slate-800 mt-0.5">{visit.patientName}</p>
        <p className="text-xs text-slate-500">{visit.ticketNumber} · {visit.chiefComplaint}</p>
      </div>

      {/* Room list */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Phòng {targetType === 'EXAM' ? 'Khám' : targetType === 'LAB' ? 'Xét Nghiệm' : 'Chẩn Đoán Hình Ảnh'} Khả Dụng
        </p>
        <div className="space-y-2">
          {displayedRooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={clsx(
                'w-full text-left p-3 rounded-xl border transition-all',
                selectedRoomId === room.id
                  ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
                  : room.isRecommended
                  ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {/* Selected indicator */}
                  <div className={clsx(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                    selectedRoomId === room.id ? 'border-sky-500 bg-sky-500' : 'border-gray-300'
                  )}>
                    {selectedRoomId === room.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{room.name}</span>
                      {room.isRecommended && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <ThumbsUp size={10} />
                          Gợi ý
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{room.department} · Tầng {room.floor || 1}</p>
                    {/* Reasons */}
                    {room.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {room.reasons.map((r, i) => (
                          <span key={i} className={clsx(
                            'text-xs px-1.5 py-0.5 rounded-full',
                            r.startsWith('⚠') ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          )}>{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <LoadBadge level={room.loadLevel} />
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Users size={10} />{room.currentWaiting}
                    <Clock size={10} className="ml-1" />~{room.avgWaitMinutes} ph
                  </div>
                  <div className={clsx('text-xs font-bold', room.suggestionScore >= 70 ? 'text-emerald-600' : room.suggestionScore >= 40 ? 'text-amber-600' : 'text-red-500')}>
                    Điểm: {room.suggestionScore}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {eligibleRooms.length > 4 && (
          <button onClick={() => setShowAll(!showAll)} className="mt-2 w-full text-xs text-sky-600 hover:text-sky-700 font-medium py-1">
            {showAll ? 'Thu gọn' : `Xem thêm ${eligibleRooms.length - 4} phòng`}
          </button>
        )}
        {eligibleRooms.length === 0 && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle size={16} />
            Không tìm thấy phòng phù hợp. Vui lòng liên hệ quản lý.
          </div>
        )}
      </div>

      {/* Reason input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú điều phối</label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Lý do điều phối (tùy chọn)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
        )}
        <button
          onClick={handleDispatch}
          disabled={!selectedRoomId || dispatching}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {dispatching ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang xử lý...</>
          ) : (
            <><CheckCircle size={15} />Xác Nhận Điều Phối</>
          )}
        </button>
      </div>
    </div>
  );
}
