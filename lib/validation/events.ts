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

const optionalDateText = z.preprocess(
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

const eventScope = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    return value;
  },
  z.enum(["THIS_EVENT", "THIS_SERIES"]).default("THIS_EVENT")
);

const recurrenceByWeekday = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value !== "string") {
      return [];
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    return trimmed
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item));
  },
  z.array(z.number().int().min(0).max(6)).default([])
);

const recurrenceInterval = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? Number(trimmed) : undefined;
    }
    return undefined;
  },
  z.number().int().min(1).optional()
);

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  date: dateText,
  startTime: timeText,
  endTime: timeText,
  location: optionalTrimmedText,
  summary: optionalTrimmedText,
  visibility: z.enum(["PUBLIC", "GROUP", "PRIVATE"]),
  groupId: optionalId,
  type: z.enum(["SERVICE", "EVENT"]).default("EVENT"),
  recurrenceFreq: z.enum(["NONE", "DAILY", "WEEKLY"]).default("NONE"),
  recurrenceInterval,
  recurrenceByWeekday,
  recurrenceUntil: optionalDateText
});

export const updateEventSchema = createEventSchema.extend({
  eventId: z.string().min(1),
  scope: eventScope,
  occurrenceStartsAt: optionalDateText
});

export const deleteEventSchema = z.object({
  eventId: z.string().min(1),
  scope: eventScope,
  occurrenceStartsAt: optionalDateText
});
