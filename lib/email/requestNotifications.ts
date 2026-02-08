import { sendEmailIfAllowed } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import {
  renderRequestAssignedEmail,
  renderRequestReminderEmail
} from "@/emails/templates/requestNotifications";
import { getRequestStatusLabel } from "@/lib/requests/utils";

type RequestRecipient = {
  userId: string;
  email: string;
  name: string | null;
  notifyEmailEnabled: boolean;
  role: "ADMIN" | "SHEPHERD" | "MEMBER";
};

function buildRequestLink(role: RequestRecipient["role"], requestId: string) {
  if (role === "ADMIN" || role === "SHEPHERD") {
    return `/admin/requests?requestId=${requestId}`;
  }
  return `/requests/${requestId}`;
}

export async function sendRequestAssignmentEmail(input: {
  parishId: string;
  parishName: string;
  requestId: string;
  requestTitle: string;
  requestTypeLabel: string;
  assignee: RequestRecipient;
}) {
  const appUrl = getAppUrl();
  const requestLink = buildRequestLink(input.assignee.role, input.requestId);
  const { subject, html, text } = renderRequestAssignedEmail({
    appUrl,
    parish: { name: input.parishName },
    assigneeName: input.assignee.name,
    requestTitle: input.requestTitle,
    requestTypeLabel: input.requestTypeLabel,
    requestLink
  });

  return sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "requestAssigned",
    toEmail: input.assignee.email,
    subject,
    html,
    text,
    parishId: input.parishId,
    userId: input.assignee.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId: input.parishId,
      userId: input.assignee.userId,
      toEmail: input.assignee.email
    },
    prefs: {
      notifyEmailEnabled: input.assignee.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });
}

export async function sendRequestReminderEmail(input: {
  parishId: string;
  parishName: string;
  requestId: string;
  requestTitle: string;
  requestTypeLabel: string;
  status: "SUBMITTED" | "ACKNOWLEDGED" | "SCHEDULED" | "COMPLETED" | "CANCELED";
  recipient: RequestRecipient;
}) {
  const appUrl = getAppUrl();
  const requestLink = buildRequestLink(input.recipient.role, input.requestId);
  const statusLabel = getRequestStatusLabel(input.status);
  const { subject, html, text } = renderRequestReminderEmail({
    appUrl,
    parish: { name: input.parishName },
    recipientName: input.recipient.name,
    requestTitle: input.requestTitle,
    requestTypeLabel: input.requestTypeLabel,
    statusLabel,
    requestLink
  });

  return sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "requestReminder",
    toEmail: input.recipient.email,
    subject,
    html,
    text,
    parishId: input.parishId,
    userId: input.recipient.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId: input.parishId,
      userId: input.recipient.userId,
      toEmail: input.recipient.email
    },
    prefs: {
      notifyEmailEnabled: input.recipient.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });
}
