import SectionTitle from "@/components/ui/SectionTitle";
import ParishHubSkeleton from "@/components/parish-hub/ParishHubSkeleton";

export default function ParishHubLoading() {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Parish Hub"
        subtitle="Quick links to parish resources and information"
      />
      <ParishHubSkeleton />
    </div>
  );
}
