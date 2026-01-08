import React from "react";
import Skeleton from "@/components/ui/Skeleton";

export function ThisWeekHeaderSkeleton() {
  return (
    <div className="rounded-card border border-mist-200 bg-white p-5 shadow-card md:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-16 w-44" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-card border border-mist-200 bg-white p-4 shadow-card md:p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
