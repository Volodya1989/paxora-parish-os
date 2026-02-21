"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HandHeartIcon } from "@/components/icons/ParishIcons";
import { isGivingShortcutAllowed } from "@/lib/giving/iosSafeGiving";
import { useTranslations } from "@/lib/i18n/provider";
import { cn } from "@/lib/ui/cn";

type GivingShortcut = {
  href: string;
  targetType: "EXTERNAL" | "INTERNAL";
};

type GivingShortcutButtonProps = {
  className?: string;
};

export default function GivingShortcutButton({ className }: GivingShortcutButtonProps) {
  const t = useTranslations();
  const [shortcut, setShortcut] = useState<GivingShortcut | null>(null);
  const givingAllowed = isGivingShortcutAllowed();

  useEffect(() => {
    if (!givingAllowed) {
      setShortcut(null);
      return;
    }

    let mounted = true;

    void fetch("/api/parish/giving-shortcut", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { shortcut?: GivingShortcut | null } | null) => {
        if (!mounted) return;
        setShortcut(data?.shortcut ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setShortcut(null);
      });

    return () => {
      mounted = false;
    };
  }, [givingAllowed]);

  if (!givingAllowed || !shortcut) {
    return null;
  }

  const sharedClasses = cn(
    "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-mist-200 bg-white text-ink-700 transition hover:bg-mist-50 focus-ring",
    className
  );
  const label = t("header.give");

  if (shortcut.targetType === "EXTERNAL") {
    return (
      <a
        href={shortcut.href}
        target="_blank"
        rel="noopener noreferrer"
        className={sharedClasses}
        aria-label={label}
        title={label}
      >
        <HandHeartIcon className="h-4 w-4" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link href={shortcut.href} className={sharedClasses} aria-label={label} title={label}>
      <HandHeartIcon className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
