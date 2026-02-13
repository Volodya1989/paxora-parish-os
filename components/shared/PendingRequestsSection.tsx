"use client";

import Button from "@/components/ui/Button";

type PendingRequestItem = {
  id: string;
  title: string;
  description?: string;
  meta?: string;
};

type PendingRequestsSectionProps = {
  entityType: "GROUP" | "EVENT" | "SERVE_TASK";
  items: PendingRequestItem[];
  canManage: boolean;
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  busyId?: string | null;
};

const labels = {
  GROUP: "Pending group requests",
  EVENT: "Pending event requests",
  SERVE_TASK: "Pending serve-task requests"
};

export default function PendingRequestsSection({ entityType, items, canManage, onApprove, onDecline, busyId }: PendingRequestsSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2" id="pending-requests">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{labels[entityType]}</p>
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 border-amber-200 border-l-amber-400 bg-amber-50/60 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-semibold text-ink-800">{item.title}</p>
            {item.description ? <p className="text-xs text-ink-500">{item.description}</p> : null}
            {item.meta ? <p className="text-xs text-ink-400">{item.meta}</p> : null}
          </div>
          {canManage && onApprove && onDecline ? (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => onApprove(item.id)} disabled={busyId === item.id}>Approve</Button>
              <Button size="sm" variant="secondary" onClick={() => onDecline(item.id)} disabled={busyId === item.id}>Decline</Button>
            </div>
          ) : (
            <p className="text-xs font-semibold uppercase text-amber-600">Pending</p>
          )}
        </div>
      ))}
    </div>
  );
}
