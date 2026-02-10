"use client";

import Link from "next/link";
import { UsersIcon } from "@/components/icons/ParishIcons";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { routes } from "@/lib/navigation/routes";
import { useTranslations, useLocale } from "@/lib/i18n/provider";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { cn } from "@/lib/ui/cn";
import { formatMessageTime } from "@/lib/time/messageTime";

type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
  unreadCount?: number | null;
  lastMessage?: string | null;
  lastMessageTime?: Date | null;
  lastMessageAuthor?: string | null;
};

type GroupsSectionProps = {
  groups: GroupPreview[];
  hasPublicGroups: boolean;
  className?: string;
};

/**
 * Groups section for the parishioner landing page.
 * Shows joined groups with a warm, belonging-focused design.
 */
export default function GroupsSection({ groups, hasPublicGroups, className }: GroupsSectionProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
          {t("landing.yourGroups")}
        </h2>
        {groups.length > 0 && hasPublicGroups && (
          <Link
            href={buildLocalePathname(locale, routes.groups)}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            {t("landing.viewAll")}
          </Link>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 px-6 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <UsersIcon className="h-7 w-7" />
          </div>
          <div className="max-w-xs space-y-1">
            <p className="font-medium text-ink-800">{t("landing.noGroupsYet")}</p>
            <p className="text-sm text-ink-500">{t("landing.noGroupsDesc")}</p>
          </div>
          {hasPublicGroups && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (window.location.href = buildLocalePathname(locale, routes.groups))}
            >
              {t("landing.discoverGroups")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.slice(0, 4).map((group) => (
            <Link
              key={group.id}
              href={buildLocalePathname(locale, `/groups/${group.id}/chat`)}
              className="group flex items-center gap-3 rounded-xl border border-mist-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-mist-200 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition-colors group-hover:bg-sky-200">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">{group.name}</p>
                {group.lastMessage ? (
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-sm text-ink-500 flex-1">
                      {group.lastMessageAuthor ? `${group.lastMessageAuthor}: ` : ""}{group.lastMessage}
                    </p>
                    <span className="shrink-0 text-xs text-ink-400">
                      {formatMessageTime(group.lastMessageTime)}
                    </span>
                  </div>
                ) : group.description ? (
                  <p className="truncate text-sm text-ink-500">{group.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {group.unreadCount && group.unreadCount > 0 ? (
                  <Badge tone="warning">{group.unreadCount}</Badge>
                ) : null}
                <span className="text-ink-400 transition-transform group-hover:translate-x-0.5">›</span>
              </div>
            </Link>
          ))}
          {groups.length > 4 && (
            <Link
              href={buildLocalePathname(locale, routes.groups)}
              className="block py-2 text-center text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              +{t("landing.moreGroups").replace("{count}", String(groups.length - 4))}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
