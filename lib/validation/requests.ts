import { z } from "zod";

export const createRequestSchema = z.object({
  type: z.enum(["CONFESSION", "GENERIC", "LITURGICAL", "PRAYER", "TALK_TO_PRIEST"]),
  title: z.string().trim().min(1, "A short summary is required."),
  requesterName: z.string().trim().min(1, "Your name is required."),
  requesterEmail: z.string().trim().email("Enter a valid email address."),
  requesterPhone: z.string().trim().optional(),
  description: z.string().trim().min(15, "Please share at least 15 characters."),
  preferredTimeWindow: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const scheduleRequestSchema = z.object({
  requestId: z.string().min(1, "Request not found."),
  date: z.string().min(1, "Choose a date."),
  startTime: z.string().min(1, "Choose a start time."),
  endTime: z.string().min(1, "Choose an end time."),
  note: z.string().trim().optional()
});

export const requestEmailSchema = z.object({
  requestId: z.string().min(1, "Request not found."),
  note: z.string().trim().optional()
});

export const requestResponseSchema = z.object({
  requestId: z.string().min(1, "Request not found."),
  response: z.enum(["ACCEPT", "REJECT"])
});
