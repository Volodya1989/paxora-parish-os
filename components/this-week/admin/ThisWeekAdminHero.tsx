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

function ProgressRing({ percent }: { percent: number }) {
  return (
    <div className="relative h-10 w-10">
      <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          className="stroke-mist-200"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          className="stroke-primary-600"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${percent} 100`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-700">
        {percent}%
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
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-h2">This Week</h1>
                <span className="rounded-md bg-mist-100 px-2.5 py-1 text-xs font-medium text-ink-600">
                  {weekLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-500">
                {dateRange} · {updatedLabel}
              </p>
            </div>

            <div className="flex items-center gap-3 self-start rounded-card border border-mist-200 bg-mist-50 px-3 py-2">
              <ProgressRing percent={completionPercentage} />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Completion
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {completedTasks}/{totalTasks} done
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1">
              <Link
                href="?week=previous"
                aria-label="Previous week"
                className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Link>
              <Dropdown>
                <DropdownTrigger
                  className="inline-flex h-8 min-w-[120px] items-center justify-between gap-2 rounded-button border border-mist-200 bg-white px-3 text-sm font-medium text-ink-700 hover:bg-mist-50 focus-ring"
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {viewToggle}
              <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
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
