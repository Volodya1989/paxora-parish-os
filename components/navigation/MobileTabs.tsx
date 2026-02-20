"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";
import MoreDrawer from "@/components/navigation/MoreDrawer";
import NavIcon from "@/components/navigation/NavIcon";
import { getPrimaryNavItems, type NavRole, type PlatformNavRole } from "@/components/navigation/navItems";
import { buildLocalePathname, stripLocale } from "@/lib/i18n/routing";
import { useLocale, useTranslations } from "@/lib/i18n/provider";
import { resolveSectionTheme, sectionThemeByRoute, sectionThemes } from "@/lib/theme/sectionTheme";
import { cn } from "@/lib/ui/cn";
import { useKeyboardOpen } from "@/lib/ui/useKeyboardOpen";

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
  const isKeyboardOpen = useKeyboardOpen();

  const currentSectionTheme = sectionThemes[resolveSectionTheme(normalizedPath)];

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

  const isPathActive = (href: string) => normalizedPath === href || normalizedPath.startsWith(`${href}/`);

  return (
    <>
      <nav
        aria-label="Primary"
        className={`fixed bottom-0 left-0 right-0 z-30 border-t border-mist-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-card transition-all duration-200 md:hidden ${
          isKeyboardOpen
            ? "pointer-events-none translate-y-[calc(100%+env(safe-area-inset-bottom))] opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {items.map((item) => {
            const localizedHref = buildLocalePathname(locale, item.href);
            const isActive = isPathActive(item.href);
            const theme = sectionThemes[sectionThemeByRoute[item.href]];
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
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-button px-1 py-1 text-[11px] leading-tight transition focus-ring",
                  isActive ? theme.navActiveLabel : "text-ink-500"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-150",
                    isActive
                      ? theme.navActiveIcon
                      : "border-mist-200 bg-mist-100 text-ink-500",
                    isActive ? "scale-105" : "scale-100"
                  )}
                  style={{ willChange: "transform" }}
                  aria-hidden="true"
                >
                  <NavIcon icon={item.icon} className="h-[18px] w-[18px]" fallbackClassName="text-[10px] font-semibold" />
                </span>
                <span className="max-w-full truncate text-center font-semibold">{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-controls="more-drawer"
            aria-expanded={open}
            data-testid="tab-more"
            onClick={handleMoreToggle}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-button px-1 py-1 text-[11px] font-semibold leading-tight transition focus-ring",
              open ? currentSectionTheme.navActiveLabel : "text-ink-500"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                open ? currentSectionTheme.navActiveIcon : "border-mist-200 bg-mist-100 text-ink-500"
              )}
              aria-hidden="true"
            >
              •••
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
