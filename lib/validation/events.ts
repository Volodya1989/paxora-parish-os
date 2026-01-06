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

const dateInput = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    return new Date(value);
  }
  return value;
}, z.date());

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  startsAt: dateInput,
  endsAt: dateInput,
  location: optionalTrimmedText,
  weekId: z.string().min(1)
});
