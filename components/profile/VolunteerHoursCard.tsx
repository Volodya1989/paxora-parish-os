import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import type { MilestoneTier } from "@/lib/hours/milestones";

type VolunteerHoursCardProps = {
  ytdHours: number;
  tier: MilestoneTier;
  bronzeHours: number;
  silverHours: number;
  goldHours: number;
};

const tierLabels: Record<MilestoneTier, string> = {
  NONE: "Growing",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold"
};

const tierStyles: Record<MilestoneTier, { badge: string; ring: string }> = {
  NONE: {
    badge: "bg-mist-100 text-ink-500",
    ring: "from-mist-50 via-white to-mist-100"
  },
  BRONZE: {
    badge: "bg-amber-100 text-amber-700",
    ring: "from-amber-50 via-white to-amber-100"
  },
  SILVER: {
    badge: "bg-slate-100 text-slate-700",
    ring: "from-slate-50 via-white to-slate-100"
  },
  GOLD: {
    badge: "bg-yellow-100 text-yellow-700",
    ring: "from-yellow-50 via-white to-yellow-100"
  }
};

export default function VolunteerHoursCard({
  ytdHours,
  tier,
  bronzeHours,
  silverHours,
  goldHours
}: VolunteerHoursCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours offered this year</CardTitle>
        <p className="text-sm text-ink-500">
          Thank you for the time you have offered in service.
        </p>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        <div className="rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-ink-400">Year-to-date</p>
          <p className="text-2xl font-semibold text-ink-900">{ytdHours.toFixed(1)} hrs</p>
        </div>
        <div
          className={`rounded-card border border-mist-200 bg-gradient-to-br px-4 py-3 ${tierStyles[tier].ring}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-400">Milestone</p>
              <div className="mt-1 inline-flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierStyles[tier].badge}`}
                >
                  {tierLabels[tier]}
                </span>
                <span className="text-xs text-ink-500">Reward tier</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-ink-500">
              <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                Bronze {bronzeHours}
              </span>
              <span className="rounded-full bg-slate-50 px-2 py-1 text-slate-700">
                Silver {silverHours}
              </span>
              <span className="rounded-full bg-yellow-50 px-2 py-1 text-yellow-700">
                Gold {goldHours}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
