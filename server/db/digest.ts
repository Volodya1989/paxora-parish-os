import { prisma } from "@/server/db/prisma";

export type WeekDigestSummary = {
  id: string;
  label: string;
  startsOn: Date;
  endsOn: Date;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  }>;
  digest: {
    id: string;
    content: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: Date | null;
    createdById: string;
  } | null;
};

export async function getWeekDigestSummary(parishId: string, weekId: string) {
  return prisma.week.findFirst({
    where: {
      id: weekId,
      parishId
    },
    select: {
      id: true,
      label: true,
      startsOn: true,
      endsOn: true,
      tasks: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      events: {
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          location: true
        }
      },
      digest: {
        select: {
          id: true,
          content: true,
          status: true,
          publishedAt: true,
          createdById: true
        }
      }
    }
  });
}

export async function getWeekDigest(parishId: string, weekId: string) {
  return prisma.digest.findUnique({
    where: {
      parishId_weekId: {
        parishId,
        weekId
      }
    },
    select: {
      id: true,
      content: true,
      status: true,
      publishedAt: true
    }
  });
}

export async function upsertDigestDraft(input: {
  parishId: string;
  weekId: string;
  userId: string;
  content: string;
}) {
  return prisma.digest.upsert({
    where: {
      parishId_weekId: {
        parishId: input.parishId,
        weekId: input.weekId
      }
    },
    update: {
      content: input.content,
      status: "DRAFT",
      publishedAt: null
    },
    create: {
      parishId: input.parishId,
      weekId: input.weekId,
      content: input.content,
      status: "DRAFT",
      createdById: input.userId
    },
    select: {
      id: true,
      content: true,
      status: true,
      publishedAt: true
    }
  });
}

export async function publishDigestRecord(input: {
  parishId: string;
  weekId: string;
  userId: string;
  content: string;
}) {
  return prisma.digest.upsert({
    where: {
      parishId_weekId: {
        parishId: input.parishId,
        weekId: input.weekId
      }
    },
    update: {
      content: input.content,
      status: "PUBLISHED",
      publishedAt: new Date()
    },
    create: {
      parishId: input.parishId,
      weekId: input.weekId,
      content: input.content,
      status: "PUBLISHED",
      createdById: input.userId,
      publishedAt: new Date()
    },
    select: {
      id: true,
      content: true,
      status: true,
      publishedAt: true
    }
  });
}
