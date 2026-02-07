import { z } from "zod";

export const parishSchema = z.object({
  name: z.string().trim().min(2, "Parish name is required."),
  slug: z.string().trim().min(2, "Slug is required."),
  timezone: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable(),
  contactPhone: z.string().trim().optional().nullable()
});

export type ParishInput = z.infer<typeof parishSchema>;
