import { prisma } from "@/server/db/prisma";

function getCompactDisplayName(name: string | null, email: string | null) {
  if (!name) {
    return email?.split("@")[0] ?? "Parishioner";
  }
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return email?.split("@")[0] ?? "Parishioner";
  }
  if (parts.length === 1) {
    return parts[0];
  }
  const lastInitial = parts[parts.length - 1]?.[0] ?? "";
  return `${parts[0]} ${lastInitial}.`;
}

export async function getGratitudeSpotlight({
  parishId,
  weekId
}: {
  parishId: string;
  weekId: string;
}) {
  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: {
      gratitudeSpotlightEnabled: true,
      gratitudeSpotlightLimit: true
    }
  });

  if (!parish) {
    throw new Error("Parish not found");
  }

  const enabled = parish.gratitudeSpotlightEnabled;
  const limit = parish.gratitudeSpotlightLimit;

  const nominations = enabled
    ? await prisma.heroNomination.findMany({
        where: {
          parishId,
          weekId,
          status: "PUBLISHED"
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          reason: true,
          nominee: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    : [];

  return {
    enabled,
    limit,
    items: nominations.map((nomination) => ({
      id: nomination.id,
      nomineeName: getCompactDisplayName(nomination.nominee.name, nomination.nominee.email),
      reason: nomination.reason
    }))
  };
}

export async function getGratitudeAdminData({
  parishId,
  weekId
}: {
  parishId: string;
  weekId: string;
}) {
  const [parish, nominations, members] = await Promise.all([
    prisma.parish.findUnique({
      where: { id: parishId },
      select: {
        gratitudeSpotlightEnabled: true,
        gratitudeSpotlightLimit: true
      }
    }),
    prisma.heroNomination.findMany({
      where: { parishId, weekId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        reason: true,
        status: true,
        nominee: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.membership.findMany({
      where: { parishId },
      orderBy: { user: { name: "asc" } },
      select: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })
  ]);

  if (!parish) {
    throw new Error("Parish not found");
  }

  const memberOptions = members.map((membership) => {
    const displayName = getCompactDisplayName(
      membership.user.name,
      membership.user.email
    );
    return {
      id: membership.user.id,
      name: displayName,
      label: membership.user.email ? `${displayName} · ${membership.user.email}` : displayName
    };
  });

  return {
    settings: {
      enabled: parish.gratitudeSpotlightEnabled,
      limit: parish.gratitudeSpotlightLimit
    },
    nominations: nominations.map((nomination) => ({
      id: nomination.id,
      reason: nomination.reason,
      status: nomination.status,
      nominee: {
        id: nomination.nominee.id,
        name: getCompactDisplayName(nomination.nominee.name, nomination.nominee.email)
      }
    })),
    memberOptions
  };
}
