import Link from "next/link";
import { getServerSession } from "next-auth";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import EventDetailCard from "@/components/events/EventDetailCard";
import { getEventById } from "@/lib/queries/events";
import { authOptions } from "@/server/auth/options";

type EventDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const event = await getEventById({ id, userId: session.user.id });

  if (!event || event.parishId !== session.user.activeParishId) {
    return (
      <div className="section-gap max-w-3xl">
        <EmptyState
          title="Event not found"
          description="We couldn’t locate that event. Return to the calendar to pick another date."
          action={
            <Link href="/calendar">
              <Button variant="secondary">Back to Calendar</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="section-gap max-w-3xl">
      <Link className="text-sm font-medium text-ink-700 underline" href="/calendar">
        Back to Calendar
      </Link>
      <EventDetailCard event={event} />
    </div>
  );
}
