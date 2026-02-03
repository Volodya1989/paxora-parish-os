import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { TaskPreview } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import { formatShortDate } from "@/lib/this-week/formatters";
import { cn } from "@/lib/ui/cn";
import { ListChecksIcon } from "@/components/icons/ParishIcons";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n/server";

const statusTone = (status: TaskPreview["status"]) => {
  switch (status) {
    case "DONE":
      return "success";
    case "IN_PROGRESS":
      return "warning";
    default:
      return "neutral";
  }
};

function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M20 11a8 8 0 1 1-3-6.2" />
      <path d="M20 4v6h-6" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

type ServePreviewCardProps = {
  items: TaskPreview[];
};

export default async function ServePreviewCard({ items }: ServePreviewCardProps) {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale);
  const activeCount = items.filter((item) => item.status !== "DONE").length;

  if (items.length === 0) {
    return (
      <Card className="border-mist-200 bg-white">
        <CardHeader className="space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Serve</CardTitle>
              <span className="text-xs text-ink-400">0 active</span>
            </div>
            <Link
              href={routes.serve}
              className="text-xs font-semibold text-primary-700 underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-card border border-mist-200 bg-mist-50/60 px-3 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100">
                <ListChecksIcon className="h-4 w-4 text-ink-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink-900">
                  No serve items for this week
                </h3>
                <p className="text-xs text-ink-500">
                  Capture what needs to happen and keep your parish teams aligned.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`${routes.serve}?create=task`}>
                <Button>Add a serve item</Button>
              </Link>
              <Button variant="secondary" className="gap-2" type="button">
                <RefreshIcon className="h-4 w-4" />
                Reuse last week
              </Button>
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
            <CardTitle className="text-lg">Serve</CardTitle>
            <span className="text-xs text-ink-400">{activeCount} active</span>
          </div>
          <Link href={routes.serve} className="text-xs font-semibold text-primary-700 underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 3).map((item) => (
          <ServeRow key={item.id} item={item} t={t} />
        ))}
        {items.length > 3 ? (
          <p className="pt-1 text-center text-xs text-ink-500">+{items.length - 3} more items</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ServeRow({ item, t }: { item: TaskPreview; t: (key: string) => string }) {
  const dueLabel = item.dueBy ? formatShortDate(item.dueBy) : "Due date TBD";

  return (
    <Link
      href={`${routes.serve}?taskId=${item.id}`}
      className="group block rounded-card border border-mist-100 bg-mist-50/60 p-2.5 transition hover:border-primary-200 hover:bg-primary-50/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-ink-900">{item.title}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Badge tone={statusTone(item.status)}>
              {item.status === "DONE"
                ? "Completed"
                : item.status === "IN_PROGRESS"
                  ? t("common.inProgress")
                  : t("common.todo")}
            </Badge>
            <span className="flex items-center gap-1 text-[10px] text-ink-500">
              <ClockIcon className="h-3 w-3" />
              {dueLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-[11px] font-semibold text-ink-700">
            {item.owner.initials}
          </span>
          <button
            type="button"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-button text-ink-400 transition hover:bg-mist-100",
              "sm:opacity-0 sm:group-hover:opacity-100"
            )}
            aria-label="Serve item actions"
          >
            <MoreIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
