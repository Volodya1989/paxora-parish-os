import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Textarea component for multi-line text entry.
 */
export default function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-card border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card transition placeholder:text-ink-400 focus-ring",
        "min-h-[120px] aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus-visible:ring-rose-500",
        className
      )}
      {...props}
    />
  );
}
