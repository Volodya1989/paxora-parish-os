"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

const rsvpResponses = ["YES", "MAYBE", "NO"] as const;
export type RsvpResponse = (typeof rsvpResponses)[number];

type SetRsvpInput = {
  eventId: string;
  response: RsvpResponse;
};

export async function setRsvp({ eventId, response }: SetRsvpInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  if (!rsvpResponses.includes(response)) {
    throw new Error("Invalid RSVP response");
  }

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      parishId: session.user.activeParishId
    },
    select: { id: true }
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const updated = await prisma.eventRsvp.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId: session.user.id
      }
    },
    update: {
      response
    },
    create: {
      eventId,
      userId: session.user.id,
      response
    },
    select: {
      response: true
    }
  });

  revalidatePath(`/events/${eventId}`);

  return updated;
}
