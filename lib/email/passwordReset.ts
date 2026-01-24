import { sendEmail } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderResetPasswordEmail } from "@/emails/templates/resetPassword";

type ResetPasswordEmailInput = {
  userId: string;
  email: string;
  name?: string | null;
  token: string;
};

export async function sendResetPasswordEmail({ userId, email, name, token }: ResetPasswordEmailInput) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderResetPasswordEmail({
    appUrl,
    token,
    userName: name
  });

  return sendEmail({
    type: "TRANSACTIONAL",
    template: "resetPassword",
    toEmail: email,
    subject,
    html,
    text,
    userId
  });
}
