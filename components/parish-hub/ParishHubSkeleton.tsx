"use client";

import Skeleton from "@/components/ui/Skeleton";

export default function ParishHubSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-3xl bg-gradient-to-br from-emerald-600/80 via-emerald-500/80 to-teal-500/80 px-6 pb-8 pt-6 md:-mx-8 md:px-8">
        <div className="relative">
          <Skeleton className="h-4 w-20 bg-white/20" />
          <Skeleton className="mt-2 h-8 w-48 bg-white/20" />
          <Skeleton className="mt-3 h-4 w-64 bg-white/20" />
        </div>
      </div>

      {/* Quick access skeleton */}
      <div>
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div>
        <Skeleton className="mb-4 h-4 w-20" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-mist-200 bg-white px-4 py-6"
            >
              <Skeleton className="h-14 w-14 rounded-xl" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
