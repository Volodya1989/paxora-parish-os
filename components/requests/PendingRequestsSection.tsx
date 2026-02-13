"use client";

import Button from "@/components/ui/Button";
import { useTranslations } from "@/lib/i18n/provider";

type PendingRequestItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  badgeLabel?: string;
  isBusy?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

type PendingRequestsSectionProps = {
  heading: string;
  items: PendingRequestItem[];
};

export default function PendingRequestsSection({ heading, items }: PendingRequestsSectionProps) {
  const t = useTranslations();
  if (items.length === 0) return null;

  return (
    <div id="pending-requests" className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{heading}</p>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 border-amber-200 border-l-amber-400 bg-amber-50/60 px-4 py-3"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink-800">{item.title}</p>
              {item.badgeLabel ? (
                <span className="rounded-full bg-mist-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                  {item.badgeLabel}
                </span>
              ) : null}
            </div>
            {item.subtitle ? <p className="text-xs text-ink-500">{item.subtitle}</p> : null}
            {item.description ? <p className="text-xs text-ink-400">{item.description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={item.onReject} disabled={item.isBusy}>
              {t("buttons.reject")}
            </Button>
            <Button type="button" size="sm" onClick={item.onApprove} disabled={item.isBusy}>
              {t("buttons.approve")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
