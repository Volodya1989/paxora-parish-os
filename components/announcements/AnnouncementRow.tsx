"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/ui/cn";
import type { AnnouncementListItem } from "@/lib/queries/announcements";
import { useTranslations } from "@/lib/i18n/provider";

type AnnouncementRowProps = {
  announcement: AnnouncementListItem;
  onTogglePublish: (id: string, nextPublished: boolean, previousPublishedAt: Date | null) => void;
  onArchive: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isBusy?: boolean;
  isReadOnly?: boolean;
};

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
  isBusy = false,
  isReadOnly = false
}: AnnouncementRowProps) {
  const t = useTranslations();
  const isPublished = Boolean(announcement.publishedAt);
  const nextPublished = !isPublished;
  const timestamp = isPublished
    ? `Published ${formatDate(announcement.publishedAt as Date)}`
    : `Updated ${formatDate(announcement.updatedAt ?? announcement.createdAt)}`;

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        isBusy && "opacity-70"
      )}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-ink-900">{announcement.title}</h3>
          {isReadOnly ? null : (
            <Badge tone={isPublished ? "success" : "warning"}>
              {isPublished ? t("common.published") : t("common.draft")}
            </Badge>
          )}
        </div>
        <p className="text-sm text-ink-500">{buildExcerpt(announcement.body)}</p>
        <p className="text-xs text-ink-400">
          {announcement.createdBy?.name ?? "Parish staff"} · {timestamp}
        </p>
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
  );
}
