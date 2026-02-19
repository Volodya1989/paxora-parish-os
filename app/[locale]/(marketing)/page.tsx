import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { authOptions } from "@/server/auth/options";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { buildMarketingMetadata } from "./metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "Paxora Parish OS — Calm weekly coordination for parish life",
  "Paxora Parish OS helps parish leaders and volunteers stay aligned every week with clear ownership and low-noise communication.",
  "/"
);

export default async function MarketingHomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);

  if (session?.user?.id) {
    redirect(buildLocalePathname(locale, "/this-week"));
  }

  return (
    <div className="space-y-10">
      <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
        Pilot launch in progress — onboarding new parishes now
      </p>
      <section className="grid gap-8 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold md:text-5xl">Parish coordination with clarity, calm, and weekly rhythm.</h1>
          <p className="text-base text-ink-700">
            Paxora Parish OS is built for clergy, staff, and volunteers who need shared ownership across the week without dashboard noise.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={buildLocalePathname(locale, "/sign-up")}
              className="rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              Request Pilot Access
            </Link>
            <Link
              href={buildLocalePathname(locale, "/demo")}
              className="rounded-button border border-mist-300 bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-mist-50"
            >
              Schedule a Demo
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-mist-200 bg-mist-100 p-6 text-sm text-ink-600">
          <p className="font-medium text-ink-800">Product preview</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3 shadow-sm">This Week overview</div>
            <div className="rounded-xl bg-white p-3 shadow-sm">Serve board</div>
            <div className="rounded-xl bg-white p-3 shadow-sm">Group chat</div>
            <div className="rounded-xl bg-white p-3 shadow-sm">Requests inbox</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[
          ["This Week", "The weekly home that shows tasks, events, and announcements in one calm view."],
          ["Serve + Tasks", "Clear ownership with roll-forward behavior so nothing is dropped."],
          ["Groups + Chat", "Ministry groups with focused communication, threads, and attachments."],
          ["Requests + Parish Hub", "Handle needs, approvals, and parish resources in one place."]
        ].map(([title, description]) => (
          <article key={title} className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-ink-700">{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
