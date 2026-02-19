import type { Metadata } from "next";
import { buildMarketingMetadata } from "../metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "Privacy policy — Paxora Parish OS",
  "Starter privacy policy for pilot operations covering account, communication, and data handling practices.",
  "/privacy"
);

export default function PrivacyPage() {
  return (
    <article className="prose max-w-none rounded-2xl border border-mist-200 bg-white p-6 shadow-sm prose-headings:text-ink-900 prose-p:text-ink-700">
      <h1>Privacy Policy (Pilot)</h1>
      <p>This document is a starter policy for pilot use and is not legal advice.</p>
      <h2>Information we collect</h2>
      <p>Account identity details, parish membership details, and content you create in the app.</p>
      <h2>How we use information</h2>
      <p>To provide parish coordination features, improve reliability, and support pilot onboarding.</p>
      <h2>Sharing</h2>
      <p>We do not sell personal data. Service providers may process data for hosting, email, and storage.</p>
      <h2>Retention</h2>
      <p>Data is retained while your parish account remains active unless deletion is requested.</p>
      <h2>Contact</h2>
      <p>For privacy requests, contact the Paxora team via the contact form on this website.</p>
    </article>
  );
}
