"use client";

import { type ReactNode, useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/provider";
import { useLocale } from "@/lib/i18n/provider";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import GivingShortcutButton from "@/components/navigation/GivingShortcutButton";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";
import QuickActions from "@/components/this-week/QuickActions";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { cn } from "@/lib/ui/cn";
import { sectionThemes } from "@/lib/theme/sectionTheme";

type ParishionerHeaderProps = {
  /** Parish name to display */
  parishName: string;
  /** Optional parish logo URL (falls back to Paxora logo) */
  parishLogoUrl?: string | null;
  /** User's first name for personalized greeting */
  userName?: string;
  /** Optional right-aligned actions (e.g., view toggle for users who can switch views) */
  actions?: ReactNode;
  /** Show the quick-add "+" button (for leaders who don't have AppHeader on landing) */
  showQuickAdd?: boolean;
  /** Optional inspirational quote */
  quote?: string;
  /** Optional quote attribution */
  quoteSource?: string;
};

type GreetingLayoutMode = "full-inline" | "compact-inline" | "compact-below";

const GREETING_RIGHT_GUTTER = 10;
const LEFT_ROW_GAP = 12;
const LONG_NAME_THRESHOLD = 14;

export default function ParishionerHeader({
  parishName,
  parishLogoUrl,
  userName,
  actions,
  showQuickAdd,
  quote,
  quoteSource
}: ParishionerHeaderProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { count } = useNotificationContext();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quoteExpanded, setQuoteExpanded] = useState(true);
  const [quotePinnedOpen, setQuotePinnedOpen] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState(t("landing.welcome"));
  const [greetingLayout, setGreetingLayout] = useState<GreetingLayoutMode>("compact-inline");

  const headerTopRowRef = useRef<HTMLDivElement | null>(null);
  const actionRowRef = useRef<HTMLDivElement | null>(null);
  const fullGreetingMeasureRef = useRef<HTMLSpanElement | null>(null);
  const compactGreetingMeasureRef = useRef<HTMLSpanElement | null>(null);

  const logoSrc = parishLogoUrl?.trim() ? parishLogoUrl : "/icon.png";
  const quoteStorageKey = "this-week:quote-expanded";
  const theme = sectionThemes.ThisWeek;

  const resolvedUserName = userName?.trim();
  const compactGreetingText = resolvedUserName
    ? `${t("landing.hi")}, ${resolvedUserName}!`
    : `${t("landing.hi")}!`;
  const fullGreetingText = resolvedUserName
    ? `${timeGreeting}, ${resolvedUserName}!`
    : `${timeGreeting}!`;

  const baseLayoutByHeuristic = useMemo<GreetingLayoutMode>(() => {
    if (!resolvedUserName) return "full-inline";
    if (resolvedUserName.length > LONG_NAME_THRESHOLD) return "compact-inline";
    return "full-inline";
  }, [resolvedUserName]);

  useEffect(() => {
    const hour = new Date().getHours();
    const nextGreeting =
      hour < 12
        ? t("landing.goodMorning")
        : hour < 17
          ? t("landing.goodAfternoon")
          : t("landing.goodEvening");
    setTimeGreeting(nextGreeting);
  }, [t]);

  useLayoutEffect(() => {
    const updateGreetingLayout = () => {
      const rowWidth = headerTopRowRef.current?.clientWidth ?? 0;
      const actionsWidth = actionRowRef.current?.offsetWidth ?? 0;
      const fullWidth = fullGreetingMeasureRef.current?.offsetWidth ?? 0;
      const compactWidth = compactGreetingMeasureRef.current?.offsetWidth ?? 0;

      if (!rowWidth || !actionsWidth || !compactWidth) {
        setGreetingLayout(baseLayoutByHeuristic);
        return;
      }

      const logoWidth = 40;
      const availableGreetingWidth = rowWidth - actionsWidth - logoWidth - LEFT_ROW_GAP - GREETING_RIGHT_GUTTER;

      if (availableGreetingWidth <= 0 || compactWidth > availableGreetingWidth) {
        setGreetingLayout("compact-below");
        return;
      }

      if (fullWidth <= availableGreetingWidth) {
        setGreetingLayout("full-inline");
        return;
      }

      setGreetingLayout("compact-inline");
    };

    updateGreetingLayout();

    const observer = new ResizeObserver(updateGreetingLayout);
    if (headerTopRowRef.current) observer.observe(headerTopRowRef.current);
    if (actionRowRef.current) observer.observe(actionRowRef.current);

    return () => observer.disconnect();
  }, [baseLayoutByHeuristic, fullGreetingText, compactGreetingText]);

  useEffect(() => {
    if (!quote) return;
    const stored = sessionStorage.getItem(quoteStorageKey);
    if (stored === "collapsed") {
      setQuoteExpanded(false);
      setQuotePinnedOpen(false);
      return;
    }
    if (stored === "open") {
      setQuoteExpanded(true);
      setQuotePinnedOpen(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setQuoteExpanded(false);
      sessionStorage.setItem(quoteStorageKey, "collapsed");
    }, 20_000);

    return () => window.clearTimeout(timer);
  }, [quote]);

  const handleToggleQuote = () => {
    setQuoteExpanded((prev) => {
      const next = !prev;
      sessionStorage.setItem(quoteStorageKey, next ? "open" : "collapsed");
      setQuotePinnedOpen(next);
      return next;
    });
  };

  const greetingText = greetingLayout === "full-inline" ? fullGreetingText : compactGreetingText;

  return (
    <>
      <header className={cn("relative -mx-4 -mt-6 overflow-hidden bg-gradient-to-br px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white md:-mx-8 md:rounded-b-2xl md:px-6", theme.headerGradient)}>
        {/* Decorative background elements */}
        <div className={cn("absolute -right-8 -top-8 h-20 w-20 rounded-full", theme.headerAccentBubble)} />
        <div className={cn("absolute -bottom-2 left-1/4 h-12 w-12 rounded-full", theme.headerAccentGlow)} />

        {/* Hidden text measures to determine greeting fallback layout */}
        <div className="pointer-events-none absolute -z-10 opacity-0" aria-hidden="true">
          <span ref={fullGreetingMeasureRef} className="whitespace-nowrap text-[clamp(1.5rem,4.8vw,2rem)] font-bold tracking-tight">{fullGreetingText}</span>
          <span ref={compactGreetingMeasureRef} className="whitespace-nowrap text-[clamp(1.5rem,4.8vw,2rem)] font-bold tracking-tight">{compactGreetingText}</span>
        </div>

        <div ref={headerTopRowRef} className="relative flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={buildLocalePathname(locale, "/this-week")} aria-label={t("header.thisWeek")} className="shrink-0">
              <img
                src={logoSrc}
                alt={`${parishName} logo`}
                className="h-10 w-10 rounded-md object-contain md:h-12 md:w-12"
                onError={(e) => { e.currentTarget.src = "/icon.png"; }}
              />
            </Link>

            {greetingLayout !== "compact-below" && (
              <h1 className="min-w-0 truncate whitespace-nowrap text-[clamp(1.5rem,4.8vw,2rem)] font-bold tracking-tight">
                {greetingText}
              </h1>
            )}
          </div>

          <div ref={actionRowRef} className="flex shrink-0 items-center gap-1.5">
            {showQuickAdd && (
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
                aria-label={t("thisWeek.quickAdd")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
            <GivingShortcutButton className="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30" />
            {count > 0 && (
              <NotificationCenter bellClassName="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 md:hidden" />
            )}
            <LanguageIconToggle />
          </div>
        </div>

        <div className="relative mt-2 space-y-1">
          {greetingLayout === "compact-below" && (
            <h1 className="truncate whitespace-nowrap text-[clamp(1.5rem,4.8vw,2rem)] font-bold tracking-tight">
              {compactGreetingText}
            </h1>
          )}

          <p className="text-xs font-semibold leading-tight text-white/90 sm:text-sm">
            <span className="line-clamp-2">{parishName}</span>
          </p>

          {quote && (
            quoteExpanded ? (
              <blockquote className="mt-1.5 border-l-4 border-white/40 pl-3 text-xs italic text-white/90">
                <p>{quote}</p>
                {quoteSource && (
                  <footer className="mt-1 text-xs text-white/70">— {quoteSource}</footer>
                )}
              </blockquote>
            ) : (
              <button
                type="button"
                onClick={handleToggleQuote}
                className="mt-1.5 text-xs font-medium text-white/90 underline underline-offset-2 transition hover:text-white"
              >
                {t("thisWeek.showQuote")}
              </button>
            )
          )}
          {quote && quoteExpanded && quotePinnedOpen && (
            <button
              type="button"
              onClick={handleToggleQuote}
              className="mt-1 text-xs font-medium text-white/90 underline underline-offset-2 transition hover:text-white"
            >
              {t("thisWeek.hideQuote")}
            </button>
          )}

          {actions && <div className="mt-3 flex justify-end">{actions}</div>}
        </div>
      </header>

      {showQuickAdd && (
        <>
          <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title={t("thisWeek.quickAdd")}>
            <p className="mb-4 text-sm text-ink-500">{t("thisWeek.quickAddDesc")}</p>
            <QuickActions onSelect={() => setQuickAddOpen(false)} />
          </Modal>
          <Drawer open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title={t("thisWeek.quickAdd")}>
            <p className="mb-4 text-sm text-ink-500">{t("thisWeek.quickAddDesc")}</p>
            <QuickActions onSelect={() => setQuickAddOpen(false)} />
          </Drawer>
        </>
      )}
    </>
  );
}
