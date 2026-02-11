import type { ParishRole } from "@prisma/client";

export type StartGuideItem = {
  id: string;
  label: string;
  href: string;
};

export function getStartThisWeekItems(role: ParishRole): StartGuideItem[] {
  if (role === "MEMBER") {
    return [
      { id: "announcements", label: "Read announcements", href: "/announcements" },
      { id: "events", label: "Check upcoming events", href: "/calendar" },
      { id: "groups", label: "Join a parish group", href: "/groups" },
      { id: "tasks", label: "Find a way to serve", href: "/tasks" },
      { id: "requests", label: "Submit a request", href: "/requests" }
    ];
  }

  return [
    { id: "announcement", label: "Publish an announcement", href: "/announcements" },
    { id: "event", label: "Create an event", href: "/calendar" },
    { id: "requests", label: "Triage requests", href: "/admin/requests" }
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

