import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function TasksLoading() {
  return (
    <div className="section-gap">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`filter-${index}`} className="h-10 w-full" />
            ))}
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`task-${index}`} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
