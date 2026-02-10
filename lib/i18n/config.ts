export const locales = ["en", "uk"] as const;
export const localeStorageKey = "paxora_locale";

// Placeholder list for future locale onboarding (e.g., adding Spanish to `locales`).
export const localeCatalog = ["en", "uk", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookie = "NEXT_LOCALE";
