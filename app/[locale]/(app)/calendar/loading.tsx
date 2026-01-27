import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
    </div>
  );
}
