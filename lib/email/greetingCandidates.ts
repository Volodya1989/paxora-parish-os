import type { PrismaClient } from "@prisma/client";
import { isMissingColumnError } from "@/lib/prisma/errors";

type RawGreetingMembership = {
  userId: string;
  user: {
    email: string;
    name: string | null;
    birthdayMonth: number | null;
    birthdayDay: number | null;
    anniversaryMonth: number | null;
    anniversaryDay: number | null;
  };
};

export type GreetingCandidate = {
  userId: string;
  firstName: string;
  email: string;
  sendBirthday: boolean;
  sendAnniversary: boolean;
  alreadySentBirthday: boolean;
  alreadySentAnniversary: boolean;
};

export type GreetingCandidateSummary = {
  optedInMemberships: number;
  dateMatchedMemberships: number;
  missingEmailMemberships: number;
  alreadySentToday: number;
  sendableToday: number;
};

export function buildGreetingCandidateSnapshot({
  memberships,
  sentLogs,
  month,
  day
}: {
  memberships: RawGreetingMembership[];
  sentLogs: Array<{ userId: string; type: "BIRTHDAY" | "ANNIVERSARY" }>;
  month: number;
  day: number;
}) {
  const sentMap = new Map<string, { birthday: boolean; anniversary: boolean }>();
  for (const log of sentLogs) {
    const current = sentMap.get(log.userId) ?? { birthday: false, anniversary: false };
    if (log.type === "BIRTHDAY") current.birthday = true;
    if (log.type === "ANNIVERSARY") current.anniversary = true;
    sentMap.set(log.userId, current);
  }

  const candidates: GreetingCandidate[] = [];
  let missingEmailMemberships = 0;
  let alreadySentToday = 0;
  let sendableToday = 0;

  for (const row of memberships) {
    const email = row.user.email?.trim() ?? "";
    const sendBirthday = row.user.birthdayMonth === month && row.user.birthdayDay === day;
    const sendAnniversary = row.user.anniversaryMonth === month && row.user.anniversaryDay === day;
    const sent = sentMap.get(row.userId) ?? { birthday: false, anniversary: false };

    if (!email) {
      missingEmailMemberships += 1;
      continue;
    }

    if (sendBirthday && sent.birthday) alreadySentToday += 1;
    if (sendAnniversary && sent.anniversary) alreadySentToday += 1;
    if (sendBirthday && !sent.birthday) sendableToday += 1;
    if (sendAnniversary && !sent.anniversary) sendableToday += 1;

    candidates.push({
      userId: row.userId,
      firstName: row.user.name?.trim().split(" ")[0] || "Friend",
      email,
      sendBirthday,
      sendAnniversary,
      alreadySentBirthday: sent.birthday,
      alreadySentAnniversary: sent.anniversary
    });
  }

  const summary: GreetingCandidateSummary = {
    optedInMemberships: memberships.length,
    dateMatchedMemberships: sendableToday + alreadySentToday,
    missingEmailMemberships,
    alreadySentToday,
    sendableToday
  };

  return { candidates, summary };
}

export async function getGreetingCandidatesForParish({
  prisma,
  parishId,
  month,
  day,
  dateKey
}: {
  prisma: PrismaClient;
  parishId: string;
  month: number;
  day: number;
  dateKey: string;
}) {
  let memberships: RawGreetingMembership[] = [];

  try {
    memberships = await prisma.membership.findMany({
      where: {
        parishId,
        allowParishGreetings: true,
        user: {
          deletedAt: null,
          OR: [
            { birthdayMonth: month, birthdayDay: day },
            { anniversaryMonth: month, anniversaryDay: day }
          ]
        }
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
            name: true,
            birthdayMonth: true,
            birthdayDay: true,
            anniversaryMonth: true,
            anniversaryDay: true
          }
        }
      }
    });
  } catch (error) {
    if (!isMissingColumnError(error, "Membership.allowParishGreetings")) {
      throw error;
    }

    memberships = await prisma.membership.findMany({
      where: {
        parishId,
        user: {
          deletedAt: null,
          greetingsOptIn: true,
          OR: [
            { birthdayMonth: month, birthdayDay: day },
            { anniversaryMonth: month, anniversaryDay: day }
          ]
        }
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
            name: true,
            birthdayMonth: true,
            birthdayDay: true,
            anniversaryMonth: true,
            anniversaryDay: true
          }
        }
      }
    });
  }

  const sentLogs = await prisma.greetingEmailLog.findMany({
    where: {
      parishId,
      dateKey,
      userId: { in: memberships.map((row) => row.userId) }
    },
    select: {
      userId: true,
      type: true
    }
  });

  return buildGreetingCandidateSnapshot({ memberships, sentLogs, month, day });
}
