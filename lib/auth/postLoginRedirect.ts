import type { ParishRole } from "@prisma/client";
import { isAdminClergy } from "@/lib/authz/membership";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { defaultLocale, type Locale } from "@/lib/i18n/config";

export function getPostLoginRedirect(parishRole: ParishRole | null, locale: Locale = defaultLocale) {
  const path = isAdminClergy(parishRole ?? undefined)
    ? "/this-week"
    : "/tasks?view=opportunities";
  return buildLocalePathname(locale, path);
}
