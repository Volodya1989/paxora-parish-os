import Link from "next/link";
import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import EventEditForm from "@/components/calendar/EventEditForm";
import { getEventById } from "@/lib/queries/events";
import { isParishLeader } from "@/lib/permissions";
import { authOptions } from "@/server/auth/options";
import { getParishMembership, listGroupsByParish } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

type EditEventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
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
          description="You do not have permission to edit this event."
          action={
            <Link href="/calendar">
              <Button variant="secondary">Back to calendar</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const membership = await getParishMembership(event.parishId, session.user.id);
  const isLeader = membership ? isParishLeader(membership.role) : false;
  const groupOptions = isLeader
    ? await listGroupsByParish(event.parishId)
    : (
        await prisma.groupMembership.findMany({
          where: {
            userId: session.user.id,
            status: "ACTIVE",
            group: { parishId: event.parishId }
          },
          select: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
      ).map((membershipRecord) => membershipRecord.group);
  const canCreateGroupEvents = isLeader || groupOptions.length > 0;

  return (
    <div className="space-y-6">
      <SectionTitle title="Edit event" subtitle="Update calendar details" />
      <Card>
        <EventEditForm
          event={event}
          groupOptions={groupOptions}
          canCreatePublicEvents={isLeader}
          canCreatePrivateEvents={isLeader}
          canCreateGroupEvents={canCreateGroupEvents}
        />
      </Card>
    </div>
  );
}
