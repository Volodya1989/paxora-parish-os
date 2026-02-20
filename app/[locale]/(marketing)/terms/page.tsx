import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | Paxora Parish Center App",
  description: "Terms for using Paxora Parish Center App for parish and community coordination.",
  openGraph: { title: "Terms | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default function TermsPage() {
  return (
    <section className="prose max-w-none prose-sm prose-headings:text-ink-900 prose-p:text-ink-700">
      <h1>Terms of Service</h1>
      <p>Last updated: February 2026. These terms are provided for pilot operations and are not legal advice.</p>

      <h2>Service purpose</h2>
      <p>
        Paxora Parish Center App is a parish management app built for modern parish life. It helps parish teams coordinate
        weekly planning, communication, events, requests, and volunteer responsibilities.
      </p>

      <h2>Respectful and responsible use</h2>
      <p>
        The app is intended for parish and community use. You agree not to misuse the service, abuse other users,
        attempt unauthorized access, introduce malicious content, or disrupt normal operations.
      </p>

      <h2>Account access and security</h2>
      <p>
        Access is managed by parish leadership and authorized administrators. We apply role-based access controls and
        reasonable safeguards to help protect parish information and user accounts.
      </p>

      <h2>Parish data ownership</h2>
      <p>
        Each parish retains ownership of its own content and data in the app. Authorized parish leaders may request
        data export or deletion support by contacting us.
      </p>

      <h2>Data protection commitment</h2>
      <p>
        We do not sell user data and we do not misuse parish information. Data is processed only to provide, maintain,
        secure, and improve the service for participating parishes.
      </p>

      <h2>Service availability</h2>
      <p>
        We work to provide reliable service, but pilot features may evolve over time as we improve stability and product fit.
      </p>

      <h2>Liability</h2>
      <p>To the maximum extent allowed by law, the service is provided &quot;as is&quot; during pilot participation.</p>
    </section>
  );
}
