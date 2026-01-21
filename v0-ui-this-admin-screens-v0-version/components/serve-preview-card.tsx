import {
  CheckSquare,
  Clock,
  Eye,
  EyeOff,
  MoreHorizontal,
  RefreshCw,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ServeItem {
  id: string
  title: string
  status: "open" | "in-progress" | "completed"
  visibility: "public" | "private"
  assignee: { name: string; initials: string } | null
  volunteers: { current: number; needed: number }
  dueDate: string
}

interface ServePreviewCardProps {
  items: ServeItem[]
}

const statusConfig = {
  open: {
    label: "Open",
    className: "bg-stone-100 text-stone-700 border-stone-200",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
}

export function ServePreviewCard({ items }: ServePreviewCardProps) {
  const activeCount = items.filter((item) => item.status !== "completed").length

  if (items.length === 0) {
    return (
      <Card className="border-stone-200 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">Serve</CardTitle>
              <span className="text-xs text-muted-foreground sm:text-sm">0 active</span>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs font-medium text-emerald-600 sm:text-sm">
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center sm:px-6 sm:py-12">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-stone-100 sm:mb-4 sm:size-12">
              <CheckSquare className="size-5 text-stone-400 sm:size-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              No serve items for this week
            </h3>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground sm:mt-2 sm:text-sm">
              Capture what needs to happen and keep your parish teams aligned.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                Add a serve item
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <RefreshCw className="size-4" />
                Reuse last week
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
            <CardTitle className="text-base sm:text-lg">Serve</CardTitle>
            <span className="text-xs text-muted-foreground sm:text-sm">{activeCount} active</span>
          </div>
          <Button variant="link" className="h-auto p-0 text-xs font-medium text-emerald-600 sm:text-sm">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        {items.slice(0, 3).map((item) => (
          <ServeRow key={item.id} item={item} />
        ))}
        {items.length > 3 && (
          <p className="pt-1 text-center text-xs text-muted-foreground sm:pt-2 sm:text-sm">
            +{items.length - 3} more items
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ServeRow({ item }: { item: ServeItem }) {
  const status = statusConfig[item.status]

  return (
    <div className="group rounded-lg border border-stone-100 bg-stone-50/50 p-2.5 transition-colors hover:bg-stone-50 sm:p-3">
      {/* Mobile: Stack layout */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-foreground">{item.title}</h4>
          {/* Badges wrap on mobile */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-2 sm:gap-2">
            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", status.className)}>
              {status.label}
            </Badge>
            <Badge
              variant="outline"
              className="hidden gap-1 border-stone-200 bg-stone-50 text-[10px] text-stone-600 sm:flex sm:text-xs"
            >
              {item.visibility === "public" ? (
                <Eye className="size-3" />
              ) : (
                <EyeOff className="size-3" />
              )}
              {item.visibility === "public" ? "Public" : "Private"}
            </Badge>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
              <Users className="size-3" />
              {item.volunteers.current}/{item.volunteers.needed}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
              <Clock className="size-3" />
              {item.dueDate}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {item.assignee ? (
            <Avatar className="size-5 sm:size-6">
              <AvatarFallback className="bg-emerald-100 text-[10px] text-emerald-700 sm:text-xs">
                {item.assignee.initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="hidden text-xs text-muted-foreground sm:inline">Unassigned</span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <MoreHorizontal className="size-4 text-muted-foreground" />
            <span className="sr-only">Actions</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
