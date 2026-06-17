import { clsx } from 'clsx';
import type { PatientStatus } from '../../types';

const STATUS_CONFIG: Record<PatientStatus, { label: string; className: string }> = {
  WAITING_EXAM: { label: 'Chờ khám', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  IN_EXAM: { label: 'Đang khám', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  WAITING_CLS: { label: 'Chờ CLS', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  IN_CLS: { label: 'Đang CLS', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  WAITING_RESULT: { label: 'Chờ kết quả', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  WAITING_CONCLUSION: { label: 'Chờ kết luận', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  IN_CONCLUSION: { label: 'Đang kết luận', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  WAITING_PAYMENT: { label: 'Chờ thanh toán', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  COMPLETED: { label: 'Hoàn tất', className: 'bg-green-100 text-green-700 border-green-200' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const UNKNOWN_STATUS_CONFIG = {
  label: 'Khác',
  className: 'bg-gray-100 text-gray-500 border-gray-200',
};

interface StatusBadgeProps {
  status: PatientStatus | string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export default function StatusBadge({ status, size = 'md', dot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as PatientStatus] ?? UNKNOWN_STATUS_CONFIG;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 border rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        config.className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />}
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
