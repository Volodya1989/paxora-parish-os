import { prisma } from "@/server/db/prisma";
import { sendPushToUsers, type PushPayload } from "./sendPush";

/**
 * Notify chat channel members when a new message is posted.
 * Excludes the message author.
 */
export async function notifyChatMessage(opts: {
  channelId: string;
  authorId: string;
  authorName: string;
  channelName: string;
  parishId: string;
  messageBody: string;
}) {
  const { channelId, authorId, channelName, parishId, messageBody } = opts;

  // Get channel info to determine recipient strategy
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { type: true, groupId: true, parishId: true }
  });

  if (!channel) return;

  let recipientIds: string[] = [];

  if (channel.type === "GROUP" && channel.groupId) {
    // Notify active group members
    const members = await prisma.groupMembership.findMany({
      where: { groupId: channel.groupId, status: "ACTIVE" },
      select: { userId: true }
    });
    recipientIds = members.map((m) => m.userId);
  } else if (channel.type === "ANNOUNCEMENT") {
    // Notify all parish members for announcement channels
    const members = await prisma.membership.findMany({
      where: { parishId },
      select: { userId: true }
    });
    recipientIds = members.map((m) => m.userId);
  } else {
    // PARISH channel: check if it has explicit memberships
    const channelMembers = await prisma.chatChannelMembership.findMany({
      where: { channelId },
      select: { userId: true }
    });

    if (channelMembers.length > 0) {
      recipientIds = channelMembers.map((m) => m.userId);
    } else {
      // Open parish channel - notify all parish members
      const members = await prisma.membership.findMany({
        where: { parishId },
        select: { userId: true }
      });
      recipientIds = members.map((m) => m.userId);
    }
  }

  // Exclude the author
  recipientIds = recipientIds.filter((id) => id !== authorId);

  if (recipientIds.length === 0) return;

  const truncatedBody =
    messageBody.length > 100 ? `${messageBody.slice(0, 97)}...` : messageBody;

  const payload: PushPayload = {
    title: `${opts.authorName} in ${channelName}`,
    body: truncatedBody,
    url: `/community/chat?channel=${channelId}`,
    tag: `chat-${channelId}`
  };

  await sendPushToUsers(recipientIds, parishId, payload);
}

/**
 * Notify when a task is created and assigned to someone other than the creator.
 */
export async function notifyTaskCreated(opts: {
  taskId: string;
  taskTitle: string;
  parishId: string;
  createdById: string;
  creatorName: string;
  ownerId?: string;
}) {
  const { taskId, taskTitle, parishId, createdById, creatorName, ownerId } = opts;

  if (!ownerId || ownerId === createdById) return;

  const payload: PushPayload = {
    title: "New task assigned to you",
    body: `${creatorName} assigned you: ${taskTitle}`,
    url: `/tasks?taskId=${taskId}`,
    tag: `task-${taskId}`
  };

  await sendPushToUsers([ownerId], parishId, payload);
}

/**
 * Notify when a task is assigned to a user (not self-assign).
 */
export async function notifyTaskAssigned(opts: {
  taskId: string;
  taskTitle: string;
  parishId: string;
  actorId: string;
  actorName: string;
  ownerId: string;
}) {
  const { taskId, taskTitle, parishId, actorId, actorName, ownerId } = opts;

  if (ownerId === actorId) return;

  const payload: PushPayload = {
    title: "Task assigned to you",
    body: `${actorName} assigned you: ${taskTitle}`,
    url: `/tasks?taskId=${taskId}`,
    tag: `task-${taskId}`
  };

  await sendPushToUsers([ownerId], parishId, payload);
}

/**
 * Notify when an announcement is published.
 * Sends to all parish members except the publisher.
 */
