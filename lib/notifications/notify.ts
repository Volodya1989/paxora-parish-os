import { prisma } from "@/server/db/prisma";
import { EventVisibility, NotificationType } from "@prisma/client";
import { getRequestStatusLabel } from "@/lib/requests/utils";
import {
  filterEventAudienceForCandidates,
  resolveAnnouncementAudience,
  resolveChatAudience,
  resolveEventAudience,
  resolveTaskWatcherAudience,
  type AudienceRecipient
} from "@/lib/notifications/audience";

const notificationPreferenceFieldByType = {
  [NotificationType.MESSAGE]: "notifyMessageInApp",
  [NotificationType.TASK]: "notifyTaskInApp",
  [NotificationType.ANNOUNCEMENT]: "notifyAnnouncementInApp",
  [NotificationType.EVENT]: "notifyEventInApp",
  [NotificationType.REQUEST]: "notifyRequestInApp",
  [NotificationType.MENTION]: "notifyMessageInApp"
} as const;

type NotificationCreateInput = {
  parishId: string;
  type: NotificationType;
  title: string;
  description?: string | null;
  href: string;
  createdAt?: Date;
};

async function createNotificationsForUsers(
  userIds: string[],
  input: NotificationCreateInput
) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return;

  const preferenceField = notificationPreferenceFieldByType[input.type];
  const recipients = await prisma.user.findMany({
    where: {
      id: { in: uniqueUserIds },
      [preferenceField]: true
    },
    select: { id: true }
  });

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map(({ id: userId }) => ({
      userId,
      parishId: input.parishId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      href: input.href,
      createdAt: input.createdAt ?? new Date()
    }))
  });
}

async function createNotificationsForAudience(
  recipients: AudienceRecipient[],
  input: NotificationCreateInput
) {
  await createNotificationsForUsers(
    recipients.map((recipient) => recipient.userId),
    input
  );
}


export async function notifyGroupInviteSentInApp(opts: {
  parishId: string;
  groupId: string;
  groupName: string;
  inviteeUserId: string;
  inviterUserId: string;
  inviterName: string;
}) {
  const { parishId, groupId, groupName, inviteeUserId, inviterUserId, inviterName } = opts;
  if (inviteeUserId === inviterUserId) return;

  await createNotificationsForUsers([inviteeUserId], {
    parishId,
    type: NotificationType.REQUEST,
    title: "Group invite",
    description: `${inviterName} invited you to join ${groupName}`,
    href: `/groups/${groupId}`
  });
}

export async function notifyGroupInviteResponseInApp(opts: {
  parishId: string;
  groupId: string;
  groupName: string;
  inviterUserId: string;
  responderUserId: string;
  responderName: string;
  response: "accepted" | "declined";
}) {
  const { parishId, groupId, groupName, inviterUserId, responderUserId, responderName, response } = opts;
  if (inviterUserId === responderUserId) return;

  await createNotificationsForUsers([inviterUserId], {
    parishId,
    type: NotificationType.REQUEST,
    title: response === "accepted" ? "Group invite accepted" : "Group invite declined",
    description:
      response === "accepted"
        ? `${responderName} accepted your invite to ${groupName}`
        : `${responderName} declined your invite to ${groupName}`,
    href: `/groups/${groupId}/members`
  });
}

export async function notifyChatMessageInApp(opts: {
  channelId: string;
  authorId: string;
  authorName: string;
  channelName: string;
  parishId: string;
  messageBody: string;
  channelType?: string;
}) {
  const { channelId, authorId, channelName, parishId, messageBody, channelType } = opts;
  const recipients = await resolveChatAudience({ channelId, actorId: authorId });
  if (recipients.length === 0) return;

  const truncatedBody =
    messageBody.length > 100 ? `${messageBody.slice(0, 97)}...` : messageBody;
  const sanitizedBody =
    channelType === "GROUP"
      ? `New message in ${channelName}`
      : truncatedBody;

  await createNotificationsForAudience(recipients, {
    parishId,
    type: NotificationType.MESSAGE,
    title: `${opts.authorName} in ${channelName}`,
    description: sanitizedBody,
    href: `/community/chat?channel=${channelId}`
  });
}

export async function notifyTaskCreatedInApp(opts: {
  taskId: string;
  taskTitle: string;
  parishId: string;
  createdById: string;
  creatorName: string;
  ownerId?: string;
}) {
  const { taskId, taskTitle, parishId, createdById, creatorName, ownerId } = opts;

  if (!ownerId || ownerId === createdById) return;

  await createNotificationsForUsers([ownerId], {
    parishId,
    type: NotificationType.TASK,
    title: "New task assigned to you",
    description: `${creatorName} assigned you: ${taskTitle}`,
    href: `/tasks?taskId=${taskId}`
  });
}

export async function notifyTaskAssignedInApp(opts: {
  taskId: string;
  taskTitle: string;
  parishId: string;
  actorId: string;
  actorName: string;
  ownerId: string;
}) {
  const { taskId, taskTitle, parishId, actorId, actorName, ownerId } = opts;

  if (ownerId === actorId) return;

  await createNotificationsForUsers([ownerId], {
    parishId,
    type: NotificationType.TASK,
    title: "Task assigned to you",
    description: `${actorName} assigned you: ${taskTitle}`,
    href: `/tasks?taskId=${taskId}`
  });
}

export async function notifyAnnouncementPublishedInApp(opts: {
  announcementId: string;
  title: string;
  parishId: string;
  publisherId: string;
}) {
  const { title, parishId, publisherId, announcementId } = opts;

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, parishId },
    select: { audienceUserIds: true }
  });
  if (!announcement) return;

  const recipients = await resolveAnnouncementAudience({
    parishId,
    audienceUserIds: announcement.audienceUserIds,
    actorId: publisherId
  });

  await createNotificationsForAudience(recipients, {
    parishId,
    type: NotificationType.ANNOUNCEMENT,
    title: "New announcement",
    description: title,
    href: "/announcements"
  });
}

