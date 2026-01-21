"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  X,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    id: "this-week",
    label: "This Week",
    shortLabel: "TW",
    icon: LayoutDashboard,
    active: true,
    color: "bg-emerald-600",
  },
  {
    id: "serve",
    label: "Serve",
    shortLabel: "SV",
    icon: HeartHandshake,
    active: false,
    color: "bg-stone-200",
  },
  {
    id: "groups",
    label: "Groups",
    shortLabel: "GR",
    icon: Users,
    active: false,
    color: "bg-stone-200",
  },
  {
    id: "calendar",
    label: "Calendar",
    shortLabel: "CA",
    icon: Calendar,
    active: false,
    color: "bg-stone-200",
  },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-background transition-transform duration-300 md:static md:translate-x-0",
          collapsed ? "md:w-[72px]" : "md:w-[240px]",
          "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className={cn("text-sm font-semibold text-foreground", collapsed && "md:hidden")}>
            Parish OS
          </span>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMobileOpenChange?.(false)}
            className="text-muted-foreground md:hidden"
          >
            <X className="size-4" />
          </Button>
          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden text-muted-foreground md:flex"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onMobileOpenChange?.(false)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                  item.active
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-600"
                )}
              >
                {item.shortLabel}
              </span>
              <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <button
            onClick={() => onMobileOpenChange?.(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-600">
              PR
            </span>
            <span className={cn(collapsed && "md:hidden")}>Profile</span>
          </button>

          <button
            onClick={() => onMobileOpenChange?.(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-stone-800 text-xs text-white">N</AvatarFallback>
            </Avatar>
            <span className={cn(collapsed && "md:hidden")}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// Mobile menu button component
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="text-muted-foreground md:hidden"
    >
      <Menu className="size-5" />
      <span className="sr-only">Open menu</span>
    </Button>
  )
}
