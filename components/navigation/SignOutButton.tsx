"use client";

import React from "react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { useLocale, useTranslations } from "@/lib/i18n/provider";

type SignOutButtonProps = {
  className?: string;
  label?: string;
  onSignOut?: () => Promise<void> | void;
  icon?: string;
  compact?: boolean;
};

export async function defaultSignOut(locale?: string) {
  await signOut({ callbackUrl: locale ? buildLocalePathname(locale, "/sign-in") : "/sign-in" });
}

export function buildSignOutHandler(
  onSignOut?: () => Promise<void> | void,
  signOutFn: () => Promise<void> = defaultSignOut
) {
  return async () => {
    if (onSignOut) {
      await onSignOut();
      return;
    }

    await signOutFn();
  };
}

export function SignOutButton({
  className = "",
  label,
  onSignOut,
  icon = "SO",
  compact = false
}: SignOutButtonProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const resolvedLabel = label ?? t("nav.signOut");

  const handleSignOut = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const handler = buildSignOutHandler(onSignOut, () => defaultSignOut(locale));
      await handler();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="sign-out"
      className={`flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-mist-50 focus-ring ${
        compact ? "justify-center" : ""
      } ${className}`}
      onClick={handleSignOut}
      disabled={isLoading}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 bg-mist-100 text-xs font-semibold text-ink-700"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className={compact ? "sr-only" : ""}>
        {isLoading ? t("auth.signingOut") : resolvedLabel}
      </span>
    </button>
  );
}
