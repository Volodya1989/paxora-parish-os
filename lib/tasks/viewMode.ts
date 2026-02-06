import type { ParishRole } from "@prisma/client";
import { isAdminClergy } from "@/lib/authz/membership";

export type TasksViewMode = "all" | "opportunities" | "mine";

type TaskSearchParams = {
  view?: string | string[] | undefined;
};

export function getTasksViewMode({
  sessionRole,
  searchParams
}: {
  sessionRole: ParishRole | null;
  searchParams?: TaskSearchParams | undefined;
}): TasksViewMode {
  const raw = searchParams?.view;
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!isAdminClergy(sessionRole ?? undefined)) {
    if (value === "mine") {
      return "mine";
    }
    return "opportunities";
  }

  if (value === "opportunities") {
    return "opportunities";
  }

  if (value === "mine") {
    return "mine";
  }

  return "all";
}
