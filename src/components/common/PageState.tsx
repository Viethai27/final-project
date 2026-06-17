import { AlertCircle, Loader2 } from 'lucide-react';
import type { ApiPagination } from '../../services/backend-types';

export function LoadingState({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
      <Loader2 className="mx-auto mb-3 animate-spin text-sky-600" size={24} />
      {label}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <AlertCircle className="mx-auto mb-3 text-red-600" size={24} />
      <p className="mx-auto max-w-2xl whitespace-pre-wrap text-sm font-semibold leading-6 text-red-700">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
  );
}

export function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination?: ApiPagination | null;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, index) => {
    const base = Math.max(1, pagination.page - 2);
    return Math.min(pagination.totalPages, base + index);
  });

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">
        Trang {pagination.page} / {pagination.totalPages} - {pagination.total} bản ghi
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trước
        </button>
        {pages.map(page => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              page === pagination.page
                ? 'bg-sky-600 text-white'
                : 'border border-gray-200 text-gray-600'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
          disabled={pagination.page >= pagination.totalPages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
