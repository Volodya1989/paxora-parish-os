"use client";

import { useEffect } from "react";
import { localeCookie, localeStorageKey } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/provider";

export default function LocalePersistence() {
  const locale = useLocale();

  useEffect(() => {
    document.cookie = `${localeCookie}=${locale}; path=/; max-age=31536000; samesite=lax`;
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  return null;
}
