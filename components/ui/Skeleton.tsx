"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

type SkeletonVariant = "default" | "text" | "circle" | "card";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
};

const variantClasses: Record<SkeletonVariant, string> = {
  default: "rounded-card",
  text: "rounded h-4",
  circle: "rounded-full",
  card: "rounded-card h-24"
};

/**
 * Skeleton block for loading placeholders.
 * Uses a warm, subtle pulse animation for a calmer loading experience.
 */
export default function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-mist-100 via-mist-50 to-mist-100 bg-[length:200%_100%]",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

/**
 * Text skeleton for paragraph placeholders.
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}
