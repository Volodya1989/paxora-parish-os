import { getNow } from "@/lib/time/getNow";
import { getHomeSummary, listCommunityRoomsPreview } from "@/lib/queries/home";
import HomeHero from "@/components/home/home-hero";
import QuickActions from "@/components/home/quick-actions";
import RecentUpdates from "@/components/home/recent-updates";
import CommunityPreview from "@/components/home/community-preview";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = getNow();
  const [summary, rooms] = await Promise.all([
    getHomeSummary({ now }),
    listCommunityRoomsPreview()
  ]);

  return (
    <div className="section-gap">
      <div className="space-y-2">
        <h1 className="text-h1">Home</h1>
        <p className="text-sm text-ink-500">A steady view of what matters this week.</p>
      </div>

      <HomeHero
        weekCompletion={summary.weekCompletion}
        nextEvents={summary.nextEvents}
        announcements={summary.announcements}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RecentUpdates updates={summary.recentUpdates} />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <CommunityPreview rooms={rooms} />
        </div>
      </div>
    </div>
  );
}
