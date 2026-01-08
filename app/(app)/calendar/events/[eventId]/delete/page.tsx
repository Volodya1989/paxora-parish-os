import Link from "next/link";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function DeleteEventPage() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Delete event" subtitle="Remove a calendar item" />
      <Card>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink-900">Coming soon</h2>
          <p className="text-sm text-ink-500">
            Event deletion is almost ready. For now, adjust schedules from the calendar view.
          </p>
          <Link href="/calendar">
            <Button size="sm" variant="secondary">
              Back to calendar
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
