import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { createTask } from "@/domain/tasks";
import { getNotificationItems, getNotificationUnreadCount } from "@/lib/queries/notifications";
import { listUnreadCountsForRooms } from "@/lib/queries/chat";
import { markChatRoomReadAndNotifications } from "@/lib/notifications/chat-read";
import {
  notifyAnnouncementPublishedInApp,
  notifyChatMessageInApp,
  notifyEventCreatedInApp,
  notifyRequestAssignedInApp,
  notifyTaskCommentInApp,
  notifyTaskCreatedInApp
} from "@/lib/notifications/notify";
import { deleteNotificationForUser } from "@/lib/notifications/store";
import { applyMigrations } from "./_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.notification.deleteMany();
  await prisma.eventReminder.deleteMany();
  await prisma.eventRsvp.deleteMany();
  await prisma.event.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskVolunteer.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannelMembership.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  await prisma.$connect();
  await resetDatabase();
});

beforeEach(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("task assignment creates stored notifications and read state updates", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Agnes", slug: "st-agnes" }
  });
  const creator = await prisma.user.create({
    data: {
      email: "creator@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const owner = await prisma.user.create({
    data: {
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "ADMIN" },
      { parishId: parish.id, userId: owner.id, role: "MEMBER" }
    ]
  });

  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: new Date("2024-01-01T00:00:00.000Z"),
      endsOn: new Date("2024-01-08T00:00:00.000Z"),
      label: "2024-W01"
    }
  });

  await createTask({
    parishId: parish.id,
    weekId: week.id,
    ownerId: owner.id,
    createdById: creator.id,
    title: "Prepare bulletin",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: owner.id }
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.title, "New task assigned to you");

  const unread = await getNotificationItems(owner.id, parish.id);
  assert.equal(unread.count, 1);
  assert.equal(unread.items.length, 1);
  assert.equal(unread.items[0]?.readAt, null);

  await prisma.notification.update({
    where: { id: notifications[0]!.id },
    data: { readAt: new Date() }
  });

  const afterRead = await getNotificationItems(owner.id, parish.id);
  assert.equal(afterRead.count, 0);
  assert.equal(afterRead.items.length, 1);
  assert.ok(afterRead.items[0]?.readAt);
});

