import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type VerifyEmailInput = {
  appUrl: string;
  token: string;
  userName?: string | null;
};

export function renderVerifyEmail({ appUrl, token, userName }: VerifyEmailInput) {
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const html = renderEmailLayout({
    title: "Verify your Paxora email",
    previewText: "Confirm this email address to continue.",
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Verify your email</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        Please confirm this email address to finish setting up your Paxora account.
        This link expires in 24 hours.
      </p>
      ${renderButton("Verify Email", verifyUrl)}
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
        If you didn’t create this account, you can ignore this email.
      </p>
    `
  });

  const text = [
    "Verify your Paxora email",
    "",
    greeting,
    "",
    "Please confirm this email address to finish setting up your Paxora account.",
    `Verify: ${verifyUrl}`,
    "",
    "If you didn’t create this account, you can ignore this email."
  ].join("\n");

  return {
    subject: "Verify your Paxora email",
    html,
    text
  };
}
