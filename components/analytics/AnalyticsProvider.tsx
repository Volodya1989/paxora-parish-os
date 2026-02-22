"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analytics } from "@/lib/analytics";
import { createPageViewTracker } from "@/lib/analytics-pageviews";

type AnalyticsProviderProps = {
  children: ReactNode;
  parishId?: string | null;
  role?: "ADMIN" | "SHEPHERD" | "MEMBER" | null;
  locale: string;
};

export default function AnalyticsProvider({ children, parishId, role, locale }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const trackPageView = useMemo(
    () => createPageViewTracker((path) => analytics.page(path)),
    []
  );

  useEffect(() => {
    void analytics.init();
  }, []);

  useEffect(() => {
    analytics.setGlobalProperties({
      parishId: parishId ?? null,
      role: role ?? null,
      locale
    });
  }, [locale, parishId, role]);

  useEffect(() => {
    trackPageView(pathname ?? "/", searchParams?.toString() ?? "");
  }, [pathname, searchParams, trackPageView]);

  return <>{children}</>;
}