dbTest("chat notifications only go to channel/group members and never actor", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Luke", slug: "st-luke" } });
  const actor = await prisma.user.create({
    data: { email: "actor-chat@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const member = await prisma.user.create({
    data: { email: "member-chat@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const outsider = await prisma.user.create({
    data: { email: "outsider-chat@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: actor.id, role: "MEMBER" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: outsider.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      createdById: actor.id,
      name: "Choir",
      status: "ACTIVE"
    }
  });

  await prisma.groupMembership.createMany({
    data: [
      { groupId: group.id, userId: actor.id, status: "ACTIVE", role: "COORDINATOR" },
      { groupId: group.id, userId: member.id, status: "ACTIVE" }
    ]
  });

  const channel = await prisma.chatChannel.create({
    data: {
      parishId: parish.id,
      groupId: group.id,
      type: "GROUP",
      name: "Choir Chat"
    }
  });

  await notifyChatMessageInApp({
    channelId: channel.id,
    authorId: actor.id,
    authorName: "Actor",
    channelName: "Choir Chat",
    parishId: parish.id,
    messageBody: "Hello choir"
  });

  const [memberNotifications, actorNotifications, outsiderNotifications] = await Promise.all([
    prisma.notification.findMany({ where: { userId: member.id, parishId: parish.id, type: "MESSAGE" } }),
    prisma.notification.findMany({ where: { userId: actor.id, parishId: parish.id, type: "MESSAGE" } }),
    prisma.notification.findMany({ where: { userId: outsider.id, parishId: parish.id, type: "MESSAGE" } })
  ]);

  assert.equal(memberNotifications.length, 1);
  assert.equal(actorNotifications.length, 0);
  assert.equal(outsiderNotifications.length, 0);
});

dbTest("mark chat room read clears room unread state and chat notification badge counts", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Rita", slug: "st-rita" } });
  const actor = await prisma.user.create({
    data: { email: "actor-read@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const reader = await prisma.user.create({
    data: { email: "reader-read@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: actor.id, role: "MEMBER" },
      { parishId: parish.id, userId: reader.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      createdById: actor.id,
      name: "Readers",
      status: "ACTIVE"
    }
  });

  await prisma.groupMembership.createMany({
    data: [
      { groupId: group.id, userId: actor.id, status: "ACTIVE", role: "COORDINATOR" },
      { groupId: group.id, userId: reader.id, status: "ACTIVE", role: "MEMBER" }
    ]
  });

  const channel = await prisma.chatChannel.create({
    data: {
      parishId: parish.id,
      groupId: group.id,
      type: "GROUP",
      name: "Readers Chat"
    }
  });

  const otherChannel = await prisma.chatChannel.create({
    data: {
      parishId: parish.id,
      type: "PARISH",
      name: "General"
    }
  });

  const oldReadAt = new Date("2024-01-01T00:00:00.000Z");
  await prisma.chatRoomReadState.create({
    data: {
      roomId: channel.id,
      userId: reader.id,
      lastReadAt: oldReadAt
    }
  });

  await prisma.chatMessage.create({
    data: {
      channelId: channel.id,
      authorId: actor.id,
      body: "Unread in readers chat",
      createdAt: new Date("2024-01-02T00:00:00.000Z")
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: reader.id,
        parishId: parish.id,
        type: "MESSAGE",
        title: "Chat message",
        description: "Readers update",
        href: `/community/chat?channel=${channel.id}`,
        createdAt: new Date("2024-01-02T00:01:00.000Z")
      },
      {
        userId: reader.id,
        parishId: parish.id,
        type: "MENTION",
        title: "Mention",
        description: "You were mentioned",
        href: `/community/chat?channel=${channel.id}&msg=abc`,
        createdAt: new Date("2024-01-02T00:02:00.000Z")
      },
      {
        userId: reader.id,
        parishId: parish.id,
        type: "MESSAGE",
        title: "Other channel",
        description: "Should remain unread",
        href: `/community/chat?channel=${otherChannel.id}`,
        createdAt: new Date("2024-01-02T00:03:00.000Z")
      }
    ]
  });

  const unreadBefore = await listUnreadCountsForRooms([channel.id], reader.id);
  assert.equal(unreadBefore.get(channel.id), 1);

  const bellBefore = await getNotificationUnreadCount(reader.id, parish.id);
  assert.equal(bellBefore, 3);

  const now = new Date("2024-01-03T00:00:00.000Z");
  const result = await markChatRoomReadAndNotifications({
    userId: reader.id,
    parishId: parish.id,
    channelId: channel.id,
    now
  });

  assert.equal(result.roomId, channel.id);
  assert.equal(result.lastReadAt.toISOString(), now.toISOString());
  assert.equal(result.clearedNotifications, 2);

  const unreadAfter = await listUnreadCountsForRooms([channel.id], reader.id);
  assert.equal(unreadAfter.get(channel.id) ?? 0, 0);

  const bellAfter = await getNotificationUnreadCount(reader.id, parish.id);
  assert.equal(bellAfter, 1);

  const roomMessageNotification = await prisma.notification.findFirst({
    where: {
      userId: reader.id,
      parishId: parish.id,
      href: { contains: `channel=${channel.id}` },
      type: "MESSAGE"
    }
  });
  const roomMentionNotification = await prisma.notification.findFirst({
    where: {
      userId: reader.id,
      parishId: parish.id,
      href: { contains: `channel=${channel.id}` },
      type: "MENTION"
    }
  });
  const otherChannelNotification = await prisma.notification.findFirst({
    where: {
      userId: reader.id,
      parishId: parish.id,
      href: { contains: `channel=${otherChannel.id}` },
      type: "MESSAGE"
    }
  });

  assert.ok(roomMessageNotification?.readAt);
  assert.ok(roomMentionNotification?.readAt);
  assert.equal(otherChannelNotification?.readAt, null);
});

dbTest("announcement notifications honor explicit audience, otherwise broadcast parish-wide", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Mary", slug: "st-mary" } });
  const publisher = await prisma.user.create({
    data: { email: "publisher@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const scoped = await prisma.user.create({
    data: { email: "scoped@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const other = await prisma.user.create({
    data: { email: "other@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: publisher.id, role: "ADMIN" },
      { parishId: parish.id, userId: scoped.id, role: "MEMBER" },
      { parishId: parish.id, userId: other.id, role: "MEMBER" }
    ]
  });

  const scopedAnnouncement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Scoped",
      audienceUserIds: [scoped.id],
      createdById: publisher.id,
      publishedAt: new Date()
    }
  });

  await notifyAnnouncementPublishedInApp({
    announcementId: scopedAnnouncement.id,
    title: scopedAnnouncement.title,
    parishId: parish.id,
    publisherId: publisher.id
  });

  let scopedNotifications = await prisma.notification.findMany({
    where: { parishId: parish.id, type: "ANNOUNCEMENT" }
  });
  assert.deepEqual(scopedNotifications.map((n) => n.userId).sort(), [scoped.id]);

  await prisma.notification.deleteMany();

  const globalAnnouncement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Global",
      audienceUserIds: [],
      createdById: publisher.id,
      publishedAt: new Date()
    }
  });

  await notifyAnnouncementPublishedInApp({
    announcementId: globalAnnouncement.id,
    title: globalAnnouncement.title,
    parishId: parish.id,
    publisherId: publisher.id
  });

  scopedNotifications = await prisma.notification.findMany({
    where: { parishId: parish.id, type: "ANNOUNCEMENT" }
  });
  assert.deepEqual(scopedNotifications.map((n) => n.userId).sort(), [other.id, scoped.id].sort());
});

