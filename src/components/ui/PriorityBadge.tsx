import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Accessibility, Award, Baby, Clock, HeartPulse, Siren } from 'lucide-react';
import type { PriorityReason, QueueLane, RoomLoadLevel } from '../../types';

type BadgeConfig = {
  label: string;
  className: string;
  icon?: ReactNode;
  dot?: string;
};

const PRIORITY_CONFIG: Record<string, BadgeConfig> = {
  CHILD_UNDER_6: { label: 'Trẻ em < 6 tuổi', className: 'bg-pink-100 text-pink-700 border-pink-200', icon: <Baby size={11} /> },
  PREGNANT: { label: 'Phụ nữ có thai', className: 'bg-rose-100 text-rose-700 border-rose-200', icon: <HeartPulse size={11} /> },
  DISABLED: { label: 'Người khuyết tật', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Accessibility size={11} /> },
  HEAVY_DISABLED: { label: 'Khuyết tật nặng', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Accessibility size={11} /> },
  ELDERLY_75PLUS: { label: 'Người >= 75 tuổi', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={11} /> },
  VETERAN: { label: 'Người có công', className: 'bg-red-100 text-red-700 border-red-200', icon: <Award size={11} /> },
  REVOLUTIONARY_CONTRIBUTOR: { label: 'Người có công', className: 'bg-red-100 text-red-700 border-red-200', icon: <Award size={11} /> },
  APPOINTMENT: { label: 'Có lịch hẹn', className: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Clock size={11} /> },
  AFTER_CLS: { label: 'Quay lại sau CLS', className: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Clock size={11} /> },
  OTHER: { label: 'Ưu tiên khác', className: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Clock size={11} /> },
  EMERGENCY: { label: 'Cấp cứu', className: 'bg-red-600 text-white border-red-600 animate-pulse', icon: <Siren size={11} /> },
};

const UNKNOWN_PRIORITY_CONFIG: BadgeConfig = {
  label: 'Ưu tiên khác',
  className: 'bg-gray-100 text-gray-600 border-gray-200',
  icon: <Clock size={11} />,
};

const LANE_CONFIG: Record<QueueLane, BadgeConfig> = {
  APPOINTMENT: { label: 'Đặt lịch', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  PRIORITY: { label: 'Ưu tiên', className: 'bg-red-100 text-red-700 border-red-200' },
  NORMAL: { label: 'Thường', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  AFTER_CLS: { label: 'Sau CLS', className: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const UNKNOWN_LANE_CONFIG: BadgeConfig = {
  label: 'Khác',
  className: 'bg-gray-100 text-gray-600 border-gray-200',
};

const LOAD_CONFIG: Record<RoomLoadLevel, BadgeConfig> = {
  NORMAL: { label: 'Bình thường', className: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  WARNING: { label: 'Cảnh báo', className: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  OVERLOAD: { label: 'Quá tải', className: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500 animate-pulse' },
};

const UNKNOWN_LOAD_CONFIG: BadgeConfig = {
  label: 'Không rõ',
  className: 'bg-gray-100 text-gray-600 border-gray-200',
  dot: 'bg-gray-400',
};

interface PriorityBadgeProps {
  reason: PriorityReason | string;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ reason, size = 'md' }: PriorityBadgeProps) {
  if (!reason) return null;
  const config = PRIORITY_CONFIG[reason] ?? UNKNOWN_PRIORITY_CONFIG;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs',
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

interface LaneBadgeProps {
  lane: QueueLane | string;
  size?: 'sm' | 'md';
}

export function LaneBadge({ lane, size = 'md' }: LaneBadgeProps) {
  const config = LANE_CONFIG[lane as QueueLane] ?? UNKNOWN_LANE_CONFIG;

  return (
    <span
      className={clsx(
        'inline-flex items-center border rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

interface LoadBadgeProps {
  level: RoomLoadLevel | string;
}

export function LoadBadge({ level }: LoadBadgeProps) {
  const config = LOAD_CONFIG[level as RoomLoadLevel] ?? UNKNOWN_LOAD_CONFIG;

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-full font-semibold', config.className)}>
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  );
}

export { PRIORITY_CONFIG, LANE_CONFIG, LOAD_CONFIG };
