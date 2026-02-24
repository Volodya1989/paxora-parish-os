"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPrimaryNavItems, type NavRole } from "@/components/navigation/navItems";
import NavIcon from "@/components/navigation/NavIcon";
import { SignOutButton } from "@/components/navigation/SignOutButton";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { stripLocale, buildLocalePathname } from "@/lib/i18n/routing";
import { useTranslations, useLocale } from "@/lib/i18n/provider";
import { routes } from "@/lib/navigation/routes";

const STORAGE_KEY = "paxora.sidebarCollapsed";

type SidebarProps = {
  currentPath?: string;
  collapsed?: boolean;
  initialCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  onSignOut?: () => Promise<void> | void;
  parishRole?: NavRole;
  platformRole?: "SUPERADMIN" | null;
};

export function Sidebar({
  currentPath = "",
  collapsed,
  initialCollapsed = false,
  onCollapseChange,
  onSignOut,
  parishRole,
  platformRole
}: SidebarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [internalCollapsed, setInternalCollapsed] = useState(initialCollapsed);
  const isCollapsed = collapsed ?? internalCollapsed;
  const normalizedPath = stripLocale(currentPath);

  useEffect(() => {
    if (typeof window === "undefined" || collapsed !== undefined) {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setInternalCollapsed(stored === "true");
    }
  }, [collapsed]);

  useEffect(() => {
    if (typeof window === "undefined" || collapsed !== undefined) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [collapsed, isCollapsed]);

  const handleToggle = () => {
    const next = !isCollapsed;
    onCollapseChange?.(next);
    if (collapsed === undefined) {
      setInternalCollapsed(next);
    }
  };

  const baseItems = getPrimaryNavItems(parishRole);
  // Add Requests + People for ADMIN/SHEPHERD on desktop only
  const items = [
    ...baseItems,
    ...(parishRole === "ADMIN" || parishRole === "SHEPHERD"
      ? [
          { labelKey: "nav.requests", href: routes.adminRequests, icon: "RQ", testId: "requests" },
          { labelKey: "nav.reliability", href: routes.adminReliability, icon: "RL", testId: "reliability" },
          { labelKey: "nav.reports", href: routes.adminReports, icon: "RP", testId: "reports" },
          { labelKey: "nav.automation", href: routes.adminAutomation, icon: "AU", testId: "automation" },
          { labelKey: "nav.people", href: routes.adminPeople, icon: "PE", testId: "people" }
        ]
      : []),
    ...(platformRole === "SUPERADMIN"
      ? [
          {
            labelKey: "nav.platformParishes",
            href: routes.platformParishes,
            icon: "PF",
            testId: "platform-parishes"
          }
        ]
      : [])
  ];

  return (
    <aside
      className={`hidden min-h-screen flex-col border-r border-mist-200 bg-white/70 px-3 py-6 shadow-card md:flex ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-2">
        <div className={`text-sm font-semibold text-ink-900 ${isCollapsed ? "sr-only" : ""}`}>
          {t("header.appTitle")}
        </div>
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <button
            type="button"
            className="rounded-button border border-mist-200 bg-white px-2 py-1 text-xs text-ink-700 transition hover:bg-mist-50 focus-ring"
            onClick={handleToggle}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? ">>" : "<<"}
          </button>
        </div>
      </div>

      <nav aria-label="Primary" className="mt-6 flex-1 space-y-1">
        {items.map((item) => {
          const isActive = normalizedPath === item.href;
          return (
            <Link
              key={item.href}
              href={buildLocalePathname(locale, item.href)}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? t(item.labelKey) : undefined}
              className={`group relative flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition focus-ring ${
                isActive
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-ink-700 hover:bg-mist-50"
              } ${item.primary ? "border border-primary-100 text-ink-900" : ""}`}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500/60" />
              ) : null}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                  isActive
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                    : "border-mist-200 bg-mist-100 text-ink-700"
                }`}
                aria-hidden="true"
              >
                <NavIcon icon={item.icon} className="h-4 w-4" fallbackClassName="text-[10px] font-semibold" />
              </span>
              <span className={isCollapsed ? "sr-only" : ""}>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 px-2">
        <Link
          href={buildLocalePathname(locale, "/profile")}
          className={`flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-mist-50 focus-ring ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? t("nav.profile") : undefined}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 bg-mist-100 text-xs font-semibold text-ink-700"
            aria-hidden="true"
          >
            <NavIcon icon="PR" className="h-4 w-4" fallbackClassName="text-[10px] font-semibold" />
          </span>
          <span className={isCollapsed ? "sr-only" : ""}>{t("nav.profile")}</span>
        </Link>
        <SignOutButton compact={isCollapsed} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}

export default Sidebar;
