"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { primaryNavItems } from "@/components/navigation/navItems";
import { SignOutButton } from "@/components/navigation/SignOutButton";

const STORAGE_KEY = "paxora.sidebarCollapsed";

type SidebarProps = {
  currentPath?: string;
  collapsed?: boolean;
  initialCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  onSignOut?: () => Promise<void> | void;
};

export function Sidebar({
  currentPath = "",
  collapsed,
  initialCollapsed = false,
  onCollapseChange,
  onSignOut
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(initialCollapsed);
  const isCollapsed = collapsed ?? internalCollapsed;

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

  return (
    <aside
      className={`hidden min-h-screen flex-col border-r border-mist-200 bg-white/70 px-3 py-6 shadow-card md:flex ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-2">
        <div className={`text-sm font-semibold text-ink-900 ${isCollapsed ? "sr-only" : ""}`}>
          Parish OS
        </div>
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

      <nav aria-label="Primary" className="mt-6 flex-1 space-y-1">
        {primaryNavItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition focus-ring ${
                isActive
                  ? "bg-primary-50 text-primary-800"
                  : "text-ink-700 hover:bg-mist-50"
              } ${item.primary ? "border border-primary-100 text-ink-900" : ""}`}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-600" />
              ) : null}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 text-xs font-semibold ${
                  item.primary ? "bg-primary-100 text-primary-700" : "bg-mist-100 text-ink-700"
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className={isCollapsed ? "sr-only" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 px-2">
        <Link
          href="/profile"
          className={`flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-mist-50 focus-ring ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Profile" : undefined}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 bg-mist-100 text-xs font-semibold text-ink-700"
            aria-hidden="true"
          >
            PR
          </span>
          <span className={isCollapsed ? "sr-only" : ""}>Profile</span>
        </Link>
        <SignOutButton compact={isCollapsed} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}

export default Sidebar;
