"use client";

import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/routing";
import AppHeader from "@/components/header/AppHeader";
import type { ComponentProps } from "react";

/**
 * Client-side gate that hides AppHeader on the landing page.
 *
 * Layouts in App Router are persistent and don't re-render on navigation,
 * so server-side pathname detection (via headers) becomes stale after the
 * first render. usePathname() updates on every client-side navigation,
 * keeping the hide/show logic accurate.
 */
export default function AppHeaderGate(props: ComponentProps<typeof AppHeader>) {
  const pathname = usePathname();
  const stripped = stripLocale(pathname);
  const isLandingRoute =
    stripped === "/" || stripped === "/this-week" || stripped === "";

  if (isLandingRoute) {
    return null;
  }

  return <AppHeader {...props} />;
}
