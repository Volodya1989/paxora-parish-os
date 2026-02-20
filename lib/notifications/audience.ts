import { prisma } from "@/server/db/prisma";
import { EventVisibility } from "@prisma/client";

export type AudienceRecipientReason =
  | "parish_member"
  | "channel_member"
  | "group_member"
  | "event_participant"
  | "announcement_audience"
  | "task_creator"
  | "task_assignee"
  | "task_volunteer";

export type AudienceRecipient = {
  userId: string;
  reason: AudienceRecipientReason;
};

function dedupeRecipients(recipients: AudienceRecipient[]): AudienceRecipient[] {
  const byUser = new Map<string, AudienceRecipient>();
  for (const recipient of recipients) {
    if (!byUser.has(recipient.userId)) {
      byUser.set(recipient.userId, recipient);
    }
  }
  return [...byUser.values()];
}

function withoutActor(recipients: AudienceRecipient[], actorId?: string | null): AudienceRecipient[] {
  if (!actorId) return recipients;
  return recipients.filter((recipient) => recipient.userId !== actorId);
}

export async function resolveParishAudience(parishId: string): Promise<AudienceRecipient[]> {
  const members = await prisma.membership.findMany({
    where: { parishId },
    select: { userId: true }
  });

  return members.map((member) => ({ userId: member.userId, reason: "parish_member" }));
}

export async function resolveChatAudience(opts: {
  channelId: string;
  actorId?: string;
  atTime?: Date;
}): Promise<AudienceRecipient[]> {
  const channel = await prisma.chatChannel.findUnique({
    where: { id: opts.channelId },
    select: { id: true, parishId: true, type: true, groupId: true }
  });

  if (!channel) return [];

  if (channel.type === "GROUP" && channel.groupId) {
    const members = await prisma.groupMembership.findMany({
      where: {
        groupId: channel.groupId,
        status: "ACTIVE",
        ...(opts.atTime ? { createdAt: { lte: opts.atTime } } : {})
      },
      select: { userId: true }
    });

    return withoutActor(
      dedupeRecipients(members.map((member) => ({ userId: member.userId, reason: "group_member" }))),
      opts.actorId
    );
  }

  const channelMembers = await prisma.chatChannelMembership.findMany({
    where: {
      channelId: channel.id,
      ...(opts.atTime ? { createdAt: { lte: opts.atTime } } : {})
    },
    select: { userId: true }
  });

  const baseAudience =
    channelMembers.length > 0
      ? channelMembers.map((member) => ({ userId: member.userId, reason: "channel_member" as const }))
      : (await prisma.membership.findMany({
          where: {
            parishId: channel.parishId,
            ...(opts.atTime ? { createdAt: { lte: opts.atTime } } : {})
          },
          select: { userId: true }
        })).map((member) => ({ userId: member.userId, reason: "parish_member" as const }));

  return withoutActor(dedupeRecipients(baseAudience), opts.actorId);
}

export async function resolveAnnouncementAudience(opts: {
  parishId: string;
  audienceUserIds?: string[] | null;
  actorId?: string;
}): Promise<AudienceRecipient[]> {
  const audienceIds = (opts.audienceUserIds ?? []).filter(Boolean);
  const recipients =
    audienceIds.length > 0
      ? (
        await prisma.membership.findMany({
          where: { parishId: opts.parishId, userId: { in: audienceIds } },
          select: { userId: true }
        })
      ).map((membership) => ({ userId: membership.userId, reason: "announcement_audience" as const }))
      : await resolveParishAudience(opts.parishId);

  return withoutActor(dedupeRecipients(recipients), opts.actorId);
}

export async function resolveEventAudience(opts: {
  parishId: string;
  visibility: EventVisibility;
  groupId?: string | null;
  eventId?: string;
  actorId?: string;
}): Promise<AudienceRecipient[]> {
  let recipients: AudienceRecipient[] = [];

  if (opts.visibility === "PUBLIC") {
    recipients = await resolveParishAudience(opts.parishId);
  } else if (opts.visibility === "GROUP" && opts.groupId) {
    const members = await prisma.groupMembership.findMany({
      where: { groupId: opts.groupId, status: "ACTIVE" },
      select: { userId: true }
    });
    recipients = members.map((member) => ({ userId: member.userId, reason: "group_member" }));
  } else if (opts.visibility === "PRIVATE" && opts.eventId) {
    const participants = await prisma.eventRsvp.findMany({
      where: { eventId: opts.eventId },
      select: { userId: true }
    });
    recipients = participants.map((participant) => ({ userId: participant.userId, reason: "event_participant" }));
  }

  return withoutActor(dedupeRecipients(recipients), opts.actorId);
}

export async function filterEventAudienceForCandidates(opts: {
  eventId: string;
  parishId: string;
  candidateUserIds: string[];
  actorId?: string;
}): Promise<AudienceRecipient[]> {
  if (opts.candidateUserIds.length === 0) return [];

  const event = await prisma.event.findFirst({
    where: { id: opts.eventId, parishId: opts.parishId, deletedAt: null },
    select: { id: true, visibility: true, groupId: true }
  });

  if (!event) return [];

  const audience = await resolveEventAudience({
    parishId: opts.parishId,
    visibility: event.visibility,
    groupId: event.groupId,
    eventId: event.id,
    actorId: opts.actorId
  });

  const candidates = new Set(opts.candidateUserIds);
  return audience.filter((recipient) => candidates.has(recipient.userId));
}

export async function resolveTaskWatcherAudience(opts: {
  taskId: string;
  parishId: string;
  actorId?: string;
}): Promise<AudienceRecipient[]> {
  const task = await prisma.task.findFirst({
    where: { id: opts.taskId, parishId: opts.parishId },
    select: {
      createdById: true,
      ownerId: true,
      volunteers: { select: { userId: true } }
    }
  });

  if (!task) return [];

  const recipients: AudienceRecipient[] = [
    { userId: task.createdById, reason: "task_creator" }
  ];

  if (task.ownerId) {
    recipients.push({ userId: task.ownerId, reason: "task_assignee" });
  }

  for (const volunteer of task.volunteers) {
    recipients.push({ userId: volunteer.userId, reason: "task_volunteer" });
  }

  return withoutActor(dedupeRecipients(recipients), opts.actorId);
}
