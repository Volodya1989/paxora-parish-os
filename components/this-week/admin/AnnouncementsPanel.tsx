import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { AnnouncementPreview } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import { formatShortDate } from "@/lib/this-week/formatters";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n/server";

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12h4l8-4v8l-8-4H4z" />
      <path d="M12 16.5l1.5 3" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type AnnouncementsPanelProps = {
  announcements: AnnouncementPreview[];
};

export default function AnnouncementsPanel({ announcements }: AnnouncementsPanelProps) {
  const t = getTranslations(getLocaleFromCookies());
  if (announcements.length === 0) {
    return (
      <Card className="border-mist-200 bg-white">
        <CardHeader className="space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Announcements</CardTitle>
              <span className="text-xs text-ink-400">0 announcements</span>
            </div>
            <Link href={routes.announcements} className="text-xs font-semibold text-primary-700 underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-mist-200 bg-mist-50/60 px-4 py-8 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mist-100">
              <SendIcon className="h-5 w-5 text-ink-400" />
            </div>
            <h3 className="text-sm font-semibold text-ink-900">Share a parish update</h3>
            <p className="mt-1.5 max-w-sm text-xs text-ink-500">
              Draft announcements to keep parishioners informed and in the loop.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link href={`${routes.announcements}/new`}>
                <Button>Create announcement</Button>
              </Link>
              <Link href={routes.announcements}>
                <Button variant="secondary" className="gap-2">
                  <FileIcon className="h-4 w-4" />
                  View drafts
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-mist-200 bg-white">
      <CardHeader className="space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Announcements</CardTitle>
            <span className="text-xs text-ink-400">
              {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Link href={routes.announcements} className="text-xs font-semibold text-primary-700 underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.slice(0, 3).map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} t={t} />
          ))}
          <Link
            href={`${routes.announcements}/new`}
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-mist-200 bg-mist-50/60 p-4 text-center transition hover:border-primary-200 hover:bg-primary-50/40"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mist-100">
              <SendIcon className="h-4 w-4 text-ink-500" />
            </div>
            <span className="text-xs font-medium text-ink-500">Create announcement</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function AnnouncementCard({
  announcement,
  t
}: {
  announcement: AnnouncementPreview;
  t: (key: string) => string;
}) {
  const isPublished = Boolean(announcement.publishedAt);
  const badgeTone = isPublished ? "success" : "warning";
  const updatedLabel = formatShortDate(announcement.updatedAt);

  return (
    <div className="flex flex-col rounded-card border border-mist-100 bg-mist-50/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold text-ink-900 line-clamp-2 sm:text-sm">
          {announcement.title}
        </h4>
        <Badge tone={badgeTone} className="gap-1 text-[10px]">
          <EyeIcon className="h-3 w-3" />
          <span className="hidden sm:inline">
            {isPublished ? t("common.published") : t("common.draft")}
          </span>
        </Badge>
      </div>
      <p className="mt-auto pt-3 text-[10px] text-ink-500 sm:text-xs">
        Updated {updatedLabel}
      </p>
    </div>
  );
}
