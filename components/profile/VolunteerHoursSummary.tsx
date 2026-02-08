import Link from "next/link";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";

type VolunteerHoursSummaryProps = {
  ytdHours: number;
};

export default function VolunteerHoursSummary({ ytdHours }: VolunteerHoursSummaryProps) {
  return (
    <Card className="space-y-3">
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle className="text-base">My volunteer hours</CardTitle>
        <Link
          href="/profile"
          className="text-xs font-medium text-ink-500 transition hover:text-ink-700"
        >
          View full summary
        </Link>
      </CardHeader>
      <div className="rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-ink-400">Year-to-date</p>
        <p className="text-2xl font-semibold text-ink-900">{ytdHours.toFixed(1)} hrs</p>
      </div>
    </Card>
  );
}
