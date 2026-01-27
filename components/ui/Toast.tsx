"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type ToastData = {
  id: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastContextValue = {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Toast store provider for managing UI notifications.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timeoutMap = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeout = timeoutMap.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutMap.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { ...toast, id }]);
      const duration = toast.duration ?? 5000;
      timeoutMap.current.set(
        id,
        setTimeout(() => {
          dismissToast(id);
        }, duration)
      );
      return id;
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ toasts, addToast, dismissToast }), [addToast, dismissToast, toasts]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * Hook to access toast actions and state.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}

export type ToastViewportProps = {
  toasts?: ToastData[];
  onDismiss?: (id: string) => void;
};

/**
 * Toast viewport for stacking notifications.
 */
export function ToastViewport({ toasts: toastsProp, onDismiss }: ToastViewportProps) {
  const context = useContext(ToastContext);
  const toasts = toastsProp ?? context?.toasts ?? [];
  const dismiss = onDismiss ?? context?.dismissToast ?? (() => undefined);

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-3 sm:inset-auto sm:right-4 sm:top-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

export type ToastHandlers = {
  handleAction: () => void;
  handleDismiss: () => void;
};

/**
 * Helpers for toast actions.
 */
export function createToastHandlers(toast: ToastData, onDismiss: (id: string) => void): ToastHandlers {
  return {
    handleAction: () => {
      toast.onAction?.();
    },
    handleDismiss: () => {
      onDismiss(toast.id);
    }
  };
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const { handleAction, handleDismiss } = createToastHandlers(toast, onDismiss);

  return (
    <div className="rounded-card border border-mist-200 bg-white p-4 shadow-overlay">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
          {toast.description ? (
            <p className="text-sm text-ink-500">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className={cn("rounded-button px-2 py-1 text-xs text-ink-500 hover:bg-mist-100 focus-ring")}
          aria-label="Dismiss notification"
        >
          Dismiss
        </button>
      </div>
      {toast.actionLabel ? (
        <button
          type="button"
          onClick={handleAction}
          className="mt-3 text-xs font-semibold text-primary-700 hover:text-primary-600 focus-ring"
        >
          {toast.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default ToastViewport;
