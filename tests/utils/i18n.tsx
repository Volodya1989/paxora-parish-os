import { createElement, type ReactElement } from "react";
import { I18nProvider } from "@/lib/i18n/provider";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

export function withI18n(element: ReactElement, locale: Locale = "en") {
  return createElement(I18nProvider, { locale, messages: getMessages(locale), children: element });
}
