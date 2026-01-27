"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import QuickActions from "@/components/this-week/QuickActions";
import { cn } from "@/lib/ui/cn";
import type { WeekOption } from "@/components/this-week/ThisWeekHeader";

type ThisWeekAdminHeroProps = {
  weekLabel: string;
  dateRange: string;
  updatedLabel: string;
  completedTasks: number;
  totalTasks: number;
  completionPercentage: number;
  weekSelection: "previous" | "current" | "next";
  weekOptions: WeekOption[];
  viewToggle?: React.ReactNode;
};

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function ProgressRing({ percent, className }: { percent: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className={cn("relative h-10 w-10", className)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-mist-200" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          className="stroke-primary-600"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${pct} 100`}
        />
      </svg>

      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold text-ink-700 tabular-nums leading-none",
          pct === 100 ? "text-[8px] tracking-[-0.04em]" : "text-[10px] tracking-tight"
        )}
      >
        {pct}%
      </span>

    </div>
  );
}


export default function ThisWeekAdminHero({
  weekLabel,
  dateRange,
  updatedLabel,
  completedTasks,
  totalTasks,
  completionPercentage,
  weekSelection,
  weekOptions,
  viewToggle
}: ThisWeekAdminHeroProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = weekOptions.find((option) => option.value === weekSelection);

  return (
    <Card className="p-0">
      <div className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h2">This Week</h1>
              <p className="text-sm font-medium text-ink-600">
                Week {weekLabel} · {dateRange}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
              <span>{updatedLabel}</span>
              <div className="flex items-center gap-2 rounded-card border border-mist-200 bg-mist-50 px-2 py-1">
                <ProgressRing
                  percent={completionPercentage}
                  className="h-8 w-8 sm:h-7 sm:w-7"
                />
                <span className="font-medium text-ink-700">
                  {completedTasks}/{totalTasks} done
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <Link
                href="?week=previous"
                aria-label="Previous week"
                className="inline-flex h-9 w-9 items-center justify-center rounded-button border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Link>
              <Dropdown>
                <DropdownTrigger
                  className="inline-flex h-9 min-w-[120px] items-center justify-between gap-2 rounded-button border border-mist-200 bg-white px-3 text-sm font-medium text-ink-700 hover:bg-mist-50 focus-ring"
                  aria-label="Select week"
                >
                  <span>{selectedOption?.label ?? weekLabel}</span>
                  <span className="text-xs text-ink-400">▾</span>
                </DropdownTrigger>
                <DropdownMenu ariaLabel="Select week">
                  {weekOptions.map((option) => (
                    <DropdownItem key={option.value} asChild>
                      <Link
                        href={`?week=${option.value}`}
                        className={cn(
                          "flex w-full flex-col items-start gap-1",
                          option.value === weekSelection && "text-ink-900"
                        )}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-ink-400">{option.range}</span>
                      </Link>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
              <Link
                href="?week=next"
                aria-label="Next week"
                className="inline-flex h-9 w-9 items-center justify-center rounded-button border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {viewToggle}
              <Button onClick={() => setIsOpen(true)} className="h-9 w-full sm:w-auto">
                <span className="text-base leading-none">+</span>
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Quick add">
        <p className="mb-4 text-sm text-ink-500">
          Create something new without leaving the weekly overview.
        </p>
        <QuickActions onSelect={() => setIsOpen(false)} />
      </Modal>
      <Drawer open={isOpen} onClose={() => setIsOpen(false)} title="Quick add">
        <p className="mb-4 text-sm text-ink-500">
          Create something new without leaving the weekly overview.
        </p>
        <QuickActions onSelect={() => setIsOpen(false)} />
      </Drawer>
    </Card>
  );
}
