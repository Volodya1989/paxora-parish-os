import { z } from "zod";

export const createEventRequestSchema = z.object({
  title: z.string().min(1, "Event title is required."),
  type: z.enum(["SERVICE", "REHEARSAL", "GATHERING", "OTHER"]),
  date: z.string().min(1, "Proposed date is required."),
  time: z.string().min(1, "Proposed time is required."),
  location: z.string().min(1, "Location is required."),
  description: z.string().min(1, "Description is required."),
  participants: z.string().optional(),
  contactName: z.string().min(1, "Your name is required.")
});
