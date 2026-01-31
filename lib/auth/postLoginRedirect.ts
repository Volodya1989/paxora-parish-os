import type { ParishRole } from "@prisma/client";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { defaultLocale, type Locale } from "@/lib/i18n/config";

export function getPostLoginRedirect(parishRole: ParishRole | null, locale: Locale = defaultLocale) {
  const path = "/this-week";
  return buildLocalePathname(locale, path);
}
