"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import type { NotificationCategory, NotificationItem } from "@/lib/queries/notifications";
import { useTranslations } from "@/lib/i18n/provider";

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  onMarkAllRead: () => void;
  onMarkCategoryRead: (category: NotificationCategory) => void;
};

const categoryIcons: Record<NotificationCategory, string> = {
  message: "MSG",
  task: "TSK",
  announcement: "ANN",
  event: "EVT"
};

const categoryColors: Record<NotificationCategory, string> = {
  message: "border-blue-200 bg-blue-50 text-blue-700",
  task: "border-emerald-200 bg-emerald-50 text-emerald-700",
  announcement: "border-amber-200 bg-amber-50 text-amber-700",
  event: "border-purple-200 bg-purple-50 text-purple-700"
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationRow({
  item,
  onClose,
  onMarkCategoryRead
}: {
  item: NotificationItem;
  onClose: () => void;
  onMarkCategoryRead: (category: NotificationCategory) => void;
}) {
  const handleClick = () => {
    onMarkCategoryRead(item.type);
    onClose();
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className="flex items-start gap-3 rounded-card px-3 py-3 transition hover:bg-mist-50 focus-ring"
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold ${categoryColors[item.type]}`}
        aria-hidden="true"
      >
        {categoryIcons[item.type]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 truncate text-xs text-ink-500">{item.description}</p>
        )}
        <p className="mt-1 text-[10px] text-ink-400">{formatTimestamp(item.timestamp)}</p>
      </div>
    </Link>
  );
}

/**
 * Notification panel that renders as:
 * - Fixed dropdown panel on desktop (md+)
 * - Bottom drawer on mobile
 */
export function NotificationPanel({
  open,
  onClose,
  items,
  onMarkAllRead,
  onMarkCategoryRead
}: NotificationPanelProps) {
  const t = useTranslations();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout to avoid closing immediately from the trigger click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Group items by category for category-level mark-read
  const categories = Array.from(new Set(items.map((i) => i.type)));

  const handleMarkAll = () => {
    onMarkAllRead();
    onClose();
  };

  const panelContent = (
    <div ref={panelRef} role="dialog" aria-label={t("notifications.title")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-mist-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink-900">{t("notifications.title")}</h2>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs font-medium text-primary-600 transition hover:text-primary-800 focus-ring rounded px-1"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("buttons.close")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition hover:bg-mist-50 focus-ring"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="max-h-[60vh] overflow-y-auto md:max-h-[400px]">
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-ink-700">{t("notifications.allCaughtUp")}</p>
            <p className="mt-1 text-xs text-ink-400">{t("notifications.allCaughtUpDesc")}</p>
          </div>
        ) : (
          <div className="divide-y divide-mist-100 px-1 py-1">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onClose={onClose}
                onMarkCategoryRead={onMarkCategoryRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Category quick-clear footer */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1 border-t border-mist-200 px-3 py-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onMarkCategoryRead(cat)}
              className="rounded-full border border-mist-200 px-2.5 py-1 text-[10px] font-medium text-ink-500 transition hover:bg-mist-50 focus-ring"
            >
              {t(`notifications.clear.${cat}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: absolute positioned dropdown */}
      <div className="pointer-events-none fixed inset-0 z-50 hidden md:block">
        <div className="pointer-events-auto absolute left-16 top-4 w-80 rounded-card border border-mist-200 bg-white shadow-overlay">
          {panelContent}
        </div>
      </div>

      {/* Mobile: bottom drawer */}
      <div className="fixed inset-0 z-50 flex items-end md:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/30"
          aria-label={t("buttons.close")}
          onClick={onClose}
        />
        <div className="relative w-full rounded-t-card border border-mist-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-overlay">
          <div className="mx-auto mb-2 mt-3 h-1.5 w-12 rounded-full bg-mist-200" />
          {panelContent}
        </div>
      </div>
    </>
  );
}

export default NotificationPanel;
