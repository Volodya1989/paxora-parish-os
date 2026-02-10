import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

export type LocalePrefix = Locale | "invalid" | null;

export function getLocalePrefix(pathname: string): LocalePrefix {
  const segments = pathname.split("/");
  const candidate = segments[1];
  if (!candidate) {
    return null;
  }
  if (locales.includes(candidate as Locale)) {
    return candidate as Locale;
  }
  if (/^[a-zA-Z]{2}$/.test(candidate)) {
    return "invalid";
  }
  return null;
}

export function stripLocale(pathname: string) {
  const locale = getLocalePrefix(pathname);
  if (!locale || locale === "invalid") {
    return pathname;
  }
  const segments = pathname.split("/").slice(2);
  const remainder = `/${segments.join("/")}`.replace(/\/$/, "");
  return remainder === "" ? "/" : remainder;
}

export function buildLocalePathname(locale: Locale, pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [pathOnly, query] = normalized.split("?");
  const stripped = stripLocale(pathOnly);
  const localized = stripped === "/" ? `/${locale}` : `/${locale}${stripped}`;
  return query ? `${localized}?${query}` : localized;
}

export function getLocaleFromCookie(cookieValue?: string | null): Locale | null {
  if (cookieValue && locales.includes(cookieValue as Locale)) {
    return cookieValue as Locale;
  }
  return null;
}

export function getLocaleFromParam(locale?: string): Locale {
  if (locale && locales.includes(locale as Locale)) {
    return locale as Locale;
  }
  return defaultLocale;
}

export function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const ranges = acceptLanguage.split(",").map((part) => part.split(";")[0]?.trim());
  for (const range of ranges) {
    if (!range) {
      continue;
    }
    const normalized = range.toLowerCase();
    if (locales.includes(normalized as Locale)) {
      return normalized as Locale;
    }
    const base = normalized.split("-")[0];
    if (base && locales.includes(base as Locale)) {
      return base as Locale;
    }
  }

  return defaultLocale;
}

export function buildLocaleSwitchPath(
  currentPath: string,
  search: string,
  nextLocale: Locale
) {
  const normalizedPath = stripLocale(currentPath);
  const query = search ? search.replace(/^\?/, "") : "";
  return buildLocalePathname(nextLocale, query ? `${normalizedPath}?${query}` : normalizedPath);
}
