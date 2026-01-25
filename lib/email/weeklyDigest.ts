import { sendEmailIfAllowed } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderWeeklyDigestEmail } from "@/emails/templates/weeklyDigest";
import type { ThisWeekData } from "@/lib/queries/this-week";

type WeeklyDigestEmailInput = {
  parishId: string;
  parishName: string;
  weekId: string;
  userId: string;
  userEmail: string;
  weeklyDigestEnabled: boolean;
  data: ThisWeekData;
};

export async function sendWeeklyDigestEmail({
  parishId,
  parishName,
  weekId,
  userId,
  userEmail,
  weeklyDigestEnabled,
  data
}: WeeklyDigestEmailInput) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderWeeklyDigestEmail({
    appUrl,
    parishName,
    data
  });

  return sendEmailIfAllowed({
    type: "DIGEST",
    template: "weeklyDigest",
    toEmail: userEmail,
    subject,
    html,
    text,
    parishId,
    userId,
    weekId,
    dedupeLog: {
      type: "DIGEST",
      parishId,
      weekId,
      userId
    },
    prefs: {
      notifyEmailEnabled: false,
      weeklyDigestEnabled
    }
  });
}
