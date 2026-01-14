import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import type { CommunityRoomPreview } from "@/lib/queries/home";

// TODO: Switch to the community chat route once A-014 ships.
const COMMUNITY_ROUTE = "/groups";

export default function CommunityPreview({ rooms }: { rooms: CommunityRoomPreview[] }) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-h3">Community</h3>
            <p className="text-xs text-ink-400">Stay connected in parish rooms.</p>
          </div>
          <Link className="text-sm font-medium text-ink-700 underline" href={COMMUNITY_ROUTE}>
            Open chat
          </Link>
        </div>

        {rooms.length === 0 ? (
          <EmptyState
            title="Community chat coming soon"
            description="Rooms will appear here once chat is enabled for your parish."
            className="border-mist-100"
            action={
              <Link className="text-sm font-medium text-ink-700 underline" href={COMMUNITY_ROUTE}>
                Learn more
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {rooms.slice(0, 3).map((room) => (
              <div
                key={room.id}
                className="flex items-start justify-between gap-3 rounded-card border border-mist-100 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{room.name}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {room.lastMessage ?? "No messages yet."}
                  </p>
                </div>
                {room.unreadCount ? (
                  <Badge tone="warning">{room.unreadCount} new</Badge>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
