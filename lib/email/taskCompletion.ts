import { sendEmailIfAllowed } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderTaskCompletionEmail } from "@/emails/templates/taskCompletion";

type TaskCompletionEmailInput = {
  parishId: string;
  parishName: string;
  taskId: string;
  taskTitle: string;
  completedByName: string;
  recipientUserId: string;
  recipientEmail: string;
  notifyEmailEnabled: boolean;
  linkTarget: string;
};

export async function sendTaskCompletionEmail({
  parishId,
  parishName,
  taskId,
  taskTitle,
  completedByName,
  recipientUserId,
  recipientEmail,
  notifyEmailEnabled,
  linkTarget
}: TaskCompletionEmailInput) {
  const appUrl = getAppUrl();
  const taskLink = `${appUrl}${linkTarget}`;
  const { subject, html, text } = renderTaskCompletionEmail({
    parishName,
    taskTitle,
    completedByName,
    taskLink
  });

  return sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "taskCompletion",
    toEmail: recipientEmail,
    subject,
    html,
    text,
    parishId,
    userId: recipientUserId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId,
      userId: recipientUserId
    },
    prefs: {
      notifyEmailEnabled,
      weeklyDigestEnabled: false
    }
  });
}
