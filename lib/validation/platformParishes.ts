import { z } from "zod";
import { locales } from "@/lib/i18n/config";

export const platformParishSchema = z.object({
  name: z.string().trim().min(2, "Parish name is required."),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(2, "Timezone is required."),
  logoUrl: z.string().trim().url("Logo must be a valid URL.").optional().or(z.literal("")),
  defaultLocale: z.enum(locales, {
    errorMap: () => ({ message: "Select a valid locale." })
  })
});

export const updatePlatformParishSchema = platformParishSchema.extend({
  parishId: z.string().trim().min(1, "Parish is required.")
});
