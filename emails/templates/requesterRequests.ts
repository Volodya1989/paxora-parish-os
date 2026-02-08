import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type ParishInfo = {
  name: string;
};

type BaseRequesterInput = {
  appUrl: string;
  parish: ParishInfo;
  requesterName?: string | null;
  requestTitle: string;
  requestLink: string;
  note?: string;
};

type RequestScheduleInput = BaseRequesterInput & {
  scheduleWindow: string;
};

const buildGreeting = (name?: string | null) => (name ? `Hi ${name},` : "Hi there,");

export function renderRequestScheduleEmail({
  appUrl,
  parish,
  requesterName,
  requestTitle,
  requestLink,
  scheduleWindow,
  note
}: RequestScheduleInput) {
  const greeting = buildGreeting(requesterName);
  const noteBlock = note
    ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${note}</p>`
    : "";

  const html = renderEmailLayout({
    title: `Request scheduled · ${parish.name}`,
    previewText: `Your request has been scheduled.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Request scheduled</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Your request for <strong>${parish.name}</strong> has been scheduled.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${requestTitle}</strong><br />
        ${scheduleWindow}
      </p>
      ${noteBlock}
      ${renderButton("View request", `${appUrl}${requestLink}`)}
    `
  });

  const text = [
    `Request scheduled · ${parish.name}`,
    "",
    greeting,
    "",
    `Your request has been scheduled: ${requestTitle}`,
    scheduleWindow,
    note ? `Note: ${note}` : "",
    `${appUrl}${requestLink}`
  ].filter(Boolean).join("\n");

  return {
    subject: `Your request has been scheduled · ${parish.name}`,
    html,
    text
  };
}

export function renderRequestInfoEmail({
  appUrl,
  parish,
  requesterName,
  requestTitle,
  requestLink,
  note
}: BaseRequesterInput) {
  const greeting = buildGreeting(requesterName);
  const noteBlock = note
    ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${note}</p>`
    : "";

  const html = renderEmailLayout({
    title: `More info needed · ${parish.name}`,
    previewText: `We need a little more information to schedule your request.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">More info needed</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        We need a little more information to schedule your request. Please call the parish office.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${requestTitle}</strong>
      </p>
      ${noteBlock}
      ${renderButton("View request", `${appUrl}${requestLink}`)}
    `
  });

  const text = [
    `More info needed · ${parish.name}`,
    "",
    greeting,
    "",
    "We need a little more information to schedule your request. Please call the parish office.",
    requestTitle,
    note ? `Note: ${note}` : "",
    `${appUrl}${requestLink}`
  ].filter(Boolean).join("\n");

  return {
    subject: `More info needed for your request · ${parish.name}`,
    html,
    text
  };
}

export function renderRequestUnavailableEmail({
  appUrl,
  parish,
  requesterName,
  requestTitle,
  requestLink,
  note
}: BaseRequesterInput) {
  const greeting = buildGreeting(requesterName);
  const noteBlock = note
    ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${note}</p>`
    : "";

  const html = renderEmailLayout({
    title: `Request update · ${parish.name}`,
    previewText: `We can’t schedule your request right now.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Request update</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        We can’t schedule your request right now. Please call the parish office so we can help.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${requestTitle}</strong>
      </p>
      ${noteBlock}
      ${renderButton("View request", `${appUrl}${requestLink}`)}
    `
  });

  const text = [
    `Request update · ${parish.name}`,
    "",
    greeting,
    "",
    "We can’t schedule your request right now. Please call the parish office so we can help.",
    requestTitle,
    note ? `Note: ${note}` : "",
    `${appUrl}${requestLink}`
  ].filter(Boolean).join("\n");

  return {
    subject: `Update on your request · ${parish.name}`,
    html,
    text
  };
}

export function renderRequestCancellationEmail({
  appUrl,
  parish,
  requesterName,
  requestTitle,
  requestLink,
  note
}: BaseRequesterInput) {
  const greeting = buildGreeting(requesterName);
  const noteBlock = note
    ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${note}</p>`
    : "";

  const html = renderEmailLayout({
    title: `Request canceled · ${parish.name}`,
    previewText: `Your request has been canceled.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Request canceled</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Your request has been canceled. If you still need this, please call the parish office.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${requestTitle}</strong>
      </p>
      ${noteBlock}
      ${renderButton("View request", `${appUrl}${requestLink}`)}
    `
  });

  const text = [
    `Request canceled · ${parish.name}`,
    "",
    greeting,
    "",
    "Your request has been canceled. If you still need this, please call the parish office.",
    requestTitle,
    note ? `Note: ${note}` : "",
    `${appUrl}${requestLink}`
  ].filter(Boolean).join("\n");

  return {
    subject: `Your request has been canceled · ${parish.name}`,
    html,
    text
  };
}

