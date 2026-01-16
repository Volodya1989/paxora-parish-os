import { getServerSession } from "next-auth";
import { unstable_noStore as noStore } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { prisma } from "@/server/db/prisma";
import { getWeekForSelection, type WeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";

export type TaskPreview = {
  id: string;
  title: string;
  status: "OPEN" | "DONE";
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
  status: "Draft" | "Published";
  updatedAt: Date;
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

  const tasks = await prisma.task.findMany({
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
  });

  const events = await prisma.event.findMany({
    where: { parishId, weekId: week.id },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true
    }
  });

  const taskPreviews: TaskPreview[] = tasks.map((task) => {
    const ownerName = task.owner.name ?? task.owner.email?.split("@")[0] ?? "Unassigned";
    return {
      id: task.id,
      title: task.title,
      status: task.status,
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
    announcements: [],
    stats: {
      tasksDone,
      tasksTotal,
      completionPct
    }
  };
}
