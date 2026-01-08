import Link from "next/link";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function AnnouncementCreatePage() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Create announcement" subtitle="Share parish updates" />
      <Card>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink-900">Coming soon</h2>
          <p className="text-sm text-ink-500">
            Announcement creation is on the way. For now, keep updates in your weekly digest.
          </p>
          <Link href="/digest">
            <Button size="sm" variant="secondary">
              Go to digest
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
