"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email/emailService";

type ContactActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  parish: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160),
  message: z.string().trim().min(10).max(2000)
});

export async function submitMarketingContact(
  _prevState: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    parish: formData.get("parish"),
    email: formData.get("email"),
    message: formData.get("message")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please fill all fields with valid information." };
  }

  const toEmail = process.env.EMAIL_REPLY_TO ?? process.env.EMAIL_FROM_DEFAULT ?? process.env.EMAIL_FROM;
  if (!toEmail) {
    return { status: "error", message: "Contact intake is temporarily unavailable." };
  }

  const data = parsed.data;
  const emailResult = await sendEmail({
    type: "TRANSACTIONAL",
    template: "marketing-contact",
    toEmail,
    replyTo: data.email,
    subject: `Pilot request from ${data.parish}`,
    html: `<h1>New marketing contact submission</h1>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Parish:</strong> ${data.parish}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Message:</strong></p>
      <p>${data.message.replace(/\n/g, "<br />")}</p>`,
    text: `New marketing contact submission\n\nName: ${data.name}\nParish: ${data.parish}\nEmail: ${data.email}\n\n${data.message}`
  });

  if (emailResult.status === "FAILED") {
    return { status: "error", message: "We could not send your request. Please email us directly." };
  }

  return { status: "success", message: "Thanks! We will reach out within 1 business day." };
}
