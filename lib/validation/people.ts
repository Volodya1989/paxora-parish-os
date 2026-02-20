import { z } from "zod";

const memberId = z.string().trim().min(1, "Member is required");
const role = z.enum(["ADMIN", "SHEPHERD", "MEMBER"]);

export const updateMemberRoleSchema = z.object({
  memberId,
  role
});

export const removeMemberSchema = z.object({
  memberId
});

export const deleteUserSchema = z.object({
  userId: z.string().trim().min(1, "User is required")
});
