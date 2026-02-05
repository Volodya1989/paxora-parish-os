import { prisma } from "@/server/db/prisma";
import type { ParishHubTargetType, ParishHubVisibility, ParishIcon } from "@prisma/client";

export const PARISH_HUB_LIMITS = {
  minEnabled: 4,
  maxTotal: 12
};

export const DEFAULT_PARISH_HUB_ITEMS: Array<{
  label: string;
  icon: ParishIcon;
  targetType: ParishHubTargetType;
  targetUrl?: string | null;
  internalRoute?: string | null;
  visibility: ParishHubVisibility;
  order: number;
  enabled: boolean;
}> = [
  {
    label: "Bulletin",
    icon: "BULLETIN",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 1,
    enabled: false
  },
  {
    label: "Mass Times",
    icon: "MASS_TIMES",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 2,
    enabled: false
  },
  {
    label: "Confession",
    icon: "CONFESSION",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 3,
    enabled: false
  },
  {
    label: "Parish Website",
    icon: "WEBSITE",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 4,
    enabled: false
  },
  {
    label: "Calendar",
    icon: "CALENDAR",
    targetType: "INTERNAL",
    targetUrl: null,
    internalRoute: "/calendar",
    visibility: "LOGGED_IN",
    order: 5,
    enabled: false
  },
  {
    label: "Readings",
    icon: "READINGS",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 6,
    enabled: false
  },
  {
    label: "Giving",
    icon: "GIVING",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 7,
    enabled: false
  },
  {
    label: "Contact",
    icon: "CONTACT",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 8,
    enabled: false
  },
  {
    label: "Facebook",
    icon: "FACEBOOK",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 9,
    enabled: false
  },
  {
    label: "YouTube",
    icon: "YOUTUBE",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "PUBLIC",
    order: 10,
    enabled: false
  },
  {
    label: "Prayer",
    icon: "PRAYER",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "LOGGED_IN",
    order: 11,
    enabled: false
  },
  {
    label: "Reflections",
    icon: "REFLECTIONS",
    targetType: "EXTERNAL",
    targetUrl: null,
    internalRoute: null,
    visibility: "LOGGED_IN",
    order: 12,
    enabled: false
  }
];

export function buildDefaultParishHubItems(parishId: string) {
  return DEFAULT_PARISH_HUB_ITEMS.map((item) => ({
    parishId,
    label: item.label,
    icon: item.icon,
    targetType: item.targetType,
    targetUrl: item.targetUrl ?? null,
    internalRoute: item.internalRoute ?? null,
    visibility: item.visibility,
    order: item.order,
    enabled: item.enabled
  }));
}

export async function createDefaultParishHubItems(parishId: string) {
  return prisma.parishHubItem.createMany({
    data: buildDefaultParishHubItems(parishId)
  });
}

export async function listParishHubItems(input: {
  parishId: string;
  visibility: "PUBLIC" | "LOGGED_IN";
  includeDisabled?: boolean;
}) {
  const visibilityFilter =
    input.visibility === "PUBLIC"
      ? { in: ["PUBLIC"] as ParishHubVisibility[] }
      : { in: ["PUBLIC", "LOGGED_IN"] as ParishHubVisibility[] };

  return prisma.parishHubItem.findMany({
    where: {
      parishId: input.parishId,
      visibility: visibilityFilter,
      ...(input.includeDisabled ? {} : { enabled: true })
    },
    orderBy: { order: "asc" },
    select: {
      id: true,
      label: true,
      icon: true,
      targetType: true,
      targetUrl: true,
      internalRoute: true,
      visibility: true,
      order: true,
      enabled: true
    }
  });
}

export async function getParishHubItemCount(parishId: string) {
  return prisma.parishHubItem.count({
    where: {
      parishId
    }
  });
}

export async function getEnabledParishHubItemCount(parishId: string) {
  return prisma.parishHubItem.count({
    where: {
      parishId,
      enabled: true
    }
  });
}
