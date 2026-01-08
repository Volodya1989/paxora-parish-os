import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Input component for single-line text entry.
 */
export default function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card transition placeholder:text-ink-400 focus-ring",
        "aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus-visible:ring-rose-500",
        className
      )}
      {...props}
    />
  );
}
