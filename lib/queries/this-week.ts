import { getServerSession } from "next-auth";
import { unstable_noStore as noStore } from "next/cache";
import type { ParishRole } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { prisma } from "@/server/db/prisma";
import { getWeekForSelection, type WeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";

export type TaskPreview = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  dueBy: Date | null;
  owner: {
    name: string;
    initials: string;
  };
};

export type EventPreview = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
};

export type AnnouncementPreview = {
  id: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
};

export type ThisWeekData = {
  week: {
    id: string;
    label: string;
    startsOn: Date;
    endsOn: Date;
  };
  tasks: TaskPreview[];
  events: EventPreview[];
  announcements: AnnouncementPreview[];
  parishRole: ParishRole | null;
  memberGroups: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  hasPublicGroups: boolean;
  stats: {
    tasksDone: number;
    tasksTotal: number;
    completionPct: number;
  };
};

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export async function getThisWeekData({
  weekSelection = "current",
  now = getNow()
}: {
  weekSelection?: WeekSelection;
  now?: Date;
} = {}): Promise<ThisWeekData> {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const actorUserId = session.user.id;
  const activeParishId = session.user.activeParishId;
  const parishId = activeParishId
    ? await prisma.parish
        .findUnique({
          where: { id: activeParishId },
          select: { id: true }
        })
        .then((parish) => parish?.id ?? ensureParishBootstrap(session.user.id))
    : await ensureParishBootstrap(session.user.id);

  const week = await getWeekForSelection(parishId, weekSelection, now);

  const [
    tasks,
    events,
    announcements,
    membership,
    memberGroups,
    publicGroupCount
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        parishId,
        weekId: week.id,
        archivedAt: null,
        AND: [
          {
            OR: [
              { visibility: "PUBLIC", approvalStatus: "APPROVED" },
              { ownerId: actorUserId },
              { createdById: actorUserId }
            ]
          }
        ]
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        owner: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.event.findMany({
      where: { parishId, weekId: week.id },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        location: true
      }
    }),
    prisma.announcement.findMany({
      where: {
        parishId,
        archivedAt: null
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        publishedAt: true
      }
    }),
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: actorUserId
        }
      },
      select: { role: true }
    }),
    prisma.groupMembership.findMany({
      where: {
        userId: actorUserId,
        status: "ACTIVE",
        group: {
          parishId,
          archivedAt: null
        }
      },
      orderBy: {
        group: {
          name: "asc"
        }
      },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    }),
    prisma.group.count({
      where: {
        parishId,
        visibility: "PUBLIC",
        archivedAt: null
      }
    })
  ]);

  const dueByDefault = new Date(week.endsOn.getTime() - 1);
  const taskPreviews: TaskPreview[] = tasks.map((task) => {
    const ownerName = task.owner.name ?? task.owner.email?.split("@")[0] ?? "Unassigned";
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      dueBy: dueByDefault,
      owner: {
        name: ownerName,
        initials: getInitials(ownerName)
      }
    };
  });

  const tasksDone = taskPreviews.filter((task) => task.status === "DONE").length;
  const tasksTotal = taskPreviews.length;
  const completionPct = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);

  return {
    week: {
      id: week.id,
      label: week.label,
      startsOn: week.startsOn,
      endsOn: week.endsOn
    },
    tasks: taskPreviews,
    events,
    announcements: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      updatedAt: announcement.updatedAt,
      createdAt: announcement.createdAt,
      publishedAt: announcement.publishedAt
    })),
    parishRole: membership?.role ?? null,
    memberGroups: memberGroups.map((membership) => membership.group),
    hasPublicGroups: publicGroupCount > 0,
    stats: {
      tasksDone,
      tasksTotal,
      completionPct
    }
  };
}
