import { z } from "zod";

const optionalTrimmedText = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().trim().min(1).optional()
);

const optionalId = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(1).optional()
);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  notes: optionalTrimmedText,
  weekId: z.string().min(1),
  groupId: optionalId,
  ownerId: optionalId,
  visibility: z
    .enum(["public", "private"])
    .optional()
    .default("public")
});

export const createGroupTaskSchema = createTaskSchema.extend({
  groupId: z.string().min(1)
});

export const markTaskDoneSchema = z.object({
  taskId: z.string().min(1)
});

export const unmarkTaskDoneSchema = markTaskDoneSchema;

export const archiveTaskSchema = markTaskDoneSchema;

export const unarchiveTaskSchema = markTaskDoneSchema;

export const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required"),
  notes: optionalTrimmedText
});

export const deleteTaskSchema = markTaskDoneSchema;

export const approveTaskSchema = markTaskDoneSchema;

export const rejectTaskSchema = markTaskDoneSchema;

export const deferTaskSchema = z.object({
  taskId: z.string().min(1),
  targetWeekId: z.string().min(1)
});

export const rolloverTasksSchema = z.object({
  fromWeekId: z.string().min(1),
  toWeekId: z.string().min(1)
});
