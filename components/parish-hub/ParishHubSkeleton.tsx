"use client";

import Skeleton from "@/components/ui/Skeleton";

export default function ParishHubSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-center gap-3 rounded-card border border-mist-200 bg-white px-4 py-6"
        >
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
