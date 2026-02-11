"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ParishRole } from "@prisma/client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useTranslations } from "@/lib/i18n/provider";
import { buildLocalePathname } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";
import {
  buildStartThisWeekStorageKey,
  getStartThisWeekItems
} from "@/lib/onboarding/startThisWeek";

type StartThisWeekCardProps = {
  userId: string;
  parishId: string;
  role: ParishRole;
  locale: Locale;
};

export default function StartThisWeekCard({ userId, parishId, role, locale }: StartThisWeekCardProps) {
  const t = useTranslations();
  const [hidden, setHidden] = useState<boolean | null>(null);

  const storageKey = useMemo(
    () =>
      buildStartThisWeekStorageKey({
        userId,
        parishId,
        role
      }),
    [userId, parishId, role]
  );

  useEffect(() => {
    const isDismissed =
      typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "done";
    setHidden(isDismissed);
  }, [storageKey]);

  const dismissCard = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "done");
    }
    setHidden(true);
  };

  if (hidden !== false) {
    return null;
  }

  const actions = getStartThisWeekItems(role);

  return (
    <Card className="space-y-4 border-primary-200 bg-primary-50/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Start this week</h2>
          <p className="mt-1 text-xs text-ink-600">
            {role === "MEMBER"
              ? t("thisWeek.startGuide.memberDescription")
              : t("thisWeek.startGuide.leaderDescription")}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={dismissCard} className="h-8 px-2 text-xs">
          Dismiss
        </Button>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {actions.map((item) => (
          <li key={item.id}>
            <Link
              href={buildLocalePathname(locale, item.href)}
              className="block rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-primary-300 hover:text-primary-700"
            >{t(item.labelKey)}</Link>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={dismissCard}>
          Mark as done
        </Button>
      </div>
    </Card>
  );
}
