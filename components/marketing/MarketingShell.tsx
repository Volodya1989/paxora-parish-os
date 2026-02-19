import Link from "next/link";
import type { ReactNode } from "react";
import { buildLocalePathname } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

const navItems = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Demo", href: "/demo" },
  { label: "Contact", href: "/contact" }
];

const footerItems = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" }
];

export default function MarketingShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Paxora Parish OS",
            alternateName: "Paxora Parish Center",
            url: siteUrl,
            logo: `${siteUrl}/favicon.ico`
          })
        }}
      />

      <header className="border-b border-mist-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link href={buildLocalePathname(locale, "/")} className="text-sm font-semibold tracking-tight text-ink-900">
            Paxora Parish OS
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={buildLocalePathname(locale, item.href)} className="text-sm text-ink-700 hover:text-ink-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={buildLocalePathname(locale, "/sign-up")}
            className="rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            Request Pilot Access
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">{children}</main>

      <footer className="border-t border-mist-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-sm text-ink-600">© {new Date().getFullYear()} Paxora Parish OS</p>
          <nav className="flex flex-wrap gap-4">
            {footerItems.map((item) => (
              <Link key={item.href} href={buildLocalePathname(locale, item.href)} className="text-sm text-ink-700 hover:text-ink-900">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
