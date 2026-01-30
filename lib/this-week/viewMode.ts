import type { ParishRole } from "@prisma/client";
import { isAdminClergy } from "@/lib/authz/membership";

export type ThisWeekViewMode = "admin" | "parishioner";

type ThisWeekSearchParams = {
  view?: string | string[] | undefined;
};

const VIEW_ADMIN = "admin";
const VIEW_PARISHIONER = "parishioner";

export function getThisWeekViewMode({
  sessionRole,
  canManage = false,
  searchParams
}: {
  sessionRole: ParishRole | null;
  canManage?: boolean;
  searchParams?: ThisWeekSearchParams | undefined;
}): ThisWeekViewMode {
  if (!isAdminClergy(sessionRole ?? undefined) && !canManage) {
    return VIEW_PARISHIONER;
  }

  const raw = searchParams?.view;
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value === VIEW_PARISHIONER) {
    return VIEW_PARISHIONER;
  }

  return VIEW_ADMIN;
}
