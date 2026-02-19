import type { Metadata } from "next";
import { buildMarketingMetadata } from "../metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "Terms of service — Paxora Parish OS",
  "Starter terms for pilot use of Paxora Parish OS, including account use, acceptable behavior, and support limits.",
  "/terms"
);

export default function TermsPage() {
  return (
    <article className="prose max-w-none rounded-2xl border border-mist-200 bg-white p-6 shadow-sm prose-headings:text-ink-900 prose-p:text-ink-700">
      <h1>Terms of Service (Pilot)</h1>
      <p>This document is a starter policy for pilot use and is not legal advice.</p>
      <h2>Use of service</h2>
      <p>Paxora Parish OS is provided for parish coordination and communication during pilot participation.</p>
      <h2>Accounts and access</h2>
      <p>Parishes are responsible for account roles, membership management, and access revocation.</p>
      <h2>Acceptable use</h2>
      <p>Do not misuse the service for unlawful activity, harassment, or unauthorized access attempts.</p>
      <h2>Service changes</h2>
      <p>Pilot features may evolve, and temporary interruptions can occur during improvement cycles.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, the service is provided as-is during pilot operation.</p>
    </article>
  );
}
