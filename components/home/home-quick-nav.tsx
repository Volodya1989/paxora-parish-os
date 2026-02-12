"use client";

import type { ReactNode } from "react";
import { ListChecksIcon, SparklesIcon, UsersIcon, ZapIcon } from "@/components/icons/ParishIcons";
import { cn } from "@/lib/utils";

export type HomeQuickNavItem = {
  id: string;
  label: string;
  count: number;
  description: string;
  href: string;
  icon: ReactNode;
  accentClass: string;
};

const defaultItems: Array<Omit<HomeQuickNavItem, "count">> = [
  {
    id: "highlights",
    label: "Highlights",
    description: "This week, upcoming, and featured.",
    href: "#highlights",
    icon: <SparklesIcon className="h-4 w-4" />,
    accentClass: "bg-emerald-50 text-emerald-700 border-emerald-100"
  },
  {
    id: "updates",
    label: "Updates",
    description: "Latest tasks, events, and notes.",
    href: "#updates",
    icon: <ListChecksIcon className="h-4 w-4" />,
    accentClass: "bg-sky-50 text-sky-700 border-sky-100"
  },
  {
    id: "actions",
    label: "Actions",
    description: "Quick creation flows.",
    href: "#actions",
    icon: <ZapIcon className="h-4 w-4" />,
    accentClass: "bg-amber-50 text-amber-700 border-amber-100"
  },
  {
    id: "community",
    label: "Community",
    description: "Active rooms and conversations.",
    href: "#community",
    icon: <UsersIcon className="h-4 w-4" />,
    accentClass: "bg-lime-50 text-lime-700 border-lime-100"
  }
];

export type HomeQuickNavProps = {
  counts: Record<"highlights" | "updates" | "actions" | "community", number>;
};

export default function HomeQuickNav({ counts }: HomeQuickNavProps) {
  const items = defaultItems.map((item) => ({
    ...item,
    count: counts[item.id as keyof typeof counts]
  }));

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollToSection(item.href)}
          className={cn(
            "group flex min-w-0 flex-col gap-2 rounded-card border px-4 py-3 text-left transition hover:shadow-card",
            item.accentClass
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-700 shadow-sm">
              {item.count}
            </span>
          </div>
          <p className="text-xs text-ink-500">{item.description}</p>
        </button>
      ))}
    </div>
  );
}
