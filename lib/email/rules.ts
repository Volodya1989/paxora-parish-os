import { EmailType } from "@prisma/client";

export type MembershipEmailPreferences = {
  notifyEmailEnabled: boolean;
  weeklyDigestEnabled: boolean;
};

export function shouldSendEmail(type: EmailType, prefs?: MembershipEmailPreferences | null) {
  if (type === "TRANSACTIONAL") {
    return true;
  }

  if (!prefs) {
    return false;
  }

  if (type === "NOTIFICATION") {
    return prefs.notifyEmailEnabled === true;
  }

  if (type === "DIGEST") {
    return prefs.weeklyDigestEnabled === true;
  }

  if (type === "ANNOUNCEMENT") {
    return prefs.notifyEmailEnabled === true;
  }

  return false;
}
