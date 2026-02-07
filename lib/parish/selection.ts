export type ParishMembershipSnapshot = {
  parishId: string;
};

export type ActiveParishSelectionInput = {
  activeParishId?: string | null;
  memberships: ParishMembershipSnapshot[];
};

export function selectDefaultParishId({
  activeParishId,
  memberships
}: ActiveParishSelectionInput): string | null {
  if (activeParishId) {
    return activeParishId;
  }

  return memberships.length > 0 ? memberships[0].parishId : null;
}
