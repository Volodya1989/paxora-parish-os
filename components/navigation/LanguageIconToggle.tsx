"use client";

import { useRouter, usePathname } from "next/navigation";
import { GlobeIcon } from "@/components/icons/ParishIcons";
import { useLocale } from "@/lib/i18n/provider";
import { localeCookie } from "@/lib/i18n/config";
import { cn } from "@/lib/ui/cn";

const localeData = [
  { code: "en", label: "EN", name: "English" },
  { code: "uk", label: "УК", name: "Українська" }
] as const;

/**
 * Compact icon-based language toggle for the parishioner header.
 * Shows a globe icon with current locale code, toggles on click.
 */
export default function LanguageIconToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const currentIndex = localeData.findIndex((l) => l.code === currentLocale);
  const current = localeData[currentIndex] ?? localeData[0];
  const next = localeData[(currentIndex + 1) % localeData.length];

  const handleToggle = () => {
    // Set cookie for persistence
    document.cookie = `${localeCookie}=${next.code}; path=/; max-age=31536000`;

    // Replace locale in pathname
    const segments = pathname.split("/");
    if (segments[1] === "en" || segments[1] === "uk") {
      segments[1] = next.code;
    }
    router.push(segments.join("/"));
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "group flex items-center gap-1.5 rounded-full px-3 py-2",
        "bg-white border border-mist-200",
        "text-ink-700 hover:text-ink-900 hover:bg-mist-50 hover:border-mist-300",
        "transition-all duration-200 shadow-sm hover:shadow",
        "active:scale-95"
      )}
      aria-label={`Language: ${current.name}. Click to switch to ${next.name}.`}
      title={`Switch to ${next.name}`}
    >
      <GlobeIcon className="h-4 w-4 text-primary-600" />
      <span className="text-xs font-semibold tracking-wide">{current.label}</span>
    </button>
  );
}
