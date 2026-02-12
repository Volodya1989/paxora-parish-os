import { stripLocale } from "@/lib/i18n/routing";

export type WeekSelection = "current" | "next";

export function normalizeWeekSelection(value: string | null): WeekSelection {
  return value === "next" ? "next" : "current";
}

export function buildWeekHref(
  pathname: string,
  search: string,
  selection: WeekSelection
) {
  const params = new URLSearchParams(search);
  params.set("week", selection);
  return `${pathname}?${params.toString()}`;
}

export function buildAddHref(pathname: string, search: string, target: string) {
  const params = new URLSearchParams(search);
  params.set("create", target);
  return `${pathname}?${params.toString()}`;
}

export function getPageTitleKey(pathname: string) {
  const normalized = stripLocale(pathname);
  if (normalized.startsWith("/tasks")) return "nav.serve";
  if (normalized.startsWith("/groups")) return "nav.groups";
  if (normalized.startsWith("/calendar")) return "nav.calendar";
  if (normalized.startsWith("/announcements")) return "nav.announcements";
  if (normalized.startsWith("/admin/reliability")) return "nav.reliability";
  if (normalized.startsWith("/admin/people")) return "nav.people";
  if (normalized.startsWith("/admin/requests")) return "nav.requests";
  if (normalized.startsWith("/platform/parishes")) return "nav.platformParishes";
  if (normalized.startsWith("/requests")) return "nav.requests";
  if (normalized.startsWith("/profile")) return "nav.profile";
  return "nav.thisWeek";
}