dbTest("event visibility controls in-app recipients", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Paul", slug: "st-paul" } });
  const creator = await prisma.user.create({
    data: { email: "creator-event@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const member = await prisma.user.create({
    data: { email: "member-event@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const outsider = await prisma.user.create({
    data: { email: "outsider-event@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "ADMIN" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: outsider.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: { parishId: parish.id, createdById: creator.id, name: "Readers", status: "ACTIVE" }
  });
  await prisma.groupMembership.create({
    data: { groupId: group.id, userId: member.id, status: "ACTIVE" }
  });

  await notifyEventCreatedInApp({
    eventId: "evt-public",
    eventTitle: "Public event",
    parishId: parish.id,
    creatorId: creator.id,
    visibility: "PUBLIC",
    groupId: null
  });

  let eventNotifications = await prisma.notification.findMany({
    where: { parishId: parish.id, type: "EVENT" }
  });
  assert.deepEqual(eventNotifications.map((n) => n.userId).sort(), [member.id, outsider.id].sort());

  await prisma.notification.deleteMany();

  await notifyEventCreatedInApp({
    eventId: "evt-group",
    eventTitle: "Group event",
    parishId: parish.id,
    creatorId: creator.id,
    visibility: "GROUP",
    groupId: group.id
  });

  eventNotifications = await prisma.notification.findMany({
    where: { parishId: parish.id, type: "EVENT" }
  });
  assert.deepEqual(eventNotifications.map((n) => n.userId).sort(), [member.id]);
});

dbTest("serve comment notifications only go to creator assignee and volunteers", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Therese", slug: "st-therese" } });
  const creator = await prisma.user.create({
    data: { email: "creator-serve@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const assignee = await prisma.user.create({
    data: { email: "assignee-serve@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const volunteer = await prisma.user.create({
    data: { email: "volunteer-serve@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });
  const unrelated = await prisma.user.create({
    data: { email: "unrelated-serve@example.com", passwordHash: "hashed", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "ADMIN" },
      { parishId: parish.id, userId: assignee.id, role: "MEMBER" },
      { parishId: parish.id, userId: volunteer.id, role: "MEMBER" },
      { parishId: parish.id, userId: unrelated.id, role: "MEMBER" }
    ]
  });

  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: new Date("2024-02-01T00:00:00.000Z"),
      endsOn: new Date("2024-02-08T00:00:00.000Z"),
      label: "2024-W05"
    }
  });

  const task = await prisma.task.create({
    data: {
      displayId: "SERV-1",
      parishId: parish.id,
      weekId: week.id,
      title: "Set up hall",
      createdById: creator.id,
      ownerId: assignee.id,
      visibility: "PUBLIC",
      approvalStatus: "APPROVED"
    }
  });

  await prisma.taskVolunteer.create({ data: { taskId: task.id, userId: volunteer.id } });

  await notifyTaskCommentInApp({
    taskId: task.id,
    parishId: parish.id,
    actorId: creator.id,
    actorName: "Creator",
    body: "Please come early"
  });

  const notifications = await prisma.notification.findMany({
    where: { parishId: parish.id, type: "TASK" }
  });

  assert.deepEqual(notifications.map((n) => n.userId).sort(), [assignee.id, volunteer.id].sort());
  assert.equal(notifications.some((n) => n.userId === unrelated.id), false);
});

dbTest("delete notification enforces ownership", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Michael", slug: "st-michael" }
  });

  const owner = await prisma.user.create({
    data: {
      email: "owner-delete@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  const other = await prisma.user.create({
    data: {
      email: "other-delete@example.com",
      name: "Other",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: owner.id, role: "MEMBER" },
      { parishId: parish.id, userId: other.id, role: "MEMBER" }
    ]
  });

  const notification = await prisma.notification.create({
    data: {
      userId: owner.id,
      parishId: parish.id,
      type: "TASK",
      title: "Task update",
      href: "/tasks"
    }
  });

  const denied = await deleteNotificationForUser({
    notificationId: notification.id,
    userId: other.id,
    parishId: parish.id
  });
  assert.equal(denied.ok, false);

  const allowed = await deleteNotificationForUser({
    notificationId: notification.id,
    userId: owner.id,
    parishId: parish.id
  });
  assert.equal(allowed.ok, true);

  const existing = await prisma.notification.findUnique({ where: { id: notification.id } });
  assert.equal(existing, null);
});

