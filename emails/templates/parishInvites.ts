import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type ParishInviteInput = {
  appUrl: string;
  parishName: string;
  inviteLink: string;
};

export function renderParishInviteEmail({ appUrl, parishName, inviteLink }: ParishInviteInput) {
  const html = renderEmailLayout({
    title: `Invitation to join ${parishName}`,
    previewText: `You’ve been invited to join ${parishName} on Paxora.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">You’re invited</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        You’ve been invited to join <strong>${parishName}</strong> on Paxora.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        Tap below to accept the invite and activate your parish access.
      </p>
      ${renderButton("Accept invite", inviteLink)}
      <p style="margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.5;">
        If the button doesn’t work, paste this link into your browser: ${inviteLink}
      </p>
    `
  });

  const text = [
    `Invitation to join ${parishName}`,
    "",
    `You’ve been invited to join ${parishName} on Paxora.`,
    "",
    "Accept your invite:",
    inviteLink,
    "",
    `Paxora: ${appUrl}`
  ].join("\n");

  return {
    subject: `You’ve been invited to join ${parishName} on Paxora`,
    html,
    text
  };
}
