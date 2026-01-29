"use client";

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
  const truncatedBody = body.length > 100 ? `${body.slice(0, 100)}...` : body;

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2">
      <svg className="h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      <p className="min-w-0 flex-1 truncate text-sm text-amber-900">{truncatedBody}</p>
      {canModerate ? (
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900"
          onClick={onUnpin}
        >
          Unpin
        </button>
      ) : null}
    </div>
  );
}
