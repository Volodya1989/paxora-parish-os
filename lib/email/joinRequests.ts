import type { ParishRole } from "@prisma/client";
import { sendEmail, sendEmailIfAllowed } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderJoinRequestAdminEmail, renderJoinRequestDecisionEmail, renderJoinRequestSubmittedEmail } from "@/emails/templates/joinRequests";

export type JoinRequestAdminRecipient = {
  userId: string;
  email: string;
  name: string | null;
  role: ParishRole;
  notifyEmailEnabled: boolean;
};

export function selectJoinRequestAdminRecipients(memberships: JoinRequestAdminRecipient[]) {
  const unique = new Map<string, JoinRequestAdminRecipient>();

  for (const membership of memberships) {
    if (!["ADMIN", "SHEPHERD"].includes(membership.role)) {
      continue;
    }
    if (!membership.notifyEmailEnabled) {
      continue;
    }
    if (!membership.email) {
      continue;
    }
    if (!unique.has(membership.email)) {
      unique.set(membership.email, membership);
    }
  }

  return Array.from(unique.values());
}

type JoinRequestEmailContext = {
  parishId: string;
  parishName: string;
  requesterId: string;
  requesterEmail: string;
  requesterName?: string | null;
};

export async function sendJoinRequestSubmittedEmail({
  parishId,
  parishName,
  requesterId,
  requesterEmail,
  requesterName
}: JoinRequestEmailContext) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderJoinRequestSubmittedEmail({
    appUrl,
    parish: { name: parishName },
    requesterName
  });

  return sendEmail({
    type: "TRANSACTIONAL",
    template: "joinRequestSubmitted",
    toEmail: requesterEmail,
    subject,
    html,
    text,
    parishId,
    userId: requesterId
  });
}

export async function sendJoinRequestDecisionEmail({
  parishId,
  parishName,
  requesterId,
  requesterEmail,
  requesterName,
  decision
}: JoinRequestEmailContext & { decision: "APPROVED" | "REJECTED" }) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderJoinRequestDecisionEmail({
    appUrl,
    parish: { name: parishName },
    requesterName,
    decision
  });

  return sendEmail({
    type: "TRANSACTIONAL",
    template: decision === "APPROVED" ? "joinRequestApproved" : "joinRequestRejected",
    toEmail: requesterEmail,
    subject,
    html,
    text,
    parishId,
    userId: requesterId
  });
}

export async function sendJoinRequestAdminNotificationEmail({
  parishId,
  parishName,
  requesterName,
  requesterEmail,
  requesterId,
  admin,
  joinRequestId
}: JoinRequestEmailContext & {
  admin: JoinRequestAdminRecipient;
  joinRequestId: string;
}) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderJoinRequestAdminEmail({
    appUrl,
    parish: { name: parishName },
    requesterName,
    requesterEmail
  });

  return sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "joinRequestAdminNotification",
    toEmail: admin.email,
    subject,
    html,
    text,
    parishId,
    userId: admin.userId,
    joinRequestId,
    dedupeLog: {
      type: "NOTIFICATION",
      joinRequestId,
      toEmail: admin.email
    },
    prefs: {
      notifyEmailEnabled: admin.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });
}
