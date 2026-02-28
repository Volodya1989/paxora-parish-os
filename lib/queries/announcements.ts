import { AnnouncementScopeType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import { buildAnnouncementVisibilityWhere } from "@/lib/announcements/access";
import { REACTION_EMOJIS } from "@/lib/chat/reactions";

export type AnnouncementStatus = "draft" | "published";

type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  scopeType: AnnouncementScopeType;
  chatChannelId: string | null;
  chatChannelName: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  reactions: ReactionSummary[];
  commentsCount: number;
  createdBy: {
    id: string;
    name: string;
  } | null;
};

export type AnnouncementDetail = {
  id: string;
  title: string;
  body: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  scopeType: AnnouncementScopeType;
  chatChannelId: string | null;
  chatChannelName: string | null;
  audienceUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  reactions: ReactionSummary[];
  commentsCount: number;
  createdBy: {
    id: string;
    name: string;
  } | null;
};

export type AnnouncementCommentItem = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
  };
};

export type AnnouncementDeliverySummary = {
  sentCount: number;
  failedCount: number;
  totalCount: number;
};

type ListAnnouncementsInput = {
  parishId: string;
  userId: string;
  status: AnnouncementStatus;
  includeAll?: boolean;
  getNow?: () => Date;
};

async function buildAnnouncementReactionSummary(announcementIds: string[], userId: string) {
  if (announcementIds.length === 0) {
    return new Map<string, ReactionSummary[]>();
  }

  const [counts, reacted] = await Promise.all([
    prisma.announcementReaction.groupBy({
      by: ["announcementId", "emoji"],
      where: { announcementId: { in: announcementIds } },
      _count: { _all: true }
    }),
    prisma.announcementReaction.findMany({
      where: {
        announcementId: { in: announcementIds },
        userId
      },
      select: { announcementId: true, emoji: true }
    })
  ]);

  const reactedByAnnouncement = new Map<string, Set<string>>();
  reacted.forEach((row) => {
    const set = reactedByAnnouncement.get(row.announcementId) ?? new Set<string>();
    set.add(row.emoji);
    reactedByAnnouncement.set(row.announcementId, set);
  });

  const countsByAnnouncement = new Map<string, Map<string, number>>();
  counts.forEach((row) => {
    const map = countsByAnnouncement.get(row.announcementId) ?? new Map<string, number>();
    map.set(row.emoji, row._count._all);
    countsByAnnouncement.set(row.announcementId, map);
  });

  const summaryByAnnouncement = new Map<string, ReactionSummary[]>();

  announcementIds.forEach((announcementId) => {
    const countMap = countsByAnnouncement.get(announcementId);
    if (!countMap) {
      summaryByAnnouncement.set(announcementId, []);
      return;
    }

    const reactedSet = reactedByAnnouncement.get(announcementId) ?? new Set<string>();
    const summary = REACTION_EMOJIS.flatMap((emoji) => {
      const count = countMap.get(emoji);
      if (!count) return [];
      return [{ emoji, count, reactedByMe: reactedSet.has(emoji) }];
    });
    summaryByAnnouncement.set(announcementId, summary);
  });

  return summaryByAnnouncement;
}

export async function getAnnouncement({
  parishId,
  userId,
  includeAll,
  announcementId
}: {
  parishId: string;
  userId: string;
  includeAll?: boolean;
  announcementId: string;
}): Promise<AnnouncementDetail | null> {
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      ...buildAnnouncementVisibilityWhere({ parishId, userId, includeAll })
    },
    select: {
      id: true,
      title: true,
      body: true,
      bodyHtml: true,
      bodyText: true,
      scopeType: true,
      chatChannelId: true,
      audienceUserIds: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      chatChannel: { select: { name: true } },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: { comments: true }
      }
    }
  });

  if (!announcement) return null;

  const reactionsByAnnouncement = await buildAnnouncementReactionSummary([announcement.id], userId);

  return {
    ...announcement,
    body: announcement.body ?? null,
    bodyHtml: announcement.bodyHtml ?? null,
    bodyText: announcement.bodyText ?? null,
    chatChannelName: announcement.chatChannel?.name ?? null,
    audienceUserIds: announcement.audienceUserIds ?? [],
    reactions: reactionsByAnnouncement.get(announcement.id) ?? [],
    commentsCount: announcement._count.comments,
    createdBy: announcement.createdBy
      ? {
          id: announcement.createdBy.id,
          name: announcement.createdBy.name ?? announcement.createdBy.email ?? "Parish staff"
        }
      : null
  };
}

export async function listAnnouncements({ parishId, userId, status, includeAll, getNow }: ListAnnouncementsInput) {
  const resolveNow = getNow ?? defaultGetNow;
  void resolveNow;

  const announcements = await prisma.announcement.findMany({
    where: buildAnnouncementVisibilityWhere({ parishId, userId, status, includeAll }),
    orderBy:
      status === "draft"
        ? [{ updatedAt: "desc" }, { createdAt: "desc" }]
        : [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      bodyHtml: true,
      bodyText: true,
      scopeType: true,
      chatChannelId: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      archivedAt: true,
      chatChannel: { select: { name: true } },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: { comments: true }
      }
    }
  });

  const announcementIds = announcements.map((announcement) => announcement.id);
  const reactionsByAnnouncement = await buildAnnouncementReactionSummary(announcementIds, userId);

  return announcements.map((announcement) => ({
    ...announcement,
    body: announcement.body ?? null,
    bodyHtml: announcement.bodyHtml ?? null,
    bodyText: announcement.bodyText ?? null,
    chatChannelName: announcement.chatChannel?.name ?? null,
    reactions: reactionsByAnnouncement.get(announcement.id) ?? [],
    commentsCount: announcement._count.comments,
    createdBy: announcement.createdBy
      ? {
          id: announcement.createdBy.id,
          name: announcement.createdBy.name ?? announcement.createdBy.email ?? "Parish staff"
        }
      : null
  })) as AnnouncementListItem[];
}

export async function getAnnouncementDeliverySummary(
  announcementId: string
): Promise<AnnouncementDeliverySummary> {
  const logs = await prisma.emailLog.groupBy({
    by: ["status"],
    where: { announcementId, type: "ANNOUNCEMENT" },
    _count: { id: true }
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const log of logs) {
    if (log.status === "SENT") sentCount = log._count.id;
    else if (log.status === "FAILED") failedCount = log._count.id;
  }

  return {
    sentCount,
    failedCount,
    totalCount: sentCount + failedCount
  };
}


export async function listAnnouncementComments({
  parishId,
  userId,
  announcementId
}: {
  parishId: string;
  userId: string;
  announcementId: string;
}): Promise<AnnouncementCommentItem[] | null> {
  const hasAccess = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      ...buildAnnouncementVisibilityWhere({ parishId, userId, status: "published" })
    },
    select: { id: true }
  });

  if (!hasAccess) {
    return null;
  }

  const comments = await prisma.announcementComment.findMany({
    where: { announcementId },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.author.id,
      name: comment.author.name ?? comment.author.email ?? "Parish member"
    }
  }));
}
