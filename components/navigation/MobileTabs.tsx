"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";
import MoreDrawer from "@/components/navigation/MoreDrawer";
import { primaryNavItems } from "@/components/navigation/navItems";

type MobileTabsProps = {
  currentPath?: string;
  onNavigate?: (href: string) => void;
  isMoreOpen?: boolean;
  onMoreOpenChange?: (open: boolean) => void;
  onSignOut?: () => Promise<void> | void;
};

export function MobileTabs({
  currentPath = "",
  onNavigate,
  isMoreOpen,
  onMoreOpenChange,
  onSignOut
}: MobileTabsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isMoreOpen ?? internalOpen;

  const setOpen = (nextOpen: boolean) => {
    onMoreOpenChange?.(nextOpen);
    if (isMoreOpen === undefined) {
      setInternalOpen(nextOpen);
    }
  };

  const handleMoreToggle = () => {
    setOpen(!open);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-mist-200 bg-white/95 shadow-card md:hidden"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {primaryNavItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                data-testid={`tab-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => {
                  onNavigate?.(item.href);
                  setOpen(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-button px-2 py-1 text-xs font-medium transition focus-ring ${
                  isActive ? "text-primary-700" : "text-ink-500"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    isActive
                      ? "border-primary-200 bg-primary-50 text-primary-700"
                      : "border-mist-200 bg-mist-100 text-ink-500"
                  }`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-controls="more-drawer"
            aria-expanded={open}
            data-testid="tab-more"
            onClick={handleMoreToggle}
            className={`flex flex-col items-center gap-1 rounded-button px-2 py-1 text-xs font-medium transition focus-ring ${
              open ? "text-primary-700" : "text-ink-500"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold ${
                open
                  ? "border-primary-200 bg-primary-50 text-primary-700"
                  : "border-mist-200 bg-mist-100 text-ink-500"
              }`}
              aria-hidden="true"
            >
              MORE
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>
      <MoreDrawer open={open} onClose={handleClose} onSignOut={onSignOut} />
    </>
  );
}

export default MobileTabs;
