import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Native select dropdown with consistent styling.
 */
export default function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-button border border-mist-200 bg-white px-3 py-2 text-base text-ink-700 shadow-card transition focus-ring",
        "aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus-visible:ring-rose-500",
        className
      )}
      {...props}
    />
  );
}
