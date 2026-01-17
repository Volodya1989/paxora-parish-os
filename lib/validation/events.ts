import { z } from "zod";

const optionalTrimmedText = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
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
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(1).optional()
);

const dateText = z.string().trim().min(1, "Date is required");
const timeText = z
  .string()
  .trim()
  .min(1, "Time is required")
  .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format");

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  date: dateText,
  startTime: timeText,
  endTime: timeText,
  location: optionalTrimmedText,
  summary: optionalTrimmedText,
  visibility: z.enum(["PUBLIC", "GROUP", "PRIVATE"]),
  groupId: optionalId,
  type: z.enum(["SERVICE", "EVENT"]).default("EVENT")
});

export const updateEventSchema = createEventSchema.extend({
  eventId: z.string().min(1)
});
