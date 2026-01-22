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
  viewToggle
}: ThisWeekHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-card border border-mist-200 bg-white p-5 shadow-card md:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1">{title}</h1>
            <span className="rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-ink-700">
              {weekLabel}
            </span>
          </div>
          <p className="text-sm text-ink-500">
            {dateRange} · {updatedLabel}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-button border border-mist-200 text-ink-700 transition hover:bg-mist-50 focus-ring"
            >
              ‹
            </Link>
            <Dropdown>
              <DropdownTrigger
                className="inline-flex items-center gap-2 rounded-button border border-mist-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-mist-50 focus-ring"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-button border border-mist-200 text-ink-700 transition hover:bg-mist-50 focus-ring"
            >
              ›
            </Link>
          </div>

          {viewToggle}

          {showQuickAdd ? (
            <Button onClick={() => setIsOpen(true)} className="h-10 px-4">
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
