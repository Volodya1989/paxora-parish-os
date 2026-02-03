import { sendEmailIfAllowed } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderTaskCompletedEmail } from "@/emails/templates/taskCompleted";
import type { MembershipEmailPreferences } from "@/lib/email/rules";

type TaskCompletedNotificationInput = {
  parishId: string;
  parishName: string;
  taskId: string;
  taskTitle: string;
  completedByName: string;
  creator: {
    userId: string;
    email: string;
    notifyEmailEnabled: boolean;
  };
};

export async function sendTaskCompletedNotification({
  parishId,
  parishName,
  taskId,
  taskTitle,
  completedByName,
  creator
}: TaskCompletedNotificationInput) {
  const appUrl = getAppUrl();
  const { subject, html, text } = renderTaskCompletedEmail({
    appUrl,
    taskTitle,
    completedByName,
    parishName
  });

  const prefs: MembershipEmailPreferences = {
    notifyEmailEnabled: creator.notifyEmailEnabled,
    weeklyDigestEnabled: false
  };

  return sendEmailIfAllowed({
    type: "NOTIFICATION",
    template: "taskCompleted",
    toEmail: creator.email,
    subject,
    html,
    text,
    parishId,
    userId: creator.userId,
    dedupeLog: {
      type: "NOTIFICATION",
      parishId,
      userId: creator.userId,
      toEmail: creator.email
    },
    prefs
  });
}
