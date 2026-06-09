import { useState } from 'react';
import Layout from '../components/layout/Layout';
import QueueTable from '../components/queue/QueueTable';
import DispatchSuggestionPanel from '../components/dispatch/DispatchSuggestionPanel';
import Modal from '../components/ui/Modal';
import { useHospital } from '../context/HospitalContext';
import { useAuth } from '../context/AuthContext';
import type { QueueItem } from '../types';

export default function QueuePage() {
  const { queueItems, visits, cancelVisit } = useHospital();
  const { user } = useAuth();
  const [dispatchTarget, setDispatchTarget] = useState<QueueItem | null>(null);

  const activeQueue = queueItems.filter(q =>
    !['COMPLETED', 'CANCELLED'].includes(q.status)
  );

  const byLane = {
    PRIORITY: activeQueue.filter(q => q.lane === 'PRIORITY').length,
    APPOINTMENT: activeQueue.filter(q => q.lane === 'APPOINTMENT').length,
    NORMAL: activeQueue.filter(q => q.lane === 'NORMAL').length,
    AFTER_CLS: activeQueue.filter(q => q.lane === 'AFTER_CLS').length,
  };

  const handleCancel = (item: QueueItem) => {
    cancelVisit(item.visitId, 'Hủy từ màn hình hàng đợi', user?.id ?? '', user?.name ?? '');
  };

  const handleDispatch = (item: QueueItem) => {
    setDispatchTarget(item);
  };

  const getVisit = (visitId: string) => visits.find(v => v.id === visitId);

  return (
    <Layout pageTitle="Quản Lý Hàng Đợi">
      <div className="space-y-5">
        {/* Lane summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { lane: 'PRIORITY', label: 'Làn Ưu Tiên', count: byLane.PRIORITY, color: 'border-red-200 bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
            { lane: 'APPOINTMENT', label: 'Làn Đặt Lịch', count: byLane.APPOINTMENT, color: 'border-sky-200 bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-500' },
            { lane: 'AFTER_CLS', label: 'Sau CLS', count: byLane.AFTER_CLS, color: 'border-purple-200 bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
            { lane: 'NORMAL', label: 'Làn Thường', count: byLane.NORMAL, color: 'border-gray-200 bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
          ].map(lane => (
            <div key={lane.lane} className={`border rounded-xl p-4 ${lane.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${lane.dot}`} />
                <p className="text-xs font-semibold text-gray-600">{lane.label}</p>
              </div>
              <p className={`text-3xl font-black ${lane.text}`}>{lane.count}</p>
            </div>
          ))}
        </div>

        {/* Queue table */}
        <QueueTable
          items={activeQueue}
          onDispatch={handleDispatch}
          onCancel={handleCancel}
          title={`Hàng Đợi Tổng — ${activeQueue.length} bệnh nhân`}
        />
      </div>

      {/* Dispatch modal */}
      <Modal
        open={!!dispatchTarget}
        onClose={() => setDispatchTarget(null)}
        title="Điều Phối Bệnh Nhân"
        size="lg"
      >
        {dispatchTarget && (() => {
          const visit = getVisit(dispatchTarget.visitId);
          if (!visit) return null;
          const targetType = ['WAITING_CLS', 'IN_CLS'].includes(visit.status) ? 'LAB' : 'EXAM';
          return (
            <DispatchSuggestionPanel
              visit={visit}
              targetType={targetType as 'EXAM' | 'LAB' | 'IMAGING'}
              onConfirm={() => setDispatchTarget(null)}
              onCancel={() => setDispatchTarget(null)}
            />
          );
        })()}
      </Modal>
    </Layout>
  );
}
