import { getNow } from "@/lib/time/getNow";
import { getHomeSummary, listCommunityRoomsPreview } from "@/lib/queries/home";
import HomeHero from "@/components/home/home-hero";
import QuickActions from "@/components/home/quick-actions";
import RecentUpdates from "@/components/home/recent-updates";
import CommunityPreview from "@/components/home/community-preview";
import HomeQuickNav from "@/components/home/home-quick-nav";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// INVESTIGATION: This Week legacy rendering
// Date: 2026-02-18
// Observed issue: Users occasionally report seeing an older This Week card UI after reopening/refreshing the app.
// Hypothesis: The root app page ("/" -> localized "/[locale]") still renders a legacy This Week hero card
// that can be mistaken for the canonical /this-week page.
// Next steps: Keep this card disabled behind an explicit investigation guard and confirm whether reports stop.
const __LEGACY_THIS_WEEK_DISABLED__ = true;

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);
  const now = getNow();
  const [summary, rooms] = await Promise.all([
    getHomeSummary({ now }),
    listCommunityRoomsPreview()
  ]);

  console.info("[investigation][this-week][server] home-page-render", {
    route: `/${locale}`,
    legacyThisWeekCardDisabled: __LEGACY_THIS_WEEK_DISABLED__,
    env: process.env.NODE_ENV,
    buildId: process.env.NEXT_BUILD_ID ?? "unknown"
  });

  const highlightCount = summary.nextEvents.length + summary.announcements.length;

  return (
    <div className="section-gap overflow-x-hidden">
      <div className="mx-auto max-w-6xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          {t("landing.home")}
        </p>
        <h1 className="text-h1">{t("landing.home")}</h1>
        <p className="text-sm text-ink-500">
          {t("thisWeek.quote")}
        </p>
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        <HomeQuickNav
          counts={{
            highlights: highlightCount,
            updates: summary.recentUpdates.length,
            actions: 2,
            community: rooms.length
          }}
        />

        {!__LEGACY_THIS_WEEK_DISABLED__ ? (
          <section id="highlights" className="scroll-mt-24">
            <HomeHero
              weekCompletion={summary.weekCompletion}
              nextEvents={summary.nextEvents}
              announcements={summary.announcements}
              locale={locale}
            />
          </section>
        ) : (
          /*
           LEGACY THIS WEEK UI — suspected unused.
           Temporarily disabled during investigation.
           See investigation log: docs/investigations/this-week-legacy-ui.md.

           Notes:
           - This block renders the older "This Week" card inside Home (/).
           - Canonical This Week route is /[locale]/this-week.
           - We are NOT deleting this code in Phase 1; only isolating it safely.
          */
          null
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section id="updates" className="scroll-mt-24 space-y-6">
            <RecentUpdates updates={summary.recentUpdates} />
          </section>
          <div className="space-y-6">
            <section id="actions" className="scroll-mt-24">
              <QuickActions />
            </section>
            <section id="community" className="scroll-mt-24">
              <CommunityPreview rooms={rooms} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
