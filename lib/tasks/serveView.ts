export type ServeViewMode = "all" | "opportunities" | "mine";

export function shouldShowOwnershipFilter(viewMode: ServeViewMode): boolean {
  return viewMode !== "opportunities" && viewMode !== "mine";
}

export function shouldShowParishionerAddButton({
  canManageTasks,
  canRequestContentCreate,
  viewMode
}: {
  canManageTasks: boolean;
  canRequestContentCreate: boolean;
  viewMode: ServeViewMode;
}): boolean {
  if (!(canManageTasks || canRequestContentCreate)) {
    return false;
  }

  if (!canManageTasks && viewMode === "mine") {
    return false;
  }

  return true;
}

export function getOwnerParamForViewChange({
  currentOwner,
  nextView
}: {
  currentOwner: string | null;
  nextView: ServeViewMode;
}): string | null {
  if (nextView === "mine") {
    return "mine";
  }

  if (currentOwner === "mine") {
    return null;
  }

  return currentOwner;
}
