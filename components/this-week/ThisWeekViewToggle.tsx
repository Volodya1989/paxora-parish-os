"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ThisWeekViewMode } from "@/lib/this-week/viewMode";

type ThisWeekViewToggleProps = {
  value: ThisWeekViewMode;
};

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 17l9.2-9.2M17 17V8h-9" />
    </svg>
  );
}

export default function ThisWeekViewToggle({ value }: ThisWeekViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const nextValue: ThisWeekViewMode = value === "admin" ? "parishioner" : "admin";
  const label = value === "admin" ? "Parishioner view" : "Admin view";

  const handleSwitch = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("view", nextValue);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
      router.refresh();
    });
  }, [pathname, router, searchParams, nextValue]);

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/25 hover:text-white"
    >
      <span>{label}</span>
      <ArrowIcon className="h-3 w-3" />
    </button>
  );
}
