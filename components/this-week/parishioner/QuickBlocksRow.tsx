"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/ui/cn";

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

  const handleNavigate = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    router.push(href);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:overflow-visible">
      <div className="flex min-w-[560px] gap-2 sm:min-w-0 sm:gap-3 lg:justify-center">
        {blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => handleNavigate(block.href)}
            className={cn(
              "group relative flex min-w-[140px] flex-1 flex-col gap-1.5 rounded-card border px-3 py-2 text-left transition hover:shadow-card focus-ring",
              block.accentClass
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-xs">
                {block.icon}
              </span>
              <div className="text-xs font-semibold text-ink-900">{block.label}</div>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-700 shadow-sm">
                {block.count}
              </span>
            </div>
            <p className="text-[11px] text-ink-500">{block.summary}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
