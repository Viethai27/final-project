import { clsx } from 'clsx';
import { Check, Clock, Circle } from 'lucide-react';
import type { PatientStatus, StatusHistoryEntry } from '../../types';

const ALL_STEPS: { status: PatientStatus; label: string; shortLabel: string }[] = [
  { status: 'WAITING_EXAM', label: 'Tiếp Nhận & Chờ Khám', shortLabel: 'Chờ Khám' },
  { status: 'IN_EXAM', label: 'Đang Khám', shortLabel: 'Đang Khám' },
  { status: 'WAITING_CLS', label: 'Chờ Cận Lâm Sàng', shortLabel: 'Chờ CLS' },
  { status: 'IN_CLS', label: 'Đang Thực Hiện CLS', shortLabel: 'Đang CLS' },
  { status: 'WAITING_RESULT', label: 'Chờ Kết Quả', shortLabel: 'Chờ KQ' },
  { status: 'WAITING_CONCLUSION', label: 'Chờ Kết Luận', shortLabel: 'Chờ KL' },
  { status: 'WAITING_PAYMENT', label: 'Chờ Thanh Toán', shortLabel: 'Thanh Toán' },
  { status: 'COMPLETED', label: 'Hoàn Tất', shortLabel: 'Hoàn Tất' },
];

const STATUS_ORDER: PatientStatus[] = [
  'WAITING_EXAM', 'IN_EXAM', 'WAITING_CLS', 'IN_CLS',
  'WAITING_RESULT', 'WAITING_CONCLUSION', 'WAITING_PAYMENT', 'COMPLETED',
];

function getStepState(stepStatus: PatientStatus, currentStatus: PatientStatus): 'done' | 'active' | 'pending' {
  const stepIdx = STATUS_ORDER.indexOf(stepStatus);
  const currIdx = STATUS_ORDER.indexOf(currentStatus);
  if (stepIdx < currIdx) return 'done';
  if (stepIdx === currIdx) return 'active';
  return 'pending';
}

interface VisitTimelineProps {
  currentStatus: PatientStatus;
  history?: StatusHistoryEntry[];
  compact?: boolean;
  showCLS?: boolean;
}

export default function VisitTimeline({ currentStatus, history = [], compact = false, showCLS = true }: VisitTimelineProps) {
  const steps = showCLS ? ALL_STEPS : ALL_STEPS.filter(s =>
    !['WAITING_CLS', 'IN_CLS', 'WAITING_RESULT', 'WAITING_CONCLUSION'].includes(s.status)
  );

  const getHistoryEntry = (status: PatientStatus) =>
    history.find(h => h.toStatus === status);

  if (compact) {
    // Horizontal compact version
    const activeIdx = STATUS_ORDER.indexOf(currentStatus);
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const state = getStepState(step.status, currentStatus);
          return (
            <div key={step.status} className="flex items-center gap-1 flex-shrink-0">
              <div className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                state === 'done' && 'bg-green-100 text-green-700',
                state === 'active' && 'bg-sky-600 text-white',
                state === 'pending' && 'bg-gray-100 text-gray-400'
              )}>
                {state === 'done' ? <Check size={10} /> : state === 'active' ? <Clock size={10} className="animate-pulse" /> : <Circle size={10} />}
                {step.shortLabel}
              </div>
              {i < steps.length - 1 && (
                <div className={clsx('w-3 h-px', state === 'done' ? 'bg-green-400' : 'bg-gray-200')} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full vertical timeline
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const state = getStepState(step.status, currentStatus);
        const entry = getHistoryEntry(step.status);
        const isLast = i === steps.length - 1;

        return (
          <div key={step.status} className="flex gap-4">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-2',
                state === 'done' && 'bg-green-500 ring-green-100 text-white',
                state === 'active' && 'bg-sky-600 ring-sky-100 text-white',
                state === 'pending' && 'bg-white ring-gray-200 text-gray-300'
              )}>
                {state === 'done' ? <Check size={14} /> : state === 'active' ? <Clock size={14} className="animate-pulse" /> : <Circle size={14} />}
              </div>
              {!isLast && (
                <div className={clsx('w-0.5 flex-1 min-h-[24px]', state === 'done' ? 'bg-green-300' : 'bg-gray-200')} />
              )}
            </div>

            {/* Content */}
            <div className={clsx('flex-1 pb-4', isLast && 'pb-0')}>
              <div className="flex items-start justify-between gap-2">
                <p className={clsx(
                  'text-sm font-semibold leading-none',
                  state === 'active' && 'text-sky-700',
                  state === 'done' && 'text-gray-700',
                  state === 'pending' && 'text-gray-400'
                )}>
                  {step.label}
                  {state === 'active' && <span className="ml-2 text-xs font-normal text-sky-500">← Đang ở đây</span>}
                </p>
                {entry && (
                  <span className="text-xs text-gray-400 flex-shrink-0">{entry.timestamp.slice(0, 5)}</span>
                )}
              </div>
              {entry && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-gray-500">Thực hiện bởi: <span className="font-medium">{entry.performedByName}</span></p>
                  {entry.note && <p className="text-xs text-gray-400 italic">{entry.note}</p>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
