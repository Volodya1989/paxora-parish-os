import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { buildLocalePathname } from "@/lib/i18n/routing";

type FooterLink = { href: string; label: string };

export default function MarketingFooter({
  locale,
  footerCopy,
  footerLinks,
  supportLabel,
  supportEmail
}: {
  locale: Locale;
  footerCopy: string;
  footerLinks: FooterLink[];
  supportLabel: string;
  supportEmail: string;
}) {
  return (
    <footer className="border-t border-mist-200 bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-600 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>{footerCopy}</p>
          <p>
            {supportLabel}{" "}
            <a href={`mailto:${supportEmail}`} className="focus-ring underline underline-offset-4 hover:text-ink-900">
              {supportEmail}
            </a>
          </p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={buildLocalePathname(locale, link.href)}
              className="focus-ring underline underline-offset-4 hover:text-ink-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
