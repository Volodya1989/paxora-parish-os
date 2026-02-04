import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type ParishInfo = {
  name: string;
};

type EventRequestSubmittedInput = {
  appUrl: string;
  parish: ParishInfo;
  requesterName?: string | null;
  eventTitle: string;
  eventDateTime: string;
};

type EventRequestAdminInput = {
  appUrl: string;
  parish: ParishInfo;
  requesterName?: string | null;
  requesterEmail: string;
  eventTitle: string;
  eventDateTime: string;
  location?: string | null;
  groupNames?: string[];
};

type EventRequestDecisionInput = {
  appUrl: string;
  parish: ParishInfo;
  requesterName?: string | null;
  decision: "APPROVED" | "REJECTED";
  eventTitle: string;
  eventDateTime: string;
};

export function renderEventRequestSubmittedEmail({
  appUrl,
  parish,
  requesterName,
  eventTitle,
  eventDateTime
}: EventRequestSubmittedInput) {
  const greeting = requesterName ? `Hi ${requesterName},` : "Hi there,";
  const html = renderEmailLayout({
    title: `Event request received · ${parish.name}`,
    previewText: `We received your event request for ${parish.name}.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Request received</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        We received your event request for <strong>${parish.name}</strong> and will notify you once a leader reviews it.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${eventTitle}</strong><br />
        ${eventDateTime}
      </p>
      ${renderButton("View calendar", `${appUrl}/calendar`)}
    `
  });

  const text = [
    `Event request received · ${parish.name}`,
    "",
    greeting,
    "",
    `We received your event request for ${parish.name} and will notify you once a leader reviews it.`,
    "",
    `${eventTitle} — ${eventDateTime}`,
    `${appUrl}/calendar`
  ].join("\n");

  return {
    subject: `We received your event request for ${parish.name}`,
    html,
    text
  };
}

export function renderEventRequestAdminEmail({
  appUrl,
  parish,
  requesterName,
  requesterEmail,
  eventTitle,
  eventDateTime,
  location,
  groupNames
}: EventRequestAdminInput) {
  const displayName = requesterName ? `${requesterName} (${requesterEmail})` : requesterEmail;
  const groupLine = groupNames?.length
    ? `Requested by a member of ${groupNames.join(", ")}.`
    : "";
  const locationLine = location ? `<br />Location: ${location}` : "";
  const html = renderEmailLayout({
    title: `New event request · ${parish.name}`,
    previewText: `New event request for ${parish.name}.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New event request</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        ${displayName} submitted a request for <strong>${parish.name}</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${eventTitle}</strong><br />
        ${eventDateTime}${locationLine}
      </p>
      ${groupLine ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${groupLine}</p>` : ""}
      ${renderButton("Review event requests", `${appUrl}/calendar`)}
    `
  });

  const text = [
    `New event request · ${parish.name}`,
    "",
    `${displayName} submitted a request for ${parish.name}.`,
    "",
    `${eventTitle} — ${eventDateTime}${location ? ` — Location: ${location}` : ""}`,
    groupLine,
    `${appUrl}/calendar`
  ].filter(Boolean).join("\n");

  return {
    subject: `New event request for ${parish.name}`,
    html,
    text
  };
}

export function renderEventRequestDecisionEmail({
  appUrl,
  parish,
  requesterName,
  decision,
  eventTitle,
  eventDateTime
}: EventRequestDecisionInput) {
  const greeting = requesterName ? `Hi ${requesterName},` : "Hi there,";
  const isApproved = decision === "APPROVED";
  const title = isApproved ? "Event request approved" : "Event request update";
  const body = isApproved
    ? `Good news — your event request for ${parish.name} has been approved and added to the calendar.`
    : `Thanks for submitting your event request to ${parish.name}. It wasn’t approved at this time.`;
  const buttonLabel = isApproved ? "View calendar" : "View calendar";
  const buttonLink = `${appUrl}/calendar`;

  const html = renderEmailLayout({
    title: `${title} · ${parish.name}`,
    previewText: body,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${title}</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        ${body}
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${eventTitle}</strong><br />
        ${eventDateTime}
      </p>
      ${renderButton(buttonLabel, buttonLink)}
    `
  });

  const text = [
    `${title} · ${parish.name}`,
    "",
    greeting,
    "",
    body,
    "",
    `${eventTitle} — ${eventDateTime}`,
    buttonLink
  ].join("\n");

  return {
    subject: isApproved
      ? `Approved — your event request for ${parish.name}`
      : `Update on your event request for ${parish.name}`,
    html,
    text
  };
}
