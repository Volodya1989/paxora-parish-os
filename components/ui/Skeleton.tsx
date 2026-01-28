"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Skeleton block for loading placeholders.
 */
export default function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-card bg-mist-100", className)}
      {...props}
    />
  );
}
