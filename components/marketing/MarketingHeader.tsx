import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { buildLocalePathname } from "@/lib/i18n/routing";
import MarketingLanguageSwitcher from "@/components/marketing/MarketingLanguageSwitcher";

type NavLink = { href: string; label: string };

export default function MarketingHeader({
  locale,
  brandTagline,
  navLinks,
  requestEarlyAccessLabel,
  scheduleDemoLabel,
  languageLabel
}: {
  locale: Locale;
  brandTagline: string;
  navLinks: NavLink[];
  requestEarlyAccessLabel: string;
  scheduleDemoLabel: string;
  languageLabel: string;
}) {
  return (
    <header className="border-b border-mist-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href={buildLocalePathname(locale, "/")} className="flex min-w-0 items-center gap-3">
            <img src="/icon.png" alt="Paxora logo" className="h-10 w-10 rounded-md object-contain" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink-900">Paxora Parish Center App</p>
              <p className="truncate text-xs text-ink-500">{brandTagline}</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <MarketingLanguageSwitcher locale={locale} ariaLabel={languageLabel} />
            <Link
              href={buildLocalePathname(locale, "/demo")}
              className="focus-ring rounded-button border border-mist-300 bg-white px-4 py-2 text-sm font-medium text-ink-900 transition hover:bg-mist-50"
            >
              {scheduleDemoLabel}
            </Link>
            <Link
              href={buildLocalePathname(locale, "/sign-up")}
              className="focus-ring rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
            >
              {requestEarlyAccessLabel}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:hidden">
          <MarketingLanguageSwitcher locale={locale} ariaLabel={languageLabel} />
          <Link
            href={buildLocalePathname(locale, "/sign-up")}
            className="focus-ring flex-1 rounded-button bg-primary-700 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-primary-600"
          >
            {requestEarlyAccessLabel}
          </Link>
          <Link
            href={buildLocalePathname(locale, "/demo")}
            className="focus-ring flex-1 rounded-button border border-mist-300 bg-white px-4 py-2 text-center text-sm font-medium text-ink-900 transition hover:bg-mist-50"
          >
            {scheduleDemoLabel}
          </Link>
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-600">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={buildLocalePathname(locale, link.href)}
              className="focus-ring rounded-sm underline-offset-4 hover:text-ink-900 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
