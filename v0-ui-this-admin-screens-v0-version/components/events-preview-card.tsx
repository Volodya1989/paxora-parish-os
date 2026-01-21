import { Calendar, MapPin, MoreHorizontal, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Event {
  id: string
  title: string
  dateTime: string
  location: string
}

interface EventsPreviewCardProps {
  events: Event[]
}

export function EventsPreviewCard({ events }: EventsPreviewCardProps) {
  if (events.length === 0) {
    return (
      <Card className="border-stone-200 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">Events</CardTitle>
              <span className="text-xs text-muted-foreground sm:text-sm">0 scheduled</span>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs font-medium text-emerald-600 sm:text-sm">
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center sm:px-6 sm:py-12">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-stone-100 sm:mb-4 sm:size-12">
              <Calendar className="size-5 text-stone-400 sm:size-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              No events scheduled this week
            </h3>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground sm:mt-2 sm:text-sm">
              Plan services, rehearsals, and gatherings so everyone stays in sync.
            </p>
            <Button className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700 sm:mt-6">
              <Plus className="size-4" />
              Add event
            </Button>
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
            <CardTitle className="text-base sm:text-lg">Events</CardTitle>
            <span className="text-xs text-muted-foreground sm:text-sm">{events.length} scheduled</span>
          </div>
          <Button variant="link" className="h-auto p-0 text-xs font-medium text-emerald-600 sm:text-sm">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        {events.slice(0, 3).map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
        {events.length > 3 && (
          <p className="pt-1 text-center text-xs text-muted-foreground sm:pt-2 sm:text-sm">
            +{events.length - 3} more events
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function EventRow({ event }: { event: Event }) {
  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/50 p-2.5 transition-colors hover:bg-stone-50 sm:gap-3 sm:p-3">
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
        <div className="flex shrink-0 flex-col items-center rounded-md bg-emerald-50 px-2 py-1 sm:px-2.5 sm:py-1.5">
          <span className="text-[10px] font-semibold uppercase text-emerald-700 sm:text-xs">
            {event.dateTime.split(" ")[0]}
          </span>
          <span className="text-[10px] font-medium text-emerald-600 sm:text-xs">
            {event.dateTime.split(" ").slice(1).join(" ")}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-foreground">{event.title}</h4>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">
              {event.location === "TBA" ? "Location TBA" : event.location}
            </span>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
        <span className="sr-only">Actions</span>
      </Button>
    </div>
  )
}
