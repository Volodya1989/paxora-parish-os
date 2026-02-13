"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";
import MoreDrawer from "@/components/navigation/MoreDrawer";
import { getPrimaryNavItems, type NavRole, type PlatformNavRole } from "@/components/navigation/navItems";
import { buildLocalePathname, stripLocale } from "@/lib/i18n/routing";
import { useLocale, useTranslations } from "@/lib/i18n/provider";

type MobileTabsProps = {
  currentPath?: string;
  onNavigate?: (href: string) => void;
  isMoreOpen?: boolean;
  onMoreOpenChange?: (open: boolean) => void;
  onSignOut?: () => Promise<void> | void;
  parishRole?: NavRole;
  platformRole?: PlatformNavRole;
};

export function MobileTabs({
  currentPath = "",
  onNavigate,
  isMoreOpen,
  onMoreOpenChange,
  onSignOut,
  parishRole,
  platformRole
}: MobileTabsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isMoreOpen ?? internalOpen;
  const normalizedPath = stripLocale(currentPath);

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

  const items = getPrimaryNavItems(parishRole);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-mist-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-card md:hidden"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {items.map((item) => {
            const localizedHref = buildLocalePathname(locale, item.href);
            const isActive = normalizedPath === item.href;
            return (
              <Link
                key={item.href}
                href={localizedHref}
                aria-current={isActive ? "page" : undefined}
                data-testid={`tab-${item.testId}`}
                onClick={() => {
                  onNavigate?.(localizedHref);
                  setOpen(false);
                }}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-button px-1 py-1 text-[11px] font-medium leading-tight transition focus-ring ${
                  isActive ? "text-primary-700" : "text-ink-500"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    isActive
                      ? "border-primary-200 bg-primary-50 text-primary-700"
                      : "border-mist-200 bg-mist-100 text-ink-500"
                  }`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="max-w-full truncate text-center">{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-controls="more-drawer"
            aria-expanded={open}
            data-testid="tab-more"
            onClick={handleMoreToggle}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-button px-1 py-1 text-[11px] font-medium leading-tight transition focus-ring ${
              open ? "text-primary-700" : "text-ink-500"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                open
                  ? "border-primary-200 bg-primary-50 text-primary-700"
                  : "border-mist-200 bg-mist-100 text-ink-500"
              }`}
              aria-hidden="true"
            >
              {t("menu.moreAbbrev")}
            </span>
            <span className="truncate text-center">{t("menu.more")}</span>
          </button>
        </div>
      </nav>
      <MoreDrawer
        open={open}
        onClose={handleClose}
        onSignOut={onSignOut}
        parishRole={parishRole}
        platformRole={platformRole}
      />
    </>
  );
}

export default MobileTabs;
