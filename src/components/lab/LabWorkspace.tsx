import { useState } from 'react';
import { Phone, CheckCircle, AlertTriangle, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';
import type { CLSOrder } from '../../types';
import { PriorityBadge } from '../ui/PriorityBadge';
import Modal from '../ui/Modal';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';

interface LabWorkspaceProps {
  roomId?: string;
}

export default function LabWorkspace({ roomId }: LabWorkspaceProps) {
  const { clsOrders, clsResults, updateCLSStatus, saveCLSResult } = useHospital();
  const { user } = useAuth();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultText, setResultText] = useState('');
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [resultNote, setResultNote] = useState('');
  const [filter, setFilter] = useState<'ALL' | CLSOrder['status']>('ALL');

  const labOrders = clsOrders
    .filter(o => !roomId || o.roomId === roomId)
    .filter(o => o.status !== 'CANCELLED')
    .filter(o => filter === 'ALL' || o.status === filter);

  const selectedOrder = selectedOrderId ? clsOrders.find(o => o.id === selectedOrderId) : null;

  const handleCall = (orderId: string) => {
    setSelectedOrderId(orderId);
    updateCLSStatus(orderId, 'IN_PROGRESS');
  };

  const handleOpenResult = (order: CLSOrder) => {
    setSelectedOrderId(order.id);
    setResultText('');
    setIsAbnormal(false);
    setResultNote('');
    setShowResultModal(true);
  };

  const handleSaveResult = () => {
    if (!selectedOrder || !resultText) return;
    saveCLSResult(selectedOrder.id, selectedOrder.visitId, resultText, isAbnormal, user?.id ?? 'lab', resultNote);
    setShowResultModal(false);
    setResultText('');
    setIsAbnormal(false);
    setResultNote('');
  };

  const getResult = (orderId: string) => clsResults.find(r => r.orderId === orderId);

  const STATUS_COLORS: Record<CLSOrder['status'], string> = {
    PENDING:    'bg-gray-100 text-gray-600',
    ASSIGNED:   'bg-blue-100 text-blue-700',
    IN_PROGRESS:'bg-indigo-100 text-indigo-700',
    COMPLETED:  'bg-green-100 text-green-700',
    CANCELLED:  'bg-red-100 text-red-500',
  };

  const STATUS_LABELS: Record<CLSOrder['status'], string> = {
    PENDING:    'Chờ',
    ASSIGNED:   'Đã phân công',
    IN_PROGRESS:'Đang thực hiện',
    COMPLETED:  'Hoàn tất',
    CANCELLED:  'Đã hủy',
  };

  const counts = {
    PENDING: clsOrders.filter(o => o.status === 'PENDING').length,
    ASSIGNED: clsOrders.filter(o => o.status === 'ASSIGNED').length,
    IN_PROGRESS: clsOrders.filter(o => o.status === 'IN_PROGRESS').length,
    COMPLETED: clsOrders.filter(o => o.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{STATUS_LABELS[status as CLSOrder['status']]}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {f === 'ALL' ? 'Tất cả' : STATUS_LABELS[f]}
            {f !== 'ALL' && <span className="ml-1 opacity-70">({counts[f as keyof typeof counts] ?? 0})</span>}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Danh Sách Chỉ Định CLS ({labOrders.length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {labOrders.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              <FlaskConical size={32} className="mx-auto mb-2 opacity-30" />
              Không có chỉ định CLS
            </div>
          )}
          {labOrders.map(order => {
            const result = getResult(order.id);
            return (
              <div
                key={order.id}
                className={clsx(
                  'px-4 py-3 hover:bg-gray-50/70 transition-colors',
                  order.priority === 'URGENT' && 'border-l-2 border-red-400'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{order.patientName}</p>
                      {order.priority === 'URGENT' && (
                        <span className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full font-semibold">
                          <AlertTriangle size={10} />Khẩn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{order.serviceName}</p>
                    {order.clinicalNote && (
                      <p className="text-xs text-gray-400 italic mt-0.5">"{order.clinicalNote}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">Chỉ định lúc {order.orderedAt.slice(0, 5)}</p>
                    {result && (
                      <div className={clsx(
                        'mt-2 p-2 rounded-lg text-xs',
                        result.isAbnormal ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      )}>
                        {result.isAbnormal && '⚠ '}{result.result.slice(0, 100)}{result.result.length > 100 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[order.status])}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <div className="flex gap-1">
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => handleCall(order.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-sky-600 text-white rounded-lg text-xs hover:bg-sky-700"
                        >
                          <Phone size={11} />
                          Gọi
                        </button>
                      )}
                      {(order.status === 'IN_PROGRESS' || order.status === 'ASSIGNED') && !result && (
                        <button
                          onClick={() => handleOpenResult(order)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                        >
                          <CheckCircle size={11} />
                          Nhập KQ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result Modal */}
      <Modal
        open={showResultModal}
        onClose={() => setShowResultModal(false)}
        title={`Nhập Kết Quả: ${selectedOrder?.serviceName}`}
        size="md"
        footer={
          <>
            <button onClick={() => setShowResultModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleSaveResult}
              disabled={!resultText}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Lưu Kết Quả
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedOrder && (
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-medium text-gray-800">{selectedOrder.patientName}</p>
              <p className="text-gray-500 text-xs mt-0.5">{selectedOrder.serviceName} · {selectedOrder.priority === 'URGENT' ? '🔴 Khẩn' : '🔵 Thường'}</p>
              {selectedOrder.clinicalNote && <p className="text-xs text-gray-400 italic mt-1">"{selectedOrder.clinicalNote}"</p>}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kết quả *</label>
            <textarea
              value={resultText}
              onChange={e => setResultText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Nhập kết quả xét nghiệm / chẩn đoán hình ảnh..."
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAbnormal}
                onChange={e => setIsAbnormal(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span className="text-sm font-medium text-red-700">Đánh dấu kết quả bất thường</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú thêm</label>
            <input
              type="text"
              value={resultNote}
              onChange={e => setResultNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Ghi chú cho bác sĩ..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
