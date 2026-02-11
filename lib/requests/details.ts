import type { Prisma } from "@prisma/client";

export type RequestEmailTemplate =
  | "SCHEDULE"
  | "NEED_INFO"
  | "CANNOT_SCHEDULE"
  | "REQUESTER_CANCEL"
  | "REQUESTER_REJECT";

export type RequestEmailHistoryType = "SCHEDULE" | "CANCEL" | "NEED_MORE_INFO";

export type RequestEmailHistoryEntry = {
  sentAt: string;
  type?: RequestEmailHistoryType;
  template?: RequestEmailTemplate;
  subject?: string;
  note?: string;
  sentByUserId?: string;
  sentByName?: string | null;
  payloadHash?: string;
};

export type RequestActivityType =
  | "STATUS"
  | "ASSIGNMENT"
  | "VISIBILITY"
  | "SCHEDULE"
  | "RESPONSE"
  | "ARCHIVE";

export type RequestActivityEntry = {
  occurredAt: string;
  type: RequestActivityType;
  actorId: string;
  actorName?: string | null;
  description: string;
};

export type RequestScheduleResponse = {
  status: "ACCEPTED" | "REJECTED";
  respondedAt: string;
  respondedByUserId: string;
  respondedByName?: string | null;
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
  scheduleResponse?: RequestScheduleResponse;
  history?: RequestEmailHistoryEntry[];
  activity?: RequestActivityEntry[];
};

export type RequestTimelineEntry = {
  id: string;
  timestamp: string;
  title: string;
  meta: string;
  note: string | null;
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

export function appendRequestActivity(
  details: Prisma.JsonValue | null,
  entry: RequestActivityEntry
): RequestDetails {
  const existing = parseRequestDetails(details) ?? {};
  const activity = Array.isArray(existing.activity) ? existing.activity : [];

  return {
    ...existing,
    activity: [...activity, entry]
  };
}

export function hasRequestEmailHistoryEntry(
  details: Prisma.JsonValue | null,
  matcher: { type: RequestEmailHistoryType; payloadHash?: string }
): boolean {
  const existing = parseRequestDetails(details);
  const history = Array.isArray(existing?.history) ? existing?.history : [];
  return history.some((entry) => {
    if (entry.type !== matcher.type) return false;
    if (matcher.payloadHash && entry.payloadHash !== matcher.payloadHash) return false;
    return true;
  });
}

export function buildRequestTimeline(details: RequestDetails | null): RequestTimelineEntry[] {
  if (!details) {
    return [];
  }

  const emailHistory = (details.history ?? []).map((entry, index) => {
    const eventType = (entry.type ?? entry.template ?? "EMAIL").replace(/_/g, " ").toLowerCase();
    const meta = [eventType, entry.sentByName ? `Sent by ${entry.sentByName}` : null]
      .filter(Boolean)
      .join(" · ");

    return {
      id: `email-${index}-${entry.sentAt}`,
      timestamp: entry.sentAt,
      title: entry.subject ?? `${eventType} email`,
      meta,
      note: entry.note ?? null
    };
  });

  const activityHistory = (details.activity ?? []).map((entry, index) => {
    const meta = [entry.type.replace(/_/g, " ").toLowerCase(), entry.actorName ? `By ${entry.actorName}` : null]
      .filter(Boolean)
      .join(" · ");

    return {
      id: `activity-${index}-${entry.occurredAt}`,
      timestamp: entry.occurredAt,
      title: entry.description,
      meta,
      note: null
    };
  });

  return [...emailHistory, ...activityHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
