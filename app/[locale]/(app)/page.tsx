import { getNow } from "@/lib/time/getNow";
import { getHomeSummary, listCommunityRoomsPreview } from "@/lib/queries/home";
import HomeHero from "@/components/home/home-hero";
import QuickActions from "@/components/home/quick-actions";
import RecentUpdates from "@/components/home/recent-updates";
import CommunityPreview from "@/components/home/community-preview";
import HomeQuickNav from "@/components/home/home-quick-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const now = getNow();
  const [summary, rooms] = await Promise.all([
    getHomeSummary({ now }),
    listCommunityRoomsPreview()
  ]);

  const highlightCount = summary.nextEvents.length + summary.announcements.length;

  return (
    <div className="section-gap">
      <div className="mx-auto max-w-6xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          Parish at a glance
        </p>
        <h1 className="text-h1">Home</h1>
        <p className="text-sm text-ink-500">
          A steady view of what matters this week, grouped for quick decisions.
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

        <section id="highlights" className="scroll-mt-24">
          <HomeHero
            weekCompletion={summary.weekCompletion}
            nextEvents={summary.nextEvents}
            announcements={summary.announcements}
          />
        </section>

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
