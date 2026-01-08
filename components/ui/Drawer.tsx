"use client";

import React, { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { getFocusableElements, trapFocus } from "@/lib/ui/focus";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Drawer component for mobile bottom sheets.
 */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const drawer = drawerRef.current;
    const previousActive = document.activeElement as HTMLElement | null;
    const focusable = drawer ? getFocusableElements(drawer) : [];
    (focusable[0] ?? drawer)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "Tab" && drawer) {
        trapFocus(drawer, event);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-t-card border border-mist-200 bg-white px-4 pb-8 pt-5 shadow-overlay"
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-mist-200" />
        <header className="mb-4">
          <h2 id={titleId} className="text-h3">
            {title}
          </h2>
        </header>
        <div className="text-sm text-ink-700">{children}</div>
        {footer ? <footer className="mt-6 flex justify-end gap-2">{footer}</footer> : null}
      </div>
    </div>
  );
}

export default Drawer;
