import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type ParishInfo = {
  name: string;
};

type RequestAssignedInput = {
  appUrl: string;
  parish: ParishInfo;
  assigneeName?: string | null;
  requestTitle: string;
  requestTypeLabel: string;
  requestLink: string;
};

type RequestReminderInput = {
  appUrl: string;
  parish: ParishInfo;
  recipientName?: string | null;
  requestTitle: string;
  requestTypeLabel: string;
  statusLabel: string;
  requestLink: string;
};

export function renderRequestAssignedEmail({
  appUrl,
  parish,
  assigneeName,
  requestTitle,
  requestTypeLabel,
  requestLink
}: RequestAssignedInput) {
  const greeting = assigneeName ? `Hi ${assigneeName},` : "Hi there,";
  const html = renderEmailLayout({
    title: `New request assigned · ${parish.name}`,
    previewText: `A new request needs your attention at ${parish.name}.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New request assigned</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        A new request at <strong>${parish.name}</strong> has been assigned to you.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${requestTitle}</strong><br />
        ${requestTypeLabel}
      </p>
      ${renderButton("View request", `${appUrl}${requestLink}`)}
    `
  });

  const text = [
    `New request assigned · ${parish.name}`,
    "",
    greeting,
    "",
    `A new request at ${parish.name} has been assigned to you.`,
    "",
    `${requestTitle} — ${requestTypeLabel}`,
    `${appUrl}${requestLink}`
  ].join("\n");

  return {
    subject: `New request assigned for ${parish.name}`,
    html,
    text
  };
}

export function renderRequestReminderEmail({
  appUrl,
  parish,
  recipientName,
  requestTitle,
  requestTypeLabel,
  statusLabel,
  requestLink
}: RequestReminderInput) {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";
  const html = renderEmailLayout({
    title: `Request reminder · ${parish.name}`,
    previewText: `A request is waiting on follow-up at ${parish.name}.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Request reminder</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        A request at <strong>${parish.name}</strong> is waiting on follow-up.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${requestTitle}</strong><br />
        ${requestTypeLabel} · ${statusLabel}
      </p>
      ${renderButton("Review request", `${appUrl}${requestLink}`)}
    `
  });

  const text = [
    `Request reminder · ${parish.name}`,
    "",
    greeting,
    "",
    `A request at ${parish.name} is waiting on follow-up.`,
    "",
    `${requestTitle} — ${requestTypeLabel} · ${statusLabel}`,
    `${appUrl}${requestLink}`
  ].join("\n");

  return {
    subject: `Reminder: request waiting at ${parish.name}`,
    html,
    text
  };
}
