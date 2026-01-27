"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Messages } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translator";
import type { Locale } from "@/lib/i18n/config";

type I18nContextValue = {
  locale: Locale;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  locale: Locale;
  messages: Messages;
  children?: React.ReactNode;
};

export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  const value = useMemo(() => {
    return {
      locale,
      t: createTranslator(locale, messages)
    };
  }, [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslations must be used within I18nProvider.");
  }
  return context.t;
}

export function useLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useLocale must be used within I18nProvider.");
  }
  return context.locale;
}
