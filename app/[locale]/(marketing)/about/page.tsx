import type { Metadata } from "next";
import { buildMarketingMetadata } from "../metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "About — Paxora Parish OS",
  "Paxora Parish OS exists to help parishes coordinate responsibilities with calm, clarity, and shared care.",
  "/about"
);

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">About Paxora Parish OS</h1>
      <section className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Mission</h2>
        <p className="mt-2 text-sm text-ink-700">
          We build people-serving, shepherd-anchored software that helps parish communities move through each week with visible ownership and less coordination stress.
        </p>
      </section>
      <section className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Founder story</h2>
        <p className="mt-2 text-sm text-ink-700">
          Paxora grew from real ministry workflows where WhatsApp threads and spreadsheets made it hard to keep responsibilities clear. We are shaping the product alongside pilot parishes in English and Ukrainian contexts.
        </p>
      </section>
    </div>
  );
}
