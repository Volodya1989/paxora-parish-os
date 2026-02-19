import Link from "next/link";
import type { Metadata } from "next";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { buildMarketingMetadata } from "../metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "Book a demo — Paxora Parish OS",
  "Schedule a product walkthrough to see weekly parish coordination in action.",
  "/demo"
);

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Schedule a demo</h1>
      <p className="text-ink-700">We currently offer guided demos for pilot parishes. Share your context and we will tailor the walkthrough.</p>
      <div className="rounded-2xl border border-dashed border-mist-300 bg-white p-6 text-sm text-ink-600">
        TODO: Add screenshot carousel or recorded walkthrough once final assets are available.
      </div>
      <Link href={buildLocalePathname(locale, "/contact")} className="text-sm font-medium text-primary-700 underline">
        Contact us for a pilot demo slot
      </Link>
    </div>
  );
}
