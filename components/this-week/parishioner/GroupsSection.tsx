"use client";

import Link from "next/link";
import { UsersIcon } from "@/components/icons/ParishIcons";
import Button from "@/components/ui/Button";
import { routes } from "@/lib/navigation/routes";
import { useTranslations } from "@/lib/i18n/provider";
import { cn } from "@/lib/ui/cn";

type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
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

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
          {t("landing.yourGroups")}
        </h2>
        {groups.length > 0 && hasPublicGroups && (
          <Link
            href={routes.groups}
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
              onClick={() => (window.location.href = routes.groups)}
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
              href={`/groups/${group.id}`}
              className="group flex items-center gap-3 rounded-xl border border-mist-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-mist-200 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition-colors group-hover:bg-sky-200">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">{group.name}</p>
                {group.description && (
                  <p className="truncate text-sm text-ink-500">{group.description}</p>
                )}
              </div>
              <span className="text-ink-400 transition-transform group-hover:translate-x-0.5">
                ›
              </span>
            </Link>
          ))}
          {groups.length > 4 && (
            <Link
              href={routes.groups}
              className="block py-2 text-center text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              +{groups.length - 4} more groups
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
