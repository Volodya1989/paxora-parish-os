import { Eye, FileText, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Announcement {
  id: string
  title: string
  timestamp: string
  visibility: "public" | "draft"
}

interface AnnouncementsPanelProps {
  announcements: Announcement[]
}

export function AnnouncementsPanel({ announcements }: AnnouncementsPanelProps) {
  if (announcements.length === 0) {
    return (
      <Card className="border-stone-200 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">Announcements</CardTitle>
              <span className="text-xs text-muted-foreground sm:text-sm">0 announcements</span>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs font-medium text-emerald-600 sm:text-sm">
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center sm:px-6 sm:py-12">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-stone-100 sm:mb-4 sm:size-12">
              <Send className="size-5 text-stone-400 sm:size-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground sm:text-base">Share a parish update</h3>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground sm:mt-2 sm:text-sm">
              Draft announcements to keep parishioners informed and in the loop.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                Create announcement
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <FileText className="size-4" />
                View drafts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-stone-200 bg-white">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base sm:text-lg">Announcements</CardTitle>
            <span className="text-xs text-muted-foreground sm:text-sm">
              {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button variant="link" className="h-auto p-0 text-xs font-medium text-emerald-600 sm:text-sm">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {announcements.slice(0, 3).map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
          {/* Quick add card */}
          <button className="flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-200 bg-stone-50/50 p-3 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 sm:min-h-[100px] sm:gap-2 sm:p-4">
            <div className="flex size-7 items-center justify-center rounded-full bg-stone-100 sm:size-8">
              <Send className="size-3.5 text-stone-500 sm:size-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">
              Create announcement
            </span>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <div className="flex flex-col rounded-lg border border-stone-100 bg-stone-50/50 p-3 transition-colors hover:bg-stone-50 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-medium text-foreground line-clamp-2 sm:text-sm">{announcement.title}</h4>
        <Badge
          variant="outline"
          className="shrink-0 gap-1 border-stone-200 bg-stone-50 text-[10px] text-stone-600 sm:text-xs"
        >
          <Eye className="size-3" />
          <span className="hidden sm:inline">
            {announcement.visibility === "public" ? "Public" : "Draft"}
          </span>
        </Badge>
      </div>
      <p className="mt-auto pt-2 text-[10px] text-muted-foreground sm:pt-3 sm:text-xs">{announcement.timestamp}</p>
    </div>
  )
}
