export const locales = ["en", "uk", "es"] as const;
export const localeStorageKey = "paxora_locale";

export const localeCatalog = locales;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookie = "NEXT_LOCALE";
