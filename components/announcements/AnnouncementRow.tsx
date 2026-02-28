"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/ui/cn";
import type { AnnouncementListItem } from "@/lib/queries/announcements";
import { useTranslations } from "@/lib/i18n/provider";
import ReportContentDialog from "@/components/moderation/ReportContentDialog";
import { REACTION_EMOJIS } from "@/lib/chat/reactions";

type AnnouncementRowProps = {
  announcement: AnnouncementListItem;
  onTogglePublish: (id: string, nextPublished: boolean, previousPublishedAt: Date | null) => void;
  onArchive: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  isBusy?: boolean;
  isReadOnly?: boolean;
  showReportAction?: boolean;
};

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 12;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function buildExcerpt(text: string | null) {
  if (!text) return "No message yet.";
  if (text.length <= 120) return text;
  return `${text.slice(0, 120).trim()}…`;
}

export default function AnnouncementRow({
  announcement,
  onTogglePublish,
  onArchive,
  onEdit,
  onDelete,
  onToggleReaction,
  isBusy = false,
  isReadOnly = false,
  showReportAction = false
}: AnnouncementRowProps) {
  const t = useTranslations();
  const isPublished = Boolean(announcement.publishedAt);
  const nextPublished = !isPublished;
  const timestamp = isPublished
    ? `Published ${formatDate(announcement.publishedAt as Date)}`
    : `Updated ${formatDate(announcement.updatedAt ?? announcement.createdAt)}`;

  const [expanded, setExpanded] = useState(false);
  const hasRichContent = Boolean(announcement.bodyHtml);
  const fullBodyText = announcement.bodyText ?? announcement.body ?? "";
  const canToggleExpanded = hasRichContent && fullBodyText.length > 120;
  const excerptText = buildExcerpt(announcement.bodyText ?? announcement.body);
  const reactions = announcement.reactions ?? [];
  const hasReactions = reactions.length > 0;
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const cardRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const closeReactionPicker = useCallback(() => {
    setReactionPickerOpen(false);
  }, []);

  useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

  const openReactionPicker = useCallback(() => {
    if (!onToggleReaction || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const pickerWidth = 250;
    const horizontalMargin = 12;
    const top = Math.max(8, rect.top - 52);
    const left = Math.min(
      window.innerWidth - pickerWidth - horizontalMargin,
      Math.max(horizontalMargin, rect.left)
    );

    setPickerPosition({ top, left });
    setReactionPickerOpen(true);
  }, [onToggleReaction]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!onToggleReaction || event.button !== 0) return;

      startPointRef.current = { x: event.clientX, y: event.clientY };
      clearLongPressTimer();
      timerRef.current = setTimeout(() => {
        openReactionPicker();
      }, LONG_PRESS_MS);
    },
    [clearLongPressTimer, onToggleReaction, openReactionPicker]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!startPointRef.current) return;
      const deltaX = Math.abs(event.clientX - startPointRef.current.x);
      const deltaY = Math.abs(event.clientY - startPointRef.current.y);
      if (deltaX > LONG_PRESS_MOVE_THRESHOLD || deltaY > LONG_PRESS_MOVE_THRESHOLD) {
        clearLongPressTimer();
      }
    },
    [clearLongPressTimer]
  );

  const handlePointerEnd = useCallback(() => {
    clearLongPressTimer();
    startPointRef.current = null;
  }, [clearLongPressTimer]);

  return (
    <>
      <div ref={cardRef}>
        <Card
          className={cn(
            "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
            isBusy && "opacity-70"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onContextMenu={(event) => {
            if (onToggleReaction) {
              event.preventDefault();
            }
          }}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-ink-900">
                {announcement.title}
              </h3>

              {isReadOnly && showReportAction ? (
                <div className="-mr-1 shrink-0">
                  <Dropdown>
                    <DropdownTrigger
                      iconOnly
                      aria-label="More actions"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-base text-muted-foreground leading-tight transition hover:bg-muted/40 active:bg-muted/60 focus-ring"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      ⋯
                    </DropdownTrigger>
                    <DropdownMenu ariaLabel="Announcement actions">
                      <DropdownItem onClick={() => setReportDialogOpen(true)}>
                        {t("common.reportContent")}
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isReadOnly ? null : (
                <Badge tone={isPublished ? "success" : "warning"}>
                  {isPublished ? t("common.published") : t("common.draft")}
                </Badge>
              )}
              <Badge tone="neutral">
                {announcement.scopeType === "CHAT" ? announcement.chatChannelName ?? "Chat" : "Parish"}
              </Badge>
            </div>

        {hasRichContent && expanded ? (
          <div
            className="prose prose-sm max-w-none text-ink-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_a]:text-primary-600 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: announcement.bodyHtml! }}
          />
        ) : (
          <p className="text-sm text-ink-500">{excerptText}</p>
        )}

        <p className="text-xs text-ink-400">
          {announcement.createdBy?.name ?? "Parish staff"} · {timestamp}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {hasReactions
            ? reactions.map((reaction) => (
                <button
                  key={`${announcement.id}-${reaction.emoji}`}
                  type="button"
                  onClick={() => onToggleReaction?.(announcement.id, reaction.emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
                    reaction.reactedByMe
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-mist-200 text-ink-600 hover:bg-mist-50"
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))
            : null}
        </div>

        {canToggleExpanded ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full rounded-button border border-mist-200 px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-mist-50 hover:text-primary-700"
            aria-label={expanded ? "Show less announcement content" : "Read more announcement content"}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        ) : null}
      </div>

          {isReadOnly ? null : (
            <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onTogglePublish(announcement.id, nextPublished, announcement.publishedAt)}
            aria-label={isPublished ? "Unpublish announcement" : "Publish announcement"}
            disabled={isBusy}
          >
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
          {onEdit ? (
            <Button size="sm" variant="ghost" onClick={() => onEdit(announcement.id)}>
              {t("buttons.edit")}
            </Button>
          ) : null}
          <Dropdown>
            <DropdownTrigger
              iconOnly
              aria-label="Announcement actions"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-button border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring",
                isBusy && "cursor-not-allowed opacity-50"
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              disabled={isBusy}
            >
              ⋯
            </DropdownTrigger>
            <DropdownMenu ariaLabel="Announcement actions">
              <DropdownItem
                onClick={() => onArchive(announcement.id)}
                disabled={isBusy}
                className={cn(isBusy && "pointer-events-none opacity-50 text-ink-300")}
              >
                Archive
              </DropdownItem>
              {onDelete ? (
                <DropdownItem
                  onClick={() => onDelete(announcement.id)}
                  disabled={isBusy}
                  className={cn(
                    "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50",
                    isBusy && "pointer-events-none opacity-50 text-ink-300"
                  )}
                >
                  {t("buttons.delete")}
                </DropdownItem>
              ) : null}
            </DropdownMenu>
          </Dropdown>
            </div>
          )}
        </Card>
      </div>

      {showReportAction ? (
        <ReportContentDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          contentType="ANNOUNCEMENT"
          contentId={announcement.id}
        />
      ) : null}

      {reactionPickerOpen && pickerPosition
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[9998] bg-black/10" onClick={closeReactionPicker} />
              <div
                className="fixed z-[9999] flex items-center gap-1 rounded-full border border-mist-200 bg-white px-2 py-1 shadow-xl"
                style={{ top: pickerPosition.top, left: pickerPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={`${announcement.id}-add-${emoji}`}
                    type="button"
                    onClick={() => {
                      onToggleReaction?.(announcement.id, emoji);
                      closeReactionPicker();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-mist-50 active:scale-110"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
