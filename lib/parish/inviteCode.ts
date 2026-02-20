import { randomInt } from "crypto";
import { prisma } from "@/server/db/prisma";

export const PARISH_INVITE_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DEFAULT_INVITE_CODE_LENGTH = 7;

export function generateParishInviteCode(length = DEFAULT_INVITE_CODE_LENGTH) {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += PARISH_INVITE_CODE_CHARSET[randomInt(PARISH_INVITE_CODE_CHARSET.length)];
  }
  return code;
}

export function normalizeParishInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function generateUniqueParishInviteCode(
  existsByCode: (code: string) => Promise<boolean>,
  options?: { maxAttempts?: number; length?: number }
) {
  const maxAttempts = options?.maxAttempts ?? 50;
  const length = options?.length ?? DEFAULT_INVITE_CODE_LENGTH;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateParishInviteCode(length);
    const exists = await existsByCode(candidate);
    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Unable to generate unique parish invite code");
}

export async function createParishInviteCode() {
  return generateUniqueParishInviteCode(async (candidate) => {
    const parish = await prisma.parish.findUnique({
      where: { inviteCode: candidate },
      select: { id: true }
    });
    return Boolean(parish?.id);
  });
}
