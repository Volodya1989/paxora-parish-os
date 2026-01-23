import Skeleton from "@/components/ui/Skeleton";

type ListSkeletonProps = {
  rows?: number;
};

export default function ListSkeleton({ rows = 4 }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={`skeleton-${index}`} className="rounded-card border border-mist-100 bg-white p-4">
          <Skeleton className="mb-2 h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
