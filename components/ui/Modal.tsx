"use client";

import React, { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { getFocusableElements, trapFocus } from "@/lib/ui/focus";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
};

/**
 * Modal dialog for desktop-sized viewports.
 */
export function Modal({ open, onClose, title, children, footer, headerActions }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialog = dialogRef.current;

    // Skip focus management if the dialog is not visible (e.g. hidden via CSS on mobile)
    if (!dialog || dialog.offsetParent === null) {
      return;
    }

    const previousActive = document.activeElement as HTMLElement | null;

    // Autofocus first input/textarea if present, otherwise first focusable
    const firstInput = dialog.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
    if (firstInput) {
      firstInput.focus();
    } else {
      const focusable = getFocusableElements(dialog);
      (focusable[0] ?? dialog)?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Guard against the dialog becoming hidden between renders
      if (dialog.offsetParent === null) return;
      if (event.key === "Escape") {
        onCloseRef.current();
      }
      if (event.key === "Tab") {
        trapFocus(dialog, event);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 hidden items-center justify-center px-4 md:flex">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex w-full max-w-lg flex-col overflow-hidden rounded-card border border-mist-200 bg-white p-6 shadow-overlay md:max-h-[calc(100vh-6rem)]"
        )}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-h3">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 text-lg text-ink-500 transition hover:bg-mist-50 focus-ring"
            >
              ×
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto pr-1 text-sm text-ink-700">{children}</div>
        {footer ? (
          <footer className="mt-6 flex justify-end gap-2 border-t border-mist-100 pt-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export default Modal;
