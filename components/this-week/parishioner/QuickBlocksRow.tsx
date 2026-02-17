"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/ui/cn";
import { useLocale } from "@/lib/i18n/provider";
import { buildLocalePathname } from "@/lib/i18n/routing";

export type QuickBlock = {
  id: string;
  label: string;
  href: string;
  summary: string;
  count: number;
  icon: ReactNode;
  accentClass: string;
  statusDots?: {
    done: number;
    inProgress: number;
    open: number;
  };
};

type QuickBlocksRowProps = {
  blocks: QuickBlock[];
};

export default function QuickBlocksRow({ blocks }: QuickBlocksRowProps) {
  const router = useRouter();
  const locale = useLocale();

  const handleNavigate = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    router.push(buildLocalePathname(locale, href));
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {blocks.map((block) => (
        <button
          key={block.id}
          type="button"
          onClick={() => handleNavigate(block.href)}
          className={cn(
            "group relative flex min-w-0 flex-col gap-2.5 rounded-2xl border bg-white px-3.5 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-ring active:scale-[0.98] sm:min-h-[152px] sm:px-4 sm:py-4",
            block.accentClass
          )}
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-sm">
              {block.icon}
            </span>
            <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink-700 shadow-sm">
              {block.count}
            </span>
          </div>
          <div className="min-w-0 space-y-1">
            <div className="truncate text-base font-semibold text-ink-900">{block.label}</div>
            {block.statusDots ? (
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-700" aria-label={block.summary}>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />{block.statusDots.done}</span>
                <span className="text-ink-400">·</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />{block.statusDots.inProgress}</span>
                <span className="text-ink-400">·</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />{block.statusDots.open}</span>
              </p>
            ) : (
              <p className="line-clamp-2 break-words text-sm text-ink-500">{block.summary}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
