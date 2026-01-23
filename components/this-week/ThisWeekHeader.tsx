"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import { cn } from "@/lib/ui/cn";
import QuickActions from "@/components/this-week/QuickActions";

export type WeekOption = {
  value: "previous" | "current" | "next";
  label: string;
  range: string;
};

type ThisWeekHeaderProps = {
  title: string;
  weekLabel: string;
  dateRange: string;
  updatedLabel: string;
  completionLabel: string;
  completionPct: number;
  weekSelection: "previous" | "current" | "next";
  weekOptions: WeekOption[];
  showCompletion?: boolean;
  showQuickAdd?: boolean;
  variant?: "default" | "compact";
  viewToggle?: React.ReactNode;
};

function ProgressRing({ percent }: { percent: number }) {
  const radius = 20;
  const stroke = 4;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="#e7e5e4"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#10b981"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-ink-700">{percent}%</span>
    </div>
  );
}

export default function ThisWeekHeader({
  title,
  weekLabel,
  dateRange,
  updatedLabel,
  completionLabel,
  completionPct,
  weekSelection,
  weekOptions,
  showCompletion = true,
  showQuickAdd = true,
  variant = "default",
  viewToggle
}: ThisWeekHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "rounded-card border border-mist-200 bg-white shadow-card",
        isCompact ? "p-3 sm:p-5" : "p-5 md:p-6"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
          isCompact && "gap-3"
        )}
      >
        <div className={cn("space-y-2", isCompact && "space-y-1")}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={cn(isCompact ? "text-h2 sm:text-h1" : "text-h1")}>{title}</h1>
            <span className="rounded-full bg-mist-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
              {weekLabel}
            </span>
          </div>
          <p className={cn(isCompact ? "text-xs sm:text-sm" : "text-sm", "text-ink-500")}>
            {dateRange} · {updatedLabel}
          </p>
        </div>

        <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end")}>
          {showCompletion ? (
            <div className="flex items-center gap-3 rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
              <ProgressRing percent={completionPct} />
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-400">Completion</p>
                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 shadow-card">
                  {completionLabel}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Link
              href={`?week=previous`}
              aria-label="Previous week"
              className={cn(
                "inline-flex items-center justify-center rounded-button border border-mist-200 text-ink-700 transition hover:bg-mist-50 focus-ring",
                isCompact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9"
              )}
            >
              ‹
            </Link>
            <Dropdown>
              <DropdownTrigger
                className={cn(
                  "inline-flex items-center gap-2 rounded-button border border-mist-200 text-sm font-medium text-ink-700 hover:bg-mist-50 focus-ring",
                  isCompact ? "px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" : "px-3 py-2"
                )}
                aria-label="Select week"
              >
                {weekOptions.find((option) => option.value === weekSelection)?.label ?? weekLabel}
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
              href={`?week=next`}
              aria-label="Next week"
              className={cn(
                "inline-flex items-center justify-center rounded-button border border-mist-200 text-ink-700 transition hover:bg-mist-50 focus-ring",
                isCompact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9"
              )}
            >
              ›
            </Link>
          </div>

          {viewToggle}

          {showQuickAdd ? (
            <Button
              onClick={() => setIsOpen(true)}
              className={cn(isCompact ? "h-9 px-3 sm:h-10 sm:px-4" : "h-10 px-4")}
            >
              + Add
            </Button>
          ) : null}
        </div>
      </div>

      {showQuickAdd ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}
