"use client";

import { useRouter, usePathname } from "next/navigation";
import { GlobeIcon } from "@/components/icons/ParishIcons";
import { useCurrentLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/ui/cn";

const locales = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "uk", label: "UK", flag: "🇺🇦" }
] as const;

/**
 * Compact icon-based language toggle for the parishioner header.
 * Shows a globe icon with current locale indicator that cycles through languages on click.
 */
export default function LanguageIconToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useCurrentLocale();

  const currentIndex = locales.findIndex((l) => l.code === currentLocale);
  const current = locales[currentIndex] ?? locales[0];

  const handleToggle = () => {
    // Cycle to next locale
    const nextIndex = (currentIndex + 1) % locales.length;
    const nextLocale = locales[nextIndex].code;

    // Replace locale in pathname
    const segments = pathname.split("/");
    if (segments[1] === "en" || segments[1] === "uk") {
      segments[1] = nextLocale;
    }
    router.push(segments.join("/"));
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "group flex items-center gap-1.5 rounded-full px-2.5 py-1.5",
        "bg-white/80 backdrop-blur-sm border border-mist-200/60",
        "text-ink-600 hover:text-ink-900 hover:bg-white hover:border-mist-300",
        "transition-all duration-200 shadow-sm hover:shadow"
      )}
      aria-label={`Current language: ${current.label}. Click to switch.`}
    >
      <GlobeIcon className="h-4 w-4" />
      <span className="text-xs font-medium">{current.flag}</span>
    </button>
  );
}
