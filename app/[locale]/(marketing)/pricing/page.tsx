import Link from "next/link";
import type { Metadata } from "next";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { buildMarketingMetadata } from "../metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "Pricing — Paxora Parish OS",
  "Paxora Parish OS is currently in pilot mode with guided onboarding for parish communities.",
  "/pricing"
);

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Currently in pilot — early parishes receive setup support and product feedback sessions.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Pilot</h2>
          <p className="mt-2 text-sm text-ink-700">Guided onboarding for invited parishes during pilot period.</p>
        </article>
        <article className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Future tiers</h2>
          <p className="mt-2 text-sm text-ink-700">Planned: Small Parish, Growing Parish, and Multi-Parish options.</p>
        </article>
      </div>
      <Link href={buildLocalePathname(locale, "/contact")} className="text-sm font-medium text-primary-700 underline">
        Contact us to request pilot access
      </Link>
    </div>
  );
}
