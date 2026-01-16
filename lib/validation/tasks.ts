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

const optionalHours = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  },
  z.number().min(0, "Estimated hours must be 0 or more").optional()
);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  notes: optionalTrimmedText,
  estimatedHours: optionalHours,
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
  notes: optionalTrimmedText,
  estimatedHours: optionalHours,
  groupId: optionalId,
  ownerId: optionalId,
  visibility: z.enum(["public", "private"])
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