dbTest("in-app category preferences suppress newly created notifications", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Nicholas", slug: "st-nicholas" }
  });

  const creator = await prisma.user.create({
    data: {
      email: "creator-pref@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  const owner = await prisma.user.create({
    data: {
      email: "owner-pref@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id,
      notifyTaskInApp: false
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "ADMIN" },
      { parishId: parish.id, userId: owner.id, role: "MEMBER" }
    ]
  });

  await notifyTaskCreatedInApp({
    taskId: "task-123",
    taskTitle: "Prepare flowers",
    parishId: parish.id,
    createdById: creator.id,
    creatorName: "Creator",
    ownerId: owner.id
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: owner.id, parishId: parish.id }
  });

  assert.equal(notifications.length, 0);
});

dbTest("request assignment notifications route assignees to admin request board", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Michael Requests", slug: "st-michael-requests" }
  });

  const assignee = await prisma.user.create({
    data: {
      email: "assignee@example.com",
      name: "Assignee",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: assignee.id, role: "ADMIN" }
  });

  await notifyRequestAssignedInApp({
    requestId: "req_123",
    requestTitle: "Pastoral visit",
    parishId: parish.id,
    assigneeId: assignee.id
  });

  const notification = await prisma.notification.findFirst({
    where: { userId: assignee.id, parishId: parish.id, type: "REQUEST" }
  });

  assert.ok(notification);
  assert.equal(notification?.href, "/admin/requests?requestId=req_123");
});

dbTest("notification unread count returns zero when all stored notifications are read", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Clare", slug: "st-clare" }
  });

  const user = await prisma.user.create({
    data: {
      email: "reader@example.com",
      name: "Reader",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: user.id, role: "MEMBER" }
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        parishId: parish.id,
        type: "TASK",
        title: "Task update",
        href: "/tasks"
      },
      {
        userId: user.id,
        parishId: parish.id,
        type: "EVENT",
        title: "Event update",
        href: "/calendar"
      }
    ]
  });

  const unreadBefore = await getNotificationUnreadCount(user.id, parish.id);
  assert.equal(unreadBefore, 2);

  await prisma.notification.updateMany({
    where: { userId: user.id, parishId: parish.id },
    data: { readAt: new Date() }
  });

  const unreadAfter = await getNotificationUnreadCount(user.id, parish.id);
  assert.equal(unreadAfter, 0);
});
