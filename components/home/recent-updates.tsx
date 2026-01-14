import Link from "next/link";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import type { HomeRecentUpdate } from "@/lib/queries/home";

const typeLabels: Record<HomeRecentUpdate["type"], string> = {
  task: "Task",
  event: "Event",
  announcement: "Announcement"
};

function formatTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function getTypeInitial(type: HomeRecentUpdate["type"]) {
  return typeLabels[type].charAt(0);
}

export default function RecentUpdates({ updates }: { updates: HomeRecentUpdate[] }) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-h3">Recent updates</h3>
          <p className="text-xs text-ink-400">Recent activity across tasks, events, and announcements.</p>
        </div>
        {updates.length === 0 ? (
          <EmptyState
            title="No recent updates"
            description="New tasks, events, and announcements will show up here."
            className="border-mist-100"
          />
        ) : (
          <div className="space-y-3">
            {updates.map((update) => (
              <div
                key={`${update.type}-${update.id}`}
                className="flex items-start justify-between gap-4 rounded-card border border-mist-100 bg-white px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist-100 text-xs font-semibold text-ink-600">
                    {getTypeInitial(update.type)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {update.href ? (
                        <Link className="hover:underline" href={update.href}>
                          {update.title}
                        </Link>
                      ) : (
                        update.title
                      )}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">{typeLabels[update.type]}</p>
                  </div>
                </div>
                <span className="text-xs text-ink-400">{formatTimestamp(update.occurredAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
