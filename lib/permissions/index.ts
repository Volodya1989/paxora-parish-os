export type ParishRole = "ADMIN" | "SHEPHERD" | "MEMBER";
export type GroupRole = "COORDINATOR" | "PARISHIONER";

export function isParishLeader(role: ParishRole) {
  return role === "ADMIN" || role === "SHEPHERD";
}

export function canManageGroupMembership(parishRole: ParishRole, groupRole?: GroupRole | null) {
  return isParishLeader(parishRole) || groupRole === "COORDINATOR";
}
