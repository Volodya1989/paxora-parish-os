import { cookies } from "next/headers";
import { defaultLocale, localeCookie, type Locale } from "@/lib/i18n/config";
import { getLocaleFromCookie } from "@/lib/i18n/routing";
import { getMessages } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translator";

export function getLocaleFromCookies(): Locale {
  const cookieLocale = cookies().get(localeCookie)?.value ?? null;
  return getLocaleFromCookie(cookieLocale) ?? defaultLocale;
}

export function getTranslations(locale: Locale) {
  return createTranslator(locale, getMessages(locale));
}

export function getDefaultTranslations() {
  return createTranslator(defaultLocale, getMessages(defaultLocale));
}
