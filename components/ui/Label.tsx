import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Label component for form fields.
 */
export default function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-ink-700", className)}
      {...props}
    />
  );
}
