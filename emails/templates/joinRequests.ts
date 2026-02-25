import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type ParishInfo = {
  name: string;
};

type JoinRequestSubmittedInput = {
  appUrl: string;
  parish: ParishInfo;
  requesterName?: string | null;
};

type JoinRequestAdminInput = {
  appUrl: string;
  parish: ParishInfo;
  requesterName?: string | null;
  requesterEmail: string;
};

type JoinRequestDecisionInput = {
  appUrl: string;
  parish: ParishInfo;
  requesterName?: string | null;
  decision: "APPROVED" | "REJECTED";
};

export function renderJoinRequestSubmittedEmail({
  appUrl,
  parish,
  requesterName
}: JoinRequestSubmittedInput) {
  const greeting = requesterName ? `Hi ${requesterName},` : "Hi there,";
  const html = renderEmailLayout({
    title: `Request received for ${parish.name}`,
    previewText: `We received your request to join ${parish.name}.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Request received</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        We received your request to join <strong>${parish.name}</strong>. We’ll notify you once a parish leader reviews it.
      </p>
      ${renderButton("View request status", `${appUrl}/access`)}
    `
  });

  const text = [
    `Request received for ${parish.name}`,
    "",
    greeting,
    "",
    `We received your request to join ${parish.name}. We’ll notify you once a parish leader reviews it.`,
    `${appUrl}/access`
  ].join("\n");

  return {
    subject: `We received your request to join ${parish.name}`,
    html,
    text
  };
}

export function renderJoinRequestAdminEmail({
  appUrl,
  parish,
  requesterName,
  requesterEmail
}: JoinRequestAdminInput) {
  const displayName = requesterName ? `${requesterName} (${requesterEmail})` : requesterEmail;
  const html = renderEmailLayout({
    title: `New access request for ${parish.name}`,
    previewText: `New access request for ${parish.name}.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New access request</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        ${displayName} requested access to <strong>${parish.name}</strong>.
      </p>
      ${renderButton("Review access requests", `${appUrl}/profile`)}
    `
  });

  const text = [
    `New access request for ${parish.name}`,
    "",
    `${displayName} requested access to ${parish.name}.`,
    `${appUrl}/profile`
  ].join("\n");

  return {
    subject: `New access request for ${parish.name}`,
    html,
    text
  };
}

export function renderJoinRequestDecisionEmail({
  appUrl,
  parish,
  requesterName,
  decision
}: JoinRequestDecisionInput) {
  const greeting = requesterName ? `Hi ${requesterName},` : "Hi there,";
  const isApproved = decision === "APPROVED";
  const title = isApproved ? "Access approved" : "Access update";
  const body = isApproved
    ? `Good news — your request to join ${parish.name} has been approved. You can now sign in and start participating.`
    : `Thanks for your interest in ${parish.name}. Your request wasn’t approved at this time. If this is a mistake, please contact the church office.`;
  const buttonLabel = isApproved ? "Sign in to Paxora" : "Visit Paxora";
  const buttonLink = isApproved ? `${appUrl}/sign-in` : `${appUrl}/access`;

  const html = renderEmailLayout({
    title: `${title} · ${parish.name}`,
    previewText: body,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${title}</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        ${body}
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
    buttonLink
  ].join("\n");

  return {
    subject: isApproved
      ? `Approved — you now have access to ${parish.name}`
      : `Update on your access request to ${parish.name}`,
    html,
    text
  };
}
