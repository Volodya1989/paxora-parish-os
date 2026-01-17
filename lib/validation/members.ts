import { z } from "zod";

const groupId = z.string().trim().min(1, "Group is required");
const userId = z.string().trim().min(1, "User is required");
const email = z.string().trim().email("Enter a valid email address");
const role = z.enum(["LEAD", "MEMBER"]);

export const inviteMemberSchema = z.object({
  groupId,
  email,
  role: role.optional()
});

export const acceptInviteSchema = z.object({
  groupId
});

export const declineInviteSchema = acceptInviteSchema;

export const removeMemberSchema = z.object({
  groupId,
  userId
});

export const changeMemberRoleSchema = z.object({
  groupId,
  userId,
  role
});
