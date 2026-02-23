import { prisma } from "@/server/db/prisma";

export type ParishEngagementMetrics = {
  period: { sinceHours: number; label: string };
  members: {
    total: number;
    activeInPeriod: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    open: number;
    volunteersActive: number;
  };
  events: {
    total: number;
    rsvpCount: number;
    upcomingCount: number;
  };
  chat: {
    messageCount: number;
    activeChannels: number;
  };
  requests: {
    total: number;
    pending: number;
    completed: number;
  };
  accessRequests: {
    pending: number;
  };
};

export async function getParishEngagementMetrics({
  parishId,
  sinceHours
}: {
  parishId: string;
  sinceHours: number;
}): Promise<ParishEngagementMetrics> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const now = new Date();

  const [
    totalMembers,
    activeMembers,
    taskStats,
    volunteerCount,
    totalEvents,
    rsvpCount,
    upcomingEvents,
    messageCount,
    activeChannels,
    requestStats,
    pendingAccessRequests
  ] = await Promise.all([
    // Total parish members
    prisma.membership.count({
      where: { parishId }
    }),

    // Members active in period (logged in since)
    prisma.user.count({
      where: {
        memberships: { some: { parishId } },
        lastLoginAt: { gte: since }
      }
    }),

    // Task stats for the parish
    prisma.task.groupBy({
      by: ["status"],
      where: {
        parishId,
        archivedAt: null
      },
      _count: { id: true }
    }),

    // Active volunteers in period
    prisma.taskVolunteer.count({
      where: {
        task: { parishId },
        createdAt: { gte: since }
      }
    }),

    // Events in period
    prisma.event.count({
      where: {
        parishId,
        deletedAt: null,
        startsAt: { gte: since }
      }
    }),

    // RSVPs in period
    prisma.eventRsvp.count({
      where: {
        event: { parishId },
        createdAt: { gte: since }
      }
    }),

    // Upcoming events
    prisma.event.count({
      where: {
        parishId,
        deletedAt: null,
        startsAt: { gte: now }
      }
    }),

    // Chat messages in period
    prisma.chatMessage.count({
      where: {
        channel: { parishId },
        deletedAt: null,
        createdAt: { gte: since }
      }
    }),

    // Channels with activity in period
    prisma.chatChannel.count({
      where: {
        parishId,
        messages: { some: { createdAt: { gte: since }, deletedAt: null } }
      }
    }),

    // Requests by status
    prisma.request.groupBy({
      by: ["status"],
      where: {
        parishId,
        deletedAt: null
      },
      _count: { id: true }
    }),

    // Pending access requests
    prisma.accessRequest.count({
      where: {
        parishId,
        status: "PENDING"
      }
    })
  ]);

  const taskStatusMap = Object.fromEntries(
    taskStats.map((row) => [row.status, row._count.id])
  );

  const requestStatusMap = Object.fromEntries(
    requestStats.map((row) => [row.status, row._count.id])
  );

  const label =
    sinceHours <= 24
      ? "Last 24 hours"
      : sinceHours <= 168
        ? `Last ${Math.round(sinceHours / 24)} days`
        : `Last ${Math.round(sinceHours / 168)} weeks`;

  return {
    period: { sinceHours, label },
    members: {
      total: totalMembers,
      activeInPeriod: activeMembers
    },
    tasks: {
      total: (taskStatusMap.OPEN ?? 0) + (taskStatusMap.IN_PROGRESS ?? 0) + (taskStatusMap.DONE ?? 0),
      completed: taskStatusMap.DONE ?? 0,
      inProgress: taskStatusMap.IN_PROGRESS ?? 0,
      open: taskStatusMap.OPEN ?? 0,
      volunteersActive: volunteerCount
    },
    events: {
      total: totalEvents,
      rsvpCount,
      upcomingCount: upcomingEvents
    },
    chat: {
      messageCount,
      activeChannels
    },
    requests: {
      total: (requestStatusMap.SUBMITTED ?? 0) + (requestStatusMap.ACKNOWLEDGED ?? 0) +
        (requestStatusMap.SCHEDULED ?? 0) + (requestStatusMap.COMPLETED ?? 0),
      pending: (requestStatusMap.SUBMITTED ?? 0) + (requestStatusMap.ACKNOWLEDGED ?? 0),
      completed: requestStatusMap.COMPLETED ?? 0
    },
    accessRequests: {
      pending: pendingAccessRequests
    }
  };
}
