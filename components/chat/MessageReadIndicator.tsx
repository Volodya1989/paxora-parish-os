import type { MessageReadIndicatorState } from "@/lib/chat/read-indicator";
import { cn } from "@/lib/ui/cn";

function CheckIcon({ double = false }: { double?: boolean }) {
  if (!double) {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M3 8.5 6.2 11.5 13 4.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M1.5 8.5 4.3 11 7.6 7.8"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.6 8.5 8.6 11.5 14.2 5"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MessageReadIndicator({
  state,
  ariaLabel
}: {
  state: MessageReadIndicatorState;
  ariaLabel: string;
}) {
  const colorClass =
    state === "all_read"
      ? "text-emerald-600"
      : state === "some_read"
        ? "text-amber-500"
        : "text-ink-400";

  return (
    <span
      className={cn("inline-flex items-center drop-shadow-[0_0.2px_0.2px_rgba(0,0,0,0.15)]", colorClass)}
      aria-label={ariaLabel}
      title={ariaLabel}
      role="img"
    >
      <CheckIcon double={state !== "unread"} />
    </span>
  );
}

