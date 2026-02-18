"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import {
  DAILY_QUOTE_HIDE_MS,
  formatLocalDateKey,
  scheduleDailyQuoteHide,
  shouldShowDailyQuote
} from "@/lib/ui/dailyQuote";

type DailyQuoteGateProps = {
  storageKey: string;
  children: ReactNode;
  hideAfterMs?: number;
  className?: string;
};

const COLLAPSE_DURATION_MS = 350;

export default function DailyQuoteGate({
  storageKey,
  children,
  hideAfterMs = DAILY_QUOTE_HIDE_MS,
  className
}: DailyQuoteGateProps) {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    setReady(true);
    const todayKey = formatLocalDateKey(new Date());
    const storedDateKey = window.localStorage.getItem(storageKey);

    if (!shouldShowDailyQuote(storedDateKey, todayKey)) {
      setVisible(false);
      setHiding(false);
      return;
    }

    setVisible(true);
    setHiding(false);

    return scheduleDailyQuoteHide({
      hideAfterMs,
      onHide: () => {
        window.localStorage.setItem(storageKey, todayKey);
        if (prefersReducedMotion) {
          setVisible(false);
          setHiding(false);
          return;
        }

        setHiding(true);
      }
    });
  }, [hideAfterMs, prefersReducedMotion, storageKey]);

  useEffect(() => {
    if (!hiding || prefersReducedMotion) return;

    const timeout = window.setTimeout(() => {
      setVisible(false);
      setHiding(false);
    }, COLLAPSE_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [hiding, prefersReducedMotion]);

  if (!ready || !visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none",
        hiding ? "max-h-0 opacity-0 -translate-y-1" : "max-h-[240px] opacity-100 translate-y-0",
        className
      )}
    >
      {children}
    </div>
  );
}
