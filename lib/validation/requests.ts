import { z } from "zod";

export const createRequestSchema = z.object({
  type: z.enum(["CONFESSION", "LITURGICAL", "PRAYER", "TALK_TO_PRIEST"]),
  title: z.string().trim().min(1, "A short summary is required."),
  preferredTimeWindow: z.string().trim().optional(),
  notes: z.string().trim().optional()
});
