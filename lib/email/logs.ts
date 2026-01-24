import type { EmailLog } from "@prisma/client";

export function isWeeklyDigestAlreadySent(existingLog: EmailLog | null) {
  return existingLog?.status === "SENT";
}
