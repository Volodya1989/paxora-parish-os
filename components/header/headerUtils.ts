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

export function getPageTitle(pathname: string) {
  if (pathname.startsWith("/tasks")) return "Serve";
  if (pathname.startsWith("/groups")) return "Groups";
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/announcements")) return "Announcements";
  if (pathname.startsWith("/profile")) return "Profile";
  return "This Week";
}
