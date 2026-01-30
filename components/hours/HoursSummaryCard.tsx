import Card from "@/components/ui/Card";

type HoursSummaryCardProps = {
  weekTotal: number;
  monthTotal: number;
};

export default function HoursSummaryCard({ weekTotal, monthTotal }: HoursSummaryCardProps) {
  return (
    <Card className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink-900">Hours offered</p>
        <p className="text-xs text-ink-500">Grateful for every hour shared.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-mist-200 bg-mist-50 px-3 py-2">
          <p className="text-xs uppercase text-ink-400">This week</p>
          <p className="text-lg font-semibold text-ink-900">{weekTotal.toFixed(1)} hrs</p>
        </div>
        <div className="rounded-card border border-mist-200 bg-mist-50 px-3 py-2">
          <p className="text-xs uppercase text-ink-400">This month</p>
          <p className="text-lg font-semibold text-ink-900">{monthTotal.toFixed(1)} hrs</p>
        </div>
      </div>
    </Card>
  );
}
