import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Announcements" subtitle="Parish-wide updates" />

      <Card>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-ink-900">Coming soon</h2>
          <p className="text-sm text-ink-500">
            Announcements will appear here once parish leaders start sharing updates.
          </p>
        </div>
      </Card>
    </div>
  );
}
