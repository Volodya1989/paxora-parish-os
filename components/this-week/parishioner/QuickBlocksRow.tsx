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
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-4">
      {blocks.map((block) => (
        <button
          key={block.id}
          type="button"
          onClick={() => handleNavigate(block.href)}
          className={cn(
            "group relative flex min-w-0 flex-col gap-2 rounded-card border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-ring active:scale-[0.98]",
            block.accentClass
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm">
              {block.icon}
            </span>
            <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink-700 shadow-sm">
              {block.count}
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-ink-900">{block.label}</div>
            <p className="text-xs text-ink-500 line-clamp-2 sm:line-clamp-1">{block.summary}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
