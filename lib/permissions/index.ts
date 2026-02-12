export type ParishRole = "ADMIN" | "SHEPHERD" | "MEMBER";
export type GroupRole = "COORDINATOR" | "PARISHIONER";

export function isParishLeader(role: ParishRole) {
  return role === "ADMIN" || role === "SHEPHERD";
}

export function canManageGroupMembership(parishRole: ParishRole, groupRole?: GroupRole | null) {
  return isParishLeader(parishRole) || groupRole === "COORDINATOR";
}

export function canPostAnnouncementChannel(parishRole: ParishRole, isCoordinator: boolean) {
  return isParishLeader(parishRole) || isCoordinator;
}

export function canPostGroupChannel(parishRole: ParishRole, isGroupMember: boolean) {
  return isParishLeader(parishRole) || isGroupMember;
}

export function canModerateChatChannel(parishRole: ParishRole, isCoordinator: boolean) {
  return isParishLeader(parishRole) || isCoordinator;
}

export function canAccessServeBoard(parishRole: ParishRole, isCoordinator: boolean) {
  return isParishLeader(parishRole) || isCoordinator;
}

export function canRequestOpportunity(parishRole: ParishRole) {
  return parishRole === "MEMBER";
}
