"use client"

import { useState } from "react"
import { Sidebar, MobileMenuButton } from "@/components/sidebar"
import { ThisWeekHero } from "@/components/this-week-hero"
import { AdminAlertBanner } from "@/components/admin-alert-banner"
import { ServePreviewCard } from "@/components/serve-preview-card"
import { EventsPreviewCard } from "@/components/events-preview-card"
import { AnnouncementsPanel } from "@/components/announcements-panel"

// Mock data for populated state
const mockServeItems = [
  {
    id: "1",
    title: "Choir Setup",
    status: "open" as const,
    visibility: "public" as const,
    assignee: { name: "Volodymyr Petrytsya", initials: "VP" },
    volunteers: { current: 1, needed: 3 },
    dueDate: "Jan 25",
  },
  {
    id: "2",
    title: "Altar Preparation",
    status: "in-progress" as const,
    visibility: "private" as const,
    assignee: null,
    volunteers: { current: 0, needed: 2 },
    dueDate: "Jan 21",
  },
  {
    id: "3",
    title: "Greeting Ministry",
    status: "completed" as const,
    visibility: "public" as const,
    assignee: { name: "Maria Santos", initials: "MS" },
    volunteers: { current: 4, needed: 4 },
    dueDate: "Jan 19",
  },
]

const mockEvents = [
  {
    id: "1",
    title: "Divine Liturgy",
    dateTime: "Tue 9:00 AM",
    location: "Main Sanctuary",
  },
  {
    id: "2",
    title: "Bible Study",
    dateTime: "Wed 7:00 PM",
    location: "Parish Hall",
  },
  {
    id: "3",
    title: "Youth Group Meeting",
    dateTime: "Fri 6:30 PM",
    location: "TBA",
  },
]

const mockAnnouncements = [
  {
    id: "1",
    title: "Building Fund Update",
    timestamp: "2 hours ago",
    visibility: "public" as const,
  },
  {
    id: "2",
    title: "Volunteer Appreciation Dinner",
    timestamp: "Yesterday",
    visibility: "public" as const,
  },
]

const mockAlerts = [
  {
    id: "1",
    type: "access-request" as const,
    message: "1 access request pending",
    action: "Review now",
  },
]

export default function ThisWeekPage() {
  const [viewMode, setViewMode] = useState<"admin" | "parishioner">("admin")
  const [selectedWeek, setSelectedWeek] = useState("2026-W04")
  const [showPopulatedState, setShowPopulatedState] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Toggle between empty and populated states for demo
  const serveItems = showPopulatedState ? mockServeItems : []
  const events = showPopulatedState ? mockEvents : []
  const announcements = showPopulatedState ? mockAnnouncements : []
  const alerts = showPopulatedState ? mockAlerts : []

  const completedTasks = serveItems.filter((item) => item.status === "completed").length
  const totalTasks = serveItems.length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />

      <main className="flex-1 overflow-auto">
        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-4 flex items-start justify-between gap-4 sm:mb-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Paxora Parish OS
                </p>
                <h1 className="text-xl font-semibold text-foreground sm:text-2xl">This Week</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Demo toggle for populated/empty states */}
              <button
                onClick={() => setShowPopulatedState(!showPopulatedState)}
                className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 sm:px-3 sm:py-1.5"
              >
                <span className="hidden sm:inline">
                  {showPopulatedState ? "Show Empty State" : "Show Populated State"}
                </span>
                <span className="sm:hidden">
                  {showPopulatedState ? "Empty" : "Populated"}
                </span>
              </button>
            </div>
          </div>

          {/* Admin Alert Banner */}
          {viewMode === "admin" && <AdminAlertBanner alerts={alerts} />}

          {/* Hero Card */}
          <ThisWeekHero
            weekLabel={selectedWeek}
            dateRange="Jan 19 – Jan 25"
            updatedAt="3:19 AM"
            completedTasks={completedTasks}
            totalTasks={totalTasks}
            completionPercentage={completionPercentage}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />

          {/* Main Content Grid - Stack on mobile, 2 cols on lg */}
          <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
            {/* Serve Section */}
            <ServePreviewCard items={serveItems} />

            {/* Events Section */}
            <EventsPreviewCard events={events} />
          </div>

          {/* Announcements Section - Full Width */}
          <div className="mt-4 sm:mt-6">
            <AnnouncementsPanel announcements={announcements} />
          </div>
        </div>
      </main>
    </div>
  )
}
