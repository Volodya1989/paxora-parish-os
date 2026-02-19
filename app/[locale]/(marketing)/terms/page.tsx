import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | Paxora Parish OS",
  description: "Pilot terms for using Paxora Parish OS.",
  openGraph: { title: "Terms | Paxora Parish OS", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default function TermsPage() {
  return (
    <section className="prose max-w-none prose-sm prose-headings:text-ink-900 prose-p:text-ink-700">
      <h1>Terms of Service</h1>
      <p>Last updated: February 2026. These pilot terms are a starter draft and not legal advice.</p>
      <h2>Service scope</h2>
      <p>Paxora Parish OS provides parish coordination tools for weekly planning, communication, and member responsibilities.</p>
      <h2>Pilot access</h2>
      <p>Pilot access may be limited, changed, or revoked as we improve stability and product fit with participating parishes.</p>
      <h2>Acceptable use</h2>
      <p>You agree not to misuse the service, bypass access controls, or upload harmful content.</p>
      <h2>Availability</h2>
      <p>We aim for reliable service but do not guarantee uninterrupted operation during pilot phase.</p>
      <h2>Liability</h2>
      <p>To the maximum extent allowed by law, the service is provided &quot;as is&quot; during pilot participation.</p>
    </section>
  );
}
