import type { Prisma } from "@prisma/client";

export type RequestEmailTemplate =
  | "SCHEDULE"
  | "NEED_INFO"
  | "CANNOT_SCHEDULE"
  | "REQUESTER_CANCEL"
  | "REQUESTER_REJECT";

export type RequestEmailHistoryEntry = {
  sentAt: string;
  template: RequestEmailTemplate;
  subject: string;
  note?: string;
};

export type RequestScheduleDetails = {
  eventId: string;
  startsAt: string;
  endsAt: string;
};

export type RequestDetails = {
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  description?: string;
  notes?: string;
  preferredTimeWindow?: string;
  schedule?: RequestScheduleDetails;
  history?: RequestEmailHistoryEntry[];
};

const isPlainObject = (value: Prisma.JsonValue | null): value is Prisma.JsonObject => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

export function parseRequestDetails(details: Prisma.JsonValue | null): RequestDetails | null {
  if (!isPlainObject(details)) {
    return null;
  }

  return details as RequestDetails;
}

export function appendRequestHistory(
  details: Prisma.JsonValue | null,
  entry: RequestEmailHistoryEntry
): RequestDetails {
  const existing = parseRequestDetails(details) ?? {};
  const history = Array.isArray(existing.history) ? existing.history : [];

  return {
    ...existing,
    history: [...history, entry]
  };
}
