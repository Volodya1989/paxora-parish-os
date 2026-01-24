import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type ResetPasswordInput = {
  appUrl: string;
  token: string;
  userName?: string | null;
};

export function renderResetPasswordEmail({ appUrl, token, userName }: ResetPasswordInput) {
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const html = renderEmailLayout({
    title: "Reset your Paxora password",
    previewText: "Reset your Paxora password.",
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Reset your Paxora password</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        We received a request to reset your password. Use the button below to set a new password.
        This link expires in 60 minutes.
      </p>
      ${renderButton("Reset Password", resetUrl)}
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
        If you didn’t request this, you can safely ignore this email.
      </p>
    `
  });

  const text = [
    "Reset your Paxora password",
    "",
    greeting,
    "",
    "We received a request to reset your password. Use the link below to set a new password.",
    `Reset: ${resetUrl}`,
    "",
    "If you didn’t request this, you can safely ignore this email."
  ].join("\n");

  return {
    subject: "Reset your Paxora password",
    html,
    text
  };
}
