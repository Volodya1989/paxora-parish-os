import { SectionSkeleton, ThisWeekHeaderSkeleton } from "@/components/this-week/ThisWeekSkeleton";

export default function ThisWeekLoading() {
  return (
    <div className="section-gap">
      <ThisWeekHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionSkeleton rows={4} />
        <SectionSkeleton rows={4} />
        <SectionSkeleton rows={3} />
      </div>
    </div>
  );
}
