"use server";

import { z } from "zod";
import { prisma } from "@/server/db/prisma";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  parish: z.string().trim().min(2, "Please share your parish name."),
  email: z.string().trim().email("Please provide a valid email address."),
  message: z.string().trim().min(10, "Please add a short message (at least 10 characters).")
});

export type ContactSubmissionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "parish" | "email" | "message", string>>;
};

export const initialContactSubmissionState: ContactSubmissionState = {
  status: "idle"
};

export async function createContactSubmission(
  _prevState: ContactSubmissionState,
  formData: FormData
): Promise<ContactSubmissionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    parish: formData.get("parish"),
    email: formData.get("email"),
    message: formData.get("message")
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: {
        name: flattened.name?.[0],
        parish: flattened.parish?.[0],
        email: flattened.email?.[0],
        message: flattened.message?.[0]
      }
    };
  }

  try {
    await prisma.contactSubmission.create({
      data: {
        name: parsed.data.name,
        parish: parsed.data.parish,
        email: parsed.data.email,
        message: parsed.data.message
      }
    });
  } catch (error) {
    console.error("Failed to save contact submission", error);
    return {
      status: "error",
      message: "We could not submit your request right now. Please try again shortly."
    };
  }

  return {
    status: "success",
    message: "Thanks! We received your request and will follow up soon."
  };
}
