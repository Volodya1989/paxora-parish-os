import { sendEmail, sendEmailIfAllowed } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import {
  renderEventRequestAdminEmail,
  renderEventRequestDecisionEmail,
  renderEventRequestSubmittedEmail
} from "@/emails/templates/eventRequests";

export type EventRequestAdminRecipient = {
  userId: string;
  email: string;
  name: string | null;
  notifyEmailEnabled: boolean;
  groupNames?: string[];
};

type EventRequestEmailContext = {
  parishId: string;
  parishName: string;
  requesterId: string;
  requesterEmail: string;
  requesterName?: string | null;
  eventTitle: string;
  eventDateTime: string;
};

export function selectEventRequestAdminRecipients(memberships: EventRequestAdminRecipient[]) {
  const unique = new Map<string, EventRequestAdminRecipient>();

  for (const membership of memberships) {
    if (!membership.notifyEmailEnabled) {
      continue;
    }
    if (!membership.email) {
      continue;
    }
    const existing = unique.get(membership.email);
    if (!existing) {
      unique.set(membership.email, membership);
      continue;
    }

    const existingGroups = new Set(existing.groupNames ?? []);
    for (const groupName of membership.groupNames ?? []) {
      existingGroups.add(groupName);
    }
    unique.set(membership.email, {
      ...existing,
      groupNames: Array.from(existingGroups)
    });
  }

  return Array.from(unique.values());
}

export async function sendEventRequestSubmittedEmail({
  parishId,
  parishName,
  requesterId,
  requesterEmail,
  requesterName,
  eventTitle,
  eventDateTime
}: EventRequestEmailContext) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderEventRequestSubmittedEmail({
    appUrl,
    parish: { name: parishName },
    requesterName,
    eventTitle,
    eventDateTime
  });

  return sendEmail({
    type: "TRANSACTIONAL",
    template: "eventRequestSubmitted",
    toEmail: requesterEmail,
    subject,
    html,
    text,
    parishId,
    userId: requesterId
  });
}

export async function sendEventRequestDecisionEmail({
  parishId,
  parishName,
  requesterId,
  requesterEmail,
  requesterName,
  eventTitle,
  eventDateTime,
  decision
}: EventRequestEmailContext & { decision: "APPROVED" | "REJECTED" }) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderEventRequestDecisionEmail({
    appUrl,
    parish: { name: parishName },
    requesterName,
    decision,
    eventTitle,
    eventDateTime
  });

  return sendEmail({
    type: "TRANSACTIONAL",
    template: decision === "APPROVED" ? "eventRequestApproved" : "eventRequestRejected",
    toEmail: requesterEmail,
    subject,
    html,
    text,
    parishId,
    userId: requesterId
  });
}

export async function sendEventRequestAdminNotificationEmail({
  parishId,
  parishName,
  requesterName,
  requesterEmail,
  requesterId,
  admin,
  eventTitle,
  eventDateTime,
  location
}: EventRequestEmailContext & {
  admin: EventRequestAdminRecipient;
  location?: string | null;
}) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderEventRequestAdminEmail({
    appUrl,
    parish: { name: parishName },
    requesterName,
    requesterEmail,
    eventTitle,
    eventDateTime,
    location,
    groupNames: admin.groupNames
  });

  return sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "eventRequestAdminNotification",
    toEmail: admin.email,
    subject,
    html,
    text,
    parishId,
    userId: admin.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId,
      userId: admin.userId,
      toEmail: admin.email
    },
    prefs: {
      notifyEmailEnabled: admin.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });
}
