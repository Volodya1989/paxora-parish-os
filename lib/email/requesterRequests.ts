import { sendEmailIfAllowed } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import {
  renderRequestCancellationEmail,
  renderRequestInfoEmail,
  renderRequestScheduleEmail,
  renderRequestUnavailableEmail
} from "@/emails/templates/requesterRequests";

type RequestRecipient = {
  userId: string;
  email: string;
  name: string | null;
  notifyEmailEnabled: boolean;
  role: "ADMIN" | "SHEPHERD" | "MEMBER";
};

type RequestEmailResult = {
  status: "SENT" | "SKIPPED" | "FAILED";
  subject: string;
};

function buildRequestLink(role: RequestRecipient["role"], requestId: string) {
  if (role === "ADMIN" || role === "SHEPHERD") {
    return `/admin/requests?requestId=${requestId}`;
  }
  return `/requests/${requestId}`;
}

export async function sendRequestScheduleEmail(input: {
  parishId: string;
  parishName: string;
  requestId: string;
  requestTitle: string;
  requestTypeLabel: string;
  scheduleWindow: string;
  requester: RequestRecipient;
  note?: string;
}): Promise<RequestEmailResult> {
  const appUrl = getAppUrl();
  const requestLink = buildRequestLink(input.requester.role, input.requestId);
  const { subject, html, text } = renderRequestScheduleEmail({
    appUrl,
    parish: { name: input.parishName },
    requesterName: input.requester.name,
    requestTitle: input.requestTitle,
    requestLink,
    scheduleWindow: input.scheduleWindow,
    note: input.note
  });

  const result = await sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "requestSchedule",
    toEmail: input.requester.email,
    subject,
    html,
    text,
    parishId: input.parishId,
    userId: input.requester.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId: input.parishId,
      userId: input.requester.userId,
      toEmail: input.requester.email
    },
    prefs: {
      notifyEmailEnabled: input.requester.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });

  return { status: result.status, subject };
}

export async function sendRequestInfoEmail(input: {
  parishId: string;
  parishName: string;
  requestId: string;
  requestTitle: string;
  requestTypeLabel: string;
  requester: RequestRecipient;
  note?: string;
}): Promise<RequestEmailResult> {
  const appUrl = getAppUrl();
  const requestLink = buildRequestLink(input.requester.role, input.requestId);
  const { subject, html, text } = renderRequestInfoEmail({
    appUrl,
    parish: { name: input.parishName },
    requesterName: input.requester.name,
    requestTitle: input.requestTitle,
    requestLink,
    note: input.note
  });

  const result = await sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "requestNeedInfo",
    toEmail: input.requester.email,
    subject,
    html,
    text,
    parishId: input.parishId,
    userId: input.requester.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId: input.parishId,
      userId: input.requester.userId,
      toEmail: input.requester.email
    },
    prefs: {
      notifyEmailEnabled: input.requester.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });

  return { status: result.status, subject };
}

export async function sendRequestUnableToScheduleEmail(input: {
  parishId: string;
  parishName: string;
  requestId: string;
  requestTitle: string;
  requestTypeLabel: string;
  requester: RequestRecipient;
  note?: string;
}): Promise<RequestEmailResult> {
  const appUrl = getAppUrl();
  const requestLink = buildRequestLink(input.requester.role, input.requestId);
  const { subject, html, text } = renderRequestUnavailableEmail({
    appUrl,
    parish: { name: input.parishName },
    requesterName: input.requester.name,
    requestTitle: input.requestTitle,
    requestLink,
    note: input.note
  });

  const result = await sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "requestCannotSchedule",
    toEmail: input.requester.email,
    subject,
    html,
    text,
    parishId: input.parishId,
    userId: input.requester.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId: input.parishId,
      userId: input.requester.userId,
      toEmail: input.requester.email
    },
    prefs: {
      notifyEmailEnabled: input.requester.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });

  return { status: result.status, subject };
}

export async function sendRequestCancellationEmail(input: {
  parishId: string;
  parishName: string;
  requestId: string;
  requestTitle: string;
  requestTypeLabel: string;
  requester: RequestRecipient;
  note?: string;
}): Promise<RequestEmailResult> {
  const appUrl = getAppUrl();
  const requestLink = buildRequestLink(input.requester.role, input.requestId);
  const { subject, html, text } = renderRequestCancellationEmail({
    appUrl,
    parish: { name: input.parishName },
    requesterName: input.requester.name,
    requestTitle: input.requestTitle,
    requestLink,
    note: input.note
  });

  const result = await sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "requestCanceled",
    toEmail: input.requester.email,
    subject,
    html,
    text,
    parishId: input.parishId,
    userId: input.requester.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId: input.parishId,
      userId: input.requester.userId,
      toEmail: input.requester.email
    },
    prefs: {
      notifyEmailEnabled: input.requester.notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });

  return { status: result.status, subject };
}

