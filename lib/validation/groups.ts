import { z } from "zod";

export const getGroupDetailSchema = z.object({
  groupId: z.string().min(1)
});

export const updateGroupMembershipSchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["COORDINATOR", "PARISHIONER", "REMOVE"])
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required.")
    .max(80, "Group name must be 80 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(280, "Description must be 280 characters or fewer.")
    .optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  joinPolicy: z.enum(["INVITE_ONLY", "OPEN", "REQUEST_TO_JOIN"]),
  inviteeUserIds: z.array(z.string().min(1)).max(50).optional()
});

export const updateGroupSchema = createGroupSchema.extend({
  groupId: z.string().min(1)
});

export const groupArchiveSchema = z.object({
  groupId: z.string().min(1)
});

export const groupDeleteSchema = z.object({
  groupId: z.string().min(1)
});
