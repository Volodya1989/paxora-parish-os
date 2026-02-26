"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { localeCookie, type Locale } from "@/lib/i18n/config";
import { buildLocaleSwitchPath } from "@/lib/i18n/routing";

const options: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "uk", label: "Українська" }
];

export default function MarketingLanguageSwitcher({
  locale,
  ariaLabel
}: {
  locale: Locale;
  ariaLabel: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleChange = (nextLocale: Locale) => {
    document.cookie = `${localeCookie}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    const targetPath = buildLocaleSwitchPath(pathname, searchParams?.toString() ?? "", nextLocale);
    router.push(targetPath);
  };

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{ariaLabel}</span>
      <select
        aria-label={ariaLabel}
        className="focus-ring rounded-button border border-mist-300 bg-white px-3 py-2 text-sm font-medium text-ink-700"
        value={locale}
        onChange={(event) => handleChange(event.target.value as Locale)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
