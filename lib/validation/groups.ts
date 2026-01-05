import { z } from "zod";

export const getGroupDetailSchema = z.object({
  groupId: z.string().min(1)
});

export const updateGroupMembershipSchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["LEAD", "MEMBER", "REMOVE"])
});
