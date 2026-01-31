import { z } from "zod";

const trimmedText = z.string().trim().min(1, "Label is required");
const optionalUrl = z.preprocess(
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
  z.string().url().optional()
);

const optionalRoute = z.preprocess(
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
  z
    .string()
    .trim()
    .min(1)
    .regex(/^\//, "Route must start with /")
    .optional()
);

export const parishHubItemSchema = z.object({
  label: trimmedText.max(80, "Label must be 80 characters or fewer"),
  icon: z.enum([
    "BULLETIN",
    "MASS_TIMES",
    "CONFESSION",
    "WEBSITE",
    "CALENDAR",
    "READINGS",
    "GIVING",
    "CONTACT",
    "FACEBOOK",
    "YOUTUBE",
    "PRAYER",
    "NEWS"
  ]),
  targetType: z.enum(["EXTERNAL", "INTERNAL"]),
  targetUrl: optionalUrl,
  internalRoute: optionalRoute,
  visibility: z.enum(["PUBLIC", "LOGGED_IN"]),
  order: z.number().int().min(1).optional(),
  enabled: z.boolean().optional()
});

export const parishHubItemUpdateSchema = parishHubItemSchema.extend({
  itemId: z.string().min(1)
});

export const parishHubItemReorderSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        order: z.number().int().min(1)
      })
    )
    .min(1)
});

export const parishHubSettingsSchema = z.object({
  hubGridEnabled: z.boolean().optional(),
  hubGridPublicEnabled: z.boolean().optional()
});
