import en from "@/messages/en.json";
import uk from "@/messages/uk.json";
import es from "@/messages/es.json";
import type { Locale } from "@/lib/i18n/config";

export type Messages = typeof en;

export const messagesByLocale: Record<Locale, Messages> = {
  en,
  uk,
  es
};

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale] ?? en;
}
