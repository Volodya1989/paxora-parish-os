"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { getFocusableElements, trapFocus } from "@/lib/ui/focus";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
};

/**
 * Drawer component for mobile bottom sheets.
 * Features smooth slide-up animation, iOS safe area, and sticky footer.
 */
export function Drawer({ open, onClose, title, children, footer, headerActions }: DrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Manage mount/slide-up animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      // Allow one frame for mount, then trigger slide-up
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
    } else {
      setAnimating(false);
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const drawer = drawerRef.current;

    // Skip focus management if the drawer is not visible (e.g. hidden via CSS on desktop)
    if (!drawer || drawer.offsetParent === null) {
      return;
    }

    const previousActive = document.activeElement as HTMLElement | null;

    // Autofocus first input/textarea if present, otherwise first focusable
    const firstInput = drawer.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
    if (firstInput) {
      firstInput.focus();
    } else {
      const focusable = getFocusableElements(drawer);
      (focusable[0] ?? drawer)?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Guard against the drawer becoming hidden between renders
      if (drawer.offsetParent === null) return;
      if (event.key === "Escape") {
        onCloseRef.current();
      }
      if (event.key === "Tab") {
        trapFocus(drawer, event);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [open]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      {/* Backdrop with fade */}
      <button
        type="button"
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          animating ? "bg-black/30" : "bg-black/0"
        )}
        aria-label="Close drawer"
        onClick={onClose}
      />
      {/* Sheet with slide-up */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-t-2xl border border-mist-200 bg-white shadow-overlay transition-transform duration-300 ease-out",
          "max-h-[calc(100dvh-2rem)]",
          animating ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-2 mt-3 h-1.5 w-12 shrink-0 rounded-full bg-mist-200" />

        {/* Header */}
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3">
          <h2 id={titleId} className="text-h3">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              type="button"
              aria-label="Close drawer"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 text-lg text-ink-500 transition hover:bg-mist-50 focus-ring"
            >
              ×
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 text-sm text-ink-700">{children}</div>

        {/* Sticky footer */}
        {footer ? (
          <footer className="sticky bottom-0 flex shrink-0 justify-end gap-2 border-t border-mist-100 bg-white px-4 pb-4 pt-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export default Drawer;
