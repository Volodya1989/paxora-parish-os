import Link from "next/link";
import { getServerSession } from "next-auth";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import EventDeleteForm from "@/components/calendar/EventDeleteForm";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { resolveEventDeleteAuthorization } from "@/server/actions/events";

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

  const membership = await getParishMembership(session.user.activeParishId, session.user.id);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  const authorization = await resolveEventDeleteAuthorization({
    eventId,
    parishId: session.user.activeParishId,
    userId: session.user.id,
    userRole: membership.role
  });

  if (authorization.status === "not_found") {
    return (
      <div className="section-gap">
        <EmptyState
          title="Event not found"
          description="This event may have already been removed."
          action={
            <Link href="/calendar">
              <Button variant="secondary">Back to calendar</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (authorization.status === "forbidden") {
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
      <EventDeleteForm event={authorization.event} />
    </div>
  );
}
