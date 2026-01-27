import Link from "next/link";
import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import EventDeleteForm from "@/components/calendar/EventDeleteForm";
import { getEventById } from "@/lib/queries/events";
import { authOptions } from "@/server/auth/options";

type DeleteEventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function DeleteEventPage({ params }: DeleteEventPageProps) {
  const { eventId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const event = await getEventById({ id: eventId, userId: session.user.id });

  if (!event || event.parishId !== session.user.activeParishId || !event.canManage) {
    return (
      <div className="section-gap">
        <EmptyState
          title="Event not available"
          description="You do not have permission to delete this event."
          action={
            <Link href="/calendar">
              <Button variant="secondary">Back to calendar</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Delete event" subtitle="Remove a calendar item" />
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink-900">{event.title}</h2>
          <EventDeleteForm event={event} />
        </div>
      </Card>
    </div>
  );
}
