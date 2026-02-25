"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildLocaleSwitchPath } from "@/lib/i18n/routing";
import { localeCookie, locales, type Locale } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/provider";

export const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "uk", label: "УК" },
  { value: "es", label: "ES" }
];

type LanguageSwitcherSelectProps = {
  locale: Locale;
  label: string;
  onChange: (nextLocale: Locale) => void;
};

export function LanguageSwitcherSelect({ locale, label, onChange }: LanguageSwitcherSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className="rounded-button border border-mist-200 bg-white px-2 py-1 text-xs font-semibold text-ink-700 shadow-card focus-ring"
        value={locale}
        onChange={(event) => onChange(event.target.value as Locale)}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleChange = (nextLocale: Locale) => {
    if (!locales.includes(nextLocale)) {
      return;
    }

    document.cookie = `${localeCookie}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;

    const targetPath = buildLocaleSwitchPath(
      pathname,
      searchParams?.toString() ?? "",
      nextLocale
    );
    router.push(targetPath);
  };

  return (
    <LanguageSwitcherSelect
      locale={locale}
      label={t("menu.language")}
      onChange={handleChange}
    />
  );
}
