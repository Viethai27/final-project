import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastNotification = {
  id: string;
  timestamp: string;
  type: ToastType;
  action: string;
  message: string;
};

type AddToastInput = Omit<ToastNotification, 'id' | 'timestamp'> & {
  timestamp?: string;
  durationMs?: number;
  technical?: boolean;
};

const MAX_TOASTS = 5;
const DEFAULT_DURATION_MS = 3800;
const ERROR_DURATION_MS = 5200;

const createToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
};

export const getToastMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
};

export function useToastNotifications(initialToasts: ToastNotification[] = []) {
  const [toasts, setToasts] = useState<ToastNotification[]>(initialToasts);
  const timersRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      window.clearTimeout(timer);
    }
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (input: AddToastInput) => {
      if (input.technical) {
        return;
      }

      const id = createToastId();
      const toast: ToastNotification = {
        id,
        timestamp: input.timestamp ?? new Date().toISOString(),
        type: input.type,
        action: normalizeText(input.action, 'Thông báo'),
        message: normalizeText(input.message, 'Không có thông báo chi tiết.'),
      };

      setToasts(current => [toast, ...current].slice(0, MAX_TOASTS));

      const durationMs =
        input.durationMs ?? (input.type === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);
      const timer = window.setTimeout(() => {
        setToasts(current => current.filter(item => item.id !== id));
        timersRef.current.delete(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  return useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearToasts,
    }),
    [addToast, clearToasts, removeToast, toasts],
  );
}
