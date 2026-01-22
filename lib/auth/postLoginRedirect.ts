import type { ParishRole } from "@prisma/client";
import { isAdminClergy } from "@/lib/authz/membership";

export function getPostLoginRedirect(parishRole: ParishRole | null) {
  return isAdminClergy(parishRole ?? undefined) ? "/this-week" : "/tasks?view=opportunities";
}
