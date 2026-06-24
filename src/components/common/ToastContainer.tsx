import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDateTime } from '../../lib/format';
import type { ToastNotification } from '../../hooks/useToastNotifications';

const TYPE_STYLES: Record<ToastNotification['type'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-200/60',
  error: 'border-rose-200 bg-rose-50 text-rose-900 shadow-rose-200/60',
  info: 'border-sky-200 bg-sky-50 text-sky-900 shadow-sky-200/60',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 shadow-amber-200/60',
};

const TYPE_LABELS: Record<ToastNotification['type'], string> = {
  success: 'Thành công',
  error: 'Thất bại',
  info: 'Thông tin',
  warning: 'Cảnh báo',
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,380px)] flex-col gap-3">
      {toasts.slice(0, 5).map(toast => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all',
            TYPE_STYLES[toast.type],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide opacity-75">
                {TYPE_LABELS[toast.type]}
              </div>
              <div className="mt-1 text-sm font-semibold">{toast.action}</div>
              <div className="mt-1 text-sm leading-5">{toast.message}</div>
              <div className="mt-2 text-[11px] font-medium opacity-70">
                {formatDateTime(toast.timestamp)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/60 text-black/60 hover:bg-white"
              aria-label="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
