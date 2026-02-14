"use client";

import Link from "next/link";
import { UsersIcon } from "@/components/icons/ParishIcons";
import Button from "@/components/ui/Button";
import { routes } from "@/lib/navigation/routes";
import { useTranslations, useLocale } from "@/lib/i18n/provider";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { cn } from "@/lib/ui/cn";
import GroupChatListCard from "@/components/groups/GroupChatListCard";

type GroupPreview = {
  id: string;
  name: string;
  avatarUrl?: string | null;
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
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
          {t("landing.yourGroups")}
        </h2>
        {groups.length > 0 && hasPublicGroups && (
          <Link
            href={buildLocalePathname(locale, routes.groups)}
            className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
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
            <GroupChatListCard
              key={group.id}
              name={group.name}
              avatarUrl={group.avatarUrl}
              description={group.description}
              lastMessage={group.lastMessage}
              lastMessageAuthor={group.lastMessageAuthor}
              lastMessageTime={group.lastMessageTime}
              unreadCount={group.unreadCount}
              href={buildLocalePathname(locale, `/groups/${group.id}/chat`)}
            />
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