export async function notifyAnnouncementPublished(opts: {
  announcementId: string;
  title: string;
  parishId: string;
  publisherId: string;
}) {
  const { title, parishId, publisherId } = opts;

  const members = await prisma.membership.findMany({
    where: { parishId },
    select: { userId: true }
  });

  const recipientIds = members.map((m) => m.userId).filter((id) => id !== publisherId);

  if (recipientIds.length === 0) return;

  const payload: PushPayload = {
    title: "New Announcement",
    body: title,
    url: "/announcements",
    tag: "announcement"
  };

  await sendPushToUsers(recipientIds, parishId, payload);
}

/**
 * Notify when a new event is created.
 * PUBLIC events: all parish members. GROUP events: group members.
 */
export async function notifyEventCreated(opts: {
  eventId: string;
  eventTitle: string;
  parishId: string;
  creatorId: string;
  visibility: string;
  groupId?: string | null;
}) {
  const { eventTitle, parishId, creatorId, visibility, groupId } = opts;

  let recipientIds: string[] = [];

  if (visibility === "GROUP" && groupId) {
    const members = await prisma.groupMembership.findMany({
      where: { groupId, status: "ACTIVE" },
      select: { userId: true }
    });
    recipientIds = members.map((m) => m.userId);
  } else if (visibility === "PUBLIC") {
    const members = await prisma.membership.findMany({
      where: { parishId },
      select: { userId: true }
    });
    recipientIds = members.map((m) => m.userId);
  }

  recipientIds = recipientIds.filter((id) => id !== creatorId);

  if (recipientIds.length === 0) return;

  const payload: PushPayload = {
    title: "New Event",
    body: eventTitle,
    url: "/calendar",
    tag: "event"
  };

  await sendPushToUsers(recipientIds, parishId, payload);
}


export async function notifyCreationRequest(opts: {
  parishId: string;
  recipientIds: string[];
  title: string;
  body: string;
  url: string;
  tag: string;
}) {
  const { parishId, recipientIds, title, body, url, tag } = opts;
  if (recipientIds.length === 0) return;

  const payload: PushPayload = {
    title,
    body,
    url,
    tag
  };

  await sendPushToUsers(recipientIds, parishId, payload);
}

export async function notifyRequestAssigned(opts: {
  requestId: string;
  requestTitle: string;
  parishId: string;
  assigneeId: string;
}) {
  const { requestId, requestTitle, parishId, assigneeId } = opts;

  const payload: PushPayload = {
    title: "New request assigned to you",
    body: requestTitle,
    url: `/requests/${requestId}`,
    tag: `request-${requestId}`
  };

  await sendPushToUsers([assigneeId], parishId, payload);
}

export async function notifyRequestReminder(opts: {
  requestId: string;
  requestTitle: string;
  parishId: string;
  recipientIds: string[];
}) {
  const { requestId, requestTitle, parishId, recipientIds } = opts;

  if (recipientIds.length === 0) return;

  const payload: PushPayload = {
    title: "Request reminder",
    body: requestTitle,
    url: `/requests/${requestId}`,
    tag: `request-reminder-${requestId}`
  };

  await sendPushToUsers(recipientIds, parishId, payload);
}

export async function notifyEventReminder(opts: {
  eventId: string;
  eventTitle: string;
  parishId: string;
  recipientIds: string[];
  startsAtLabel: string;
}) {
  const { eventId, eventTitle, parishId, recipientIds, startsAtLabel } = opts;

  if (recipientIds.length === 0) return;

  const payload: PushPayload = {
    title: "Event reminder",
    body: `${eventTitle} · ${startsAtLabel}`,
    url: "/calendar",
    tag: `event-reminder-${eventId}`
  };

  await sendPushToUsers(recipientIds, parishId, payload);
}


export async function notifyMention(opts: {
  parishId: string;
  recipientIds: string[];
  actorName: string;
  contextLabel: string;
  href: string;
}) {
  const recipients = Array.from(new Set(opts.recipientIds.filter(Boolean)));
  if (recipients.length === 0) return;

  const payload: PushPayload = {
    title: `${opts.actorName} mentioned you`,
    body: opts.contextLabel,
    url: opts.href,
    tag: `mention-${opts.contextLabel.slice(0, 20)}`
  };

  await sendPushToUsers(recipients, opts.parishId, payload);
}
