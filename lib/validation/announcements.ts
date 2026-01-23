import { z } from "zod";

const requiredTrimmedText = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  },
  z.string().min(1, "This field is required")
);

const optionalTrimmedText = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().optional()
);

export const createAnnouncementSchema = z.object({
  parishId: z.string().min(1),
  title: requiredTrimmedText,
  body: requiredTrimmedText,
  published: z.preprocess((value) => value === "true" || value === true, z.boolean())
});

export const updateAnnouncementSchema = z.object({
  id: z.string().min(1),
  title: requiredTrimmedText,
  body: requiredTrimmedText,
  published: z.preprocess((value) => value === "true" || value === true, z.boolean())
});

export const deleteAnnouncementSchema = z.object({
  id: z.string().min(1)
});

export const updateAnnouncementStatusSchema = z.object({
  id: z.string().min(1),
  published: z.preprocess((value) => value === "true" || value === true, z.boolean()),
  publishedAt: optionalTrimmedText
});
