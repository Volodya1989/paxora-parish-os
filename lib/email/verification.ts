import { sendEmail } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderVerifyEmail } from "@/emails/templates/verifyEmail";

type VerificationEmailInput = {
  userId: string;
  email: string;
  name?: string | null;
  token: string;
};

export async function sendVerificationEmail({
  userId,
  email,
  name,
  token
}: VerificationEmailInput) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderVerifyEmail({
    appUrl,
    token,
    userName: name
  });

  return sendEmail({
    type: "TRANSACTIONAL",
    template: "verifyEmail",
    toEmail: email,
    subject,
    html,
    text,
    userId
  });
}
