import type { Metadata } from "next";
import ContactForm from "@/components/marketing/ContactForm";
import { buildMarketingMetadata } from "../metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "Contact — Paxora Parish OS",
  "Tell us about your parish and request pilot onboarding or a personalized product demo.",
  "/contact"
);

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Contact us</h1>
      <p className="text-ink-700">Request pilot access, ask product questions, or book a walkthrough for your parish team.</p>
      <ContactForm />
    </div>
  );
}
