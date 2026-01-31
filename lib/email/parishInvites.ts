import { sendEmail } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderParishInviteEmail } from "@/emails/templates/parishInvites";

export type ParishInviteEmailInput = {
  parishId: string;
  parishName: string;
  inviteeEmail: string;
  inviteLink: string;
  invitedByUserId?: string | null;
};

export async function sendParishInviteEmail({
  parishId,
  parishName,
  inviteeEmail,
  inviteLink,
  invitedByUserId
}: ParishInviteEmailInput) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderParishInviteEmail({
    appUrl,
    parishName,
    inviteLink
  });

  return sendEmail({
    type: "TRANSACTIONAL",
    template: "parishInvite",
    toEmail: inviteeEmail,
    subject,
    html,
    text,
    parishId,
    userId: invitedByUserId ?? null
  });
}
