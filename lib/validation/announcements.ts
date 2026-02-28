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

const nullToUndefined = (value: unknown) => (value === null ? undefined : value);

const announcementScopeSchema = z.preprocess(
  nullToUndefined,
  z.enum(["PARISH", "CHAT"]).default("PARISH")
);

const optionalChannelIdSchema = z.preprocess(nullToUndefined, z.string().min(1).optional());

const audienceUserIdsSchema = z.preprocess(
  nullToUndefined,
  z.array(z.string().min(1)).optional().default([])
);

export const createAnnouncementSchema = z.object({
  parishId: z.string().min(1),
  scopeType: announcementScopeSchema,
  chatChannelId: optionalChannelIdSchema,
  title: requiredTrimmedText,
  body: requiredTrimmedText,
  bodyHtml: optionalTrimmedText,
  bodyText: optionalTrimmedText,
  audienceUserIds: audienceUserIdsSchema,
  published: z.preprocess((value) => value === "true" || value === true, z.boolean())
});

export const updateAnnouncementSchema = z.object({
  id: z.string().min(1),
  scopeType: announcementScopeSchema,
  chatChannelId: optionalChannelIdSchema,
  title: requiredTrimmedText,
  body: requiredTrimmedText,
  bodyHtml: optionalTrimmedText,
  bodyText: optionalTrimmedText,
  audienceUserIds: audienceUserIdsSchema,
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

export const sendAnnouncementEmailSchema = z.object({
  announcementId: z.string().min(1)
});

export const sendTestAnnouncementEmailSchema = z.object({
  announcementId: z.string().min(1)
});
