import type { ParishRole } from "@prisma/client";

export type StartGuideItem = {
  id: string;
  labelKey: string;
  href: string;
};

export function getStartThisWeekItems(role: ParishRole): StartGuideItem[] {
  if (role === "MEMBER") {
    return [
      { id: "announcements", labelKey: "thisWeek.startGuide.member.announcements", href: "/announcements" },
      { id: "events", labelKey: "thisWeek.startGuide.member.events", href: "/calendar" },
      { id: "groups", labelKey: "thisWeek.startGuide.member.groups", href: "/groups" },
      { id: "tasks", labelKey: "thisWeek.startGuide.member.tasks", href: "/tasks" },
      { id: "requests", labelKey: "thisWeek.startGuide.member.requests", href: "/requests" }
    ];
  }

  return [
    { id: "announcement", labelKey: "thisWeek.startGuide.leader.announcement", href: "/announcements" },
    { id: "event", labelKey: "thisWeek.startGuide.leader.event", href: "/calendar" },
    { id: "requests", labelKey: "thisWeek.startGuide.leader.requests", href: "/admin/requests" }
  ];
}

export function buildStartThisWeekStorageKey({
  userId,
  parishId,
  role
}: {
  userId: string;
  parishId: string;
  role: ParishRole;
}) {
  return `start-this-week:${userId}:${parishId}:${role}:v1`;
}
