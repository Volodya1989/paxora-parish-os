import type { RequestStatus, RequestType, VisibilityScope } from "@prisma/client";

export const REQUEST_STATUS_ORDER: RequestStatus[] = [
  "SUBMITTED",
  "ACKNOWLEDGED",
  "SCHEDULED",
  "COMPLETED",
  "CANCELED"
];

export const REQUEST_TYPE_OPTIONS: Array<{ value: RequestType; label: string; description: string }> = [
  {
    value: "CONFESSION",
    label: "Confession",
    description: "Schedule a time for confession (no details needed)."
  },
  {
    value: "TALK_TO_PRIEST",
    label: "Talk to a priest",
    description: "Request a conversation or pastoral meeting."
  },
  {
    value: "PRAYER",
    label: "Prayer request",
    description: "Ask for prayer for an intention or need."
  },
  {
    value: "GENERIC",
    label: "General request",
    description: "Blessing, meeting, or any other parish need."
  }
];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELED: "Canceled"
};

export const REQUEST_STATUS_TONES: Record<RequestStatus, "neutral" | "success" | "warning"> = {
  SUBMITTED: "warning",
  ACKNOWLEDGED: "neutral",
  SCHEDULED: "neutral",
  COMPLETED: "success",
  CANCELED: "neutral"
};

export const REQUEST_VISIBILITY_LABELS: Record<VisibilityScope, string> = {
  CLERGY_ONLY: "Clergy only",
  ADMIN_ALL: "All clergy + admins",
  ADMIN_SPECIFIC: "Clergy + assigned"
};

export const REQUEST_VISIBILITY_HELP: Record<VisibilityScope, string> = {
  CLERGY_ONLY: "Visible only to clergy members.",
  ADMIN_ALL: "Visible to all clergy and parish admins.",
  ADMIN_SPECIFIC: "Visible to clergy and explicitly assigned users."
};

export const REQUEST_OVERDUE_SUBMITTED_HOURS = 48;
export const REQUEST_OVERDUE_STALE_DAYS = 7;

export function getDefaultVisibilityForType(type: RequestType): VisibilityScope {
  if (type === "CONFESSION" || type === "TALK_TO_PRIEST") {
    return "CLERGY_ONLY";
  }
  return "ADMIN_ALL";
}

export function getRequestTypeLabel(type: RequestType): string {
  return REQUEST_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getRequestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_LABELS[status] ?? status;
}

export function getVisibilityLabel(scope: VisibilityScope): string {
  return REQUEST_VISIBILITY_LABELS[scope] ?? scope;
}

export function isRequestOverdue(
  status: RequestStatus,
  createdAt: Date,
  updatedAt: Date,
  now: Date = new Date()
): boolean {
  if (status === "SUBMITTED") {
    const cutoff = new Date(now.getTime() - REQUEST_OVERDUE_SUBMITTED_HOURS * 60 * 60 * 1000);
    return createdAt < cutoff;
  }

  if (status === "ACKNOWLEDGED" || status === "SCHEDULED") {
    const cutoff = new Date(now.getTime() - REQUEST_OVERDUE_STALE_DAYS * 24 * 60 * 60 * 1000);
    return updatedAt < cutoff;
  }

  return false;
}