export async function notifyEventCreatedInApp(opts: {
  eventId: string;
  eventTitle: string;
  parishId: string;
  creatorId: string;
  visibility: EventVisibility;
  groupId?: string | null;
}) {
  const { eventId, eventTitle, parishId, creatorId, visibility, groupId } = opts;

  const recipients = await resolveEventAudience({
    parishId,
    visibility,
    groupId,
    eventId,
    actorId: creatorId
  });

  await createNotificationsForAudience(recipients, {
    parishId,
    type: NotificationType.EVENT,
    title: "New event",
    description: eventTitle,
    href: "/calendar"
  });
}

export async function notifyEventReminderInApp(opts: {
  eventId: string;
  eventTitle: string;
  parishId: string;
  recipientIds: string[];
  startsAtLabel: string;
}) {
  const { eventId, eventTitle, parishId, recipientIds, startsAtLabel } = opts;

  const recipients = await filterEventAudienceForCandidates({
    eventId,
    parishId,
    candidateUserIds: recipientIds
  });

  await createNotificationsForAudience(recipients, {
    parishId,
    type: NotificationType.EVENT,
    title: "Event reminder",
    description: `${eventTitle} • ${startsAtLabel}`,
    href: "/calendar"
  });
}

export async function notifyRequestAssignedInApp(opts: {
  requestId: string;
  requestTitle: string;
  parishId: string;
  assigneeId: string;
}) {
  const { requestId, requestTitle, parishId, assigneeId } = opts;

  await createNotificationsForUsers([assigneeId], {
    parishId,
    type: NotificationType.REQUEST,
    title: "New request assigned to you",
    description: requestTitle,
    href: `/admin/requests?requestId=${requestId}`
  });
}

export async function notifyRequestStatusUpdatedInApp(opts: {
  requestId: string;
  requestTitle: string;
  parishId: string;
  requesterId: string;
  status: "SUBMITTED" | "ACKNOWLEDGED" | "SCHEDULED" | "COMPLETED" | "CANCELED";
}) {
  const { requestId, requestTitle, parishId, requesterId, status } = opts;

  await createNotificationsForUsers([requesterId], {
    parishId,
    type: NotificationType.REQUEST,
    title: `Request ${getRequestStatusLabel(status).toLowerCase()}: ${requestTitle}`,
    description: "View the latest update.",
    href: `/requests/${requestId}`
  });
}

export async function notifyContentRequestSubmittedInApp(opts: {
  parishId: string;
  requesterId: string;
  title: string;
  href: string;
}) {
  const leaders = await prisma.membership.findMany({
    where: {
      parishId: opts.parishId,
      role: { in: ["ADMIN", "SHEPHERD"] }
    },
    select: { userId: true }
  });

  const recipients = leaders.map((member) => member.userId).filter((id) => id !== opts.requesterId);

  await createNotificationsForUsers(recipients, {
    parishId: opts.parishId,
    type: NotificationType.REQUEST,
    title: "New creation request submitted",
    description: opts.title,
    href: opts.href
  });
}

export async function notifyContentRequestDecisionInApp(opts: {
  parishId: string;
  requesterId: string;
  title: string;
  decision: "APPROVED" | "DECLINED";
  href: string;
}) {
  await createNotificationsForUsers([opts.requesterId], {
    parishId: opts.parishId,
    type: NotificationType.REQUEST,
    title: `Request ${opts.decision.toLowerCase()}`,
    description: opts.title,
    href: opts.href
  });
}


export async function notifyMentionInApp(opts: {
  parishId: string;
  recipientIds: string[];
  actorName: string;
  description?: string | null;
  href: string;
}) {
  const recipients = opts.recipientIds.filter(Boolean);
  if (recipients.length === 0) return;

  await createNotificationsForUsers(recipients, {
    parishId: opts.parishId,
    type: NotificationType.MENTION,
    title: `You were mentioned by ${opts.actorName}`,
    description: opts.description ?? null,
    href: opts.href
  });
}

export async function notifyTaskCommentInApp(opts: {
  taskId: string;
  parishId: string;
  actorId: string;
  actorName: string;
  body: string;
  href?: string;
}) {
  const recipients = await resolveTaskWatcherAudience({
    taskId: opts.taskId,
    parishId: opts.parishId,
    actorId: opts.actorId
  });

  if (recipients.length === 0) return;

  const snippet = opts.body.length > 100 ? `${opts.body.slice(0, 97)}...` : opts.body;
  await createNotificationsForAudience(recipients, {
    parishId: opts.parishId,
    type: NotificationType.TASK,
    title: `${opts.actorName} commented on a serve card`,
    description: snippet,
    href: opts.href ?? `/tasks?taskId=${opts.taskId}`
  });
}

export async function notifyTaskStatusChangedInApp(opts: {
  taskId: string;
  parishId: string;
  actorId: string;
  actorName: string;
  taskTitle: string;
  statusLabel: string;
}) {
  const recipients = await resolveTaskWatcherAudience({
    taskId: opts.taskId,
    parishId: opts.parishId,
    actorId: opts.actorId
  });

  if (recipients.length === 0) return;

  await createNotificationsForAudience(recipients, {
    parishId: opts.parishId,
    type: NotificationType.TASK,
    title: `${opts.actorName} updated a serve card`,
    description: `${opts.taskTitle} is now ${opts.statusLabel}`,
    href: `/tasks?taskId=${opts.taskId}`
  });
}
