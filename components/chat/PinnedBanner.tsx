"use client";

import Button from "@/components/ui/Button";
import type { ChatPinnedMessage } from "@/components/chat/types";
import { useTranslations } from "@/lib/i18n/provider";

export default function PinnedBanner({
  pinned,
  canModerate,
  onUnpin
}: {
  pinned: ChatPinnedMessage;
  canModerate: boolean;
  onUnpin: () => void;
}) {
  const t = useTranslations();
  const body = pinned.message.deletedAt ? t("chat.deletedMessage") : pinned.message.body;

  return (
    <div className="sticky top-0 z-10 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t("chat.pinned.label")}</p>
          <p className="text-sm text-amber-900">{body}</p>
          <p className="text-xs text-amber-700">
            {t("chat.pinned.by").replace("{name}", pinned.pinnedBy.name).replace("{date}", new Date(pinned.pinnedAt).toLocaleDateString())}
          </p>
        </div>
        {canModerate ? (
          <Button type="button" variant="ghost" size="sm" onClick={onUnpin}>
            {t("chat.pinned.unpin")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
