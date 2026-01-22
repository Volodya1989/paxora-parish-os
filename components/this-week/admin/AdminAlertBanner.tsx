import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/ui/cn";

type AlertTone = "accent" | "info";

type AlertItem = {
  id: string;
  title: string;
  description?: string;
  actionHref: string;
  actionLabel: string;
  tone?: AlertTone;
  icon?: ReactNode;
};

type AdminAlertBannerProps = {
  alerts: AlertItem[];
};

const toneStyles: Record<AlertTone, { wrapper: string; icon: string; action: string }> = {
  accent: {
    wrapper: "border-amber-200 bg-amber-50/70 text-amber-900",
    icon: "bg-amber-100 text-amber-600",
    action: "bg-amber-600 text-white hover:bg-amber-700"
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50/70 text-sky-900",
    icon: "bg-sky-100 text-sky-600",
    action: "bg-sky-600 text-white hover:bg-sky-700"
  }
};

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
      <path d="M3 21a7 7 0 0 1 14 0" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

export default function AdminAlertBanner({ alerts }: AdminAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const tone = alert.tone ?? "accent";
        const styles = toneStyles[tone];
        return (
          <div
            key={alert.id}
            className={cn(
              "flex flex-col gap-3 rounded-card border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
              styles.wrapper
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  styles.icon
                )}
              >
                {alert.icon ?? <AlertCircleIcon className="h-4 w-4" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{alert.title}</p>
                {alert.description ? (
                  <p className="text-xs text-ink-500/90">{alert.description}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Link
                href={alert.actionHref}
                className={cn(
                  "inline-flex items-center justify-center rounded-button px-3 py-1.5 text-xs font-semibold transition focus-ring",
                  styles.action
                )}
              >
                {alert.actionLabel}
              </Link>
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-button border border-transparent text-current transition hover:bg-white/40",
                  tone === "accent" && "hover:text-amber-800",
                  tone === "info" && "hover:text-sky-800"
                )}
                aria-label="Dismiss"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { AlertCircleIcon, UserPlusIcon };
