"use client";

import Button from "@/components/ui/Button";
import type { ChatPinnedMessage } from "@/components/chat/types";

export default function PinnedBanner({
  pinned,
  canModerate,
  onUnpin
}: {
  pinned: ChatPinnedMessage;
  canModerate: boolean;
  onUnpin: () => void;
}) {
  const body = pinned.message.deletedAt ? "This message was deleted." : pinned.message.body;

  return (
    <div className="sticky top-0 z-10 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pinned</p>
          <p className="text-sm text-amber-900">{body}</p>
          <p className="text-xs text-amber-700">
            Pinned by {pinned.pinnedBy.name} · {new Date(pinned.pinnedAt).toLocaleDateString()}
          </p>
        </div>
        {canModerate ? (
          <Button type="button" variant="ghost" size="sm" onClick={onUnpin}>
            Unpin
          </Button>
        ) : null}
      </div>
    </div>
  );
}
