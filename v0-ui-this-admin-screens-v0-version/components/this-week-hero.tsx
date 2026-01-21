"use client"

import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ThisWeekHeroProps {
  weekLabel: string
  dateRange: string
  updatedAt: string
  completedTasks: number
  totalTasks: number
  completionPercentage: number
  viewMode: "admin" | "parishioner"
  onViewModeChange: (mode: "admin" | "parishioner") => void
  selectedWeek: string
  onWeekChange: (week: string) => void
}

export function ThisWeekHero({
  weekLabel,
  dateRange,
  updatedAt,
  completedTasks,
  totalTasks,
  completionPercentage,
  viewMode,
  onViewModeChange,
  selectedWeek,
  onWeekChange,
}: ThisWeekHeroProps) {
  return (
    <Card className="border-stone-200 bg-white p-0">
      <div className="p-4 sm:p-6">
        {/* Mobile: Stack everything vertically */}
        {/* Desktop: Two column layout */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left section: Title + Completion */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Week Title and Date */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-xl font-semibold text-foreground sm:text-2xl">This Week</h2>
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 sm:px-2.5 sm:py-1">
                  {weekLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {dateRange} · Updated {updatedAt}
              </p>
            </div>

            {/* Completion Ring - Inline on mobile, side by side on sm+ */}
            <div className="flex items-center gap-3 self-start rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 sm:px-4">
              <div className="relative size-10">
                <svg className="size-10 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-stone-200"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-emerald-500"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${completionPercentage} 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                  {completionPercentage}%
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Completion
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {completedTasks}/{totalTasks} done
                </p>
              </div>
            </div>
          </div>

          {/* Right section: Controls */}
          <div className="flex flex-col gap-3">
            {/* Week Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" className="bg-transparent text-muted-foreground">
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous week</span>
              </Button>
              <Select value={selectedWeek} onValueChange={onWeekChange}>
                <SelectTrigger className="h-8 w-[110px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-W03">2026-W03</SelectItem>
                  <SelectItem value="2026-W04">2026-W04</SelectItem>
                  <SelectItem value="2026-W05">2026-W05</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon-sm" className="bg-transparent text-muted-foreground">
                <ChevronRight className="size-4" />
                <span className="sr-only">Next week</span>
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
              <button
                onClick={() => onViewModeChange("admin")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                  viewMode === "admin"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => onViewModeChange("parishioner")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                  viewMode === "parishioner"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Parishioner
              </button>
            </div>

            {/* Add Button - Full width on mobile */}
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
