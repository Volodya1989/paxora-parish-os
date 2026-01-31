import { z } from "zod";

const parishId = z.string().trim().min(1, "Parish is required");
const inviteId = z.string().trim().min(1, "Invite is required");
const token = z.string().trim().min(1, "Invite token is required");
const email = z.string().trim().email("Enter a valid email address");
const role = z.enum(["ADMIN", "SHEPHERD", "MEMBER"]);

export const createParishInviteSchema = z.object({
  parishId,
  email,
  role: role.optional()
});

export const revokeParishInviteSchema = z.object({
  inviteId
});

export const acceptParishInviteSchema = z.object({
  token
});
