import type { Metadata } from "next";
import { getTranslator } from "@/lib/i18n/translator";
import { type Locale, locales } from "@/lib/i18n/config";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { getSiteUrl } from "@/lib/marketing/site";

type MarketingPageKey =
  | "home"
  | "features"
  | "pricing"
  | "about"
  | "demo"
  | "contact"
  | "privacy"
  | "terms";

const routeByKey: Record<MarketingPageKey, string> = {
  home: "/",
  features: "/features",
  pricing: "/pricing",
  about: "/about",
  demo: "/demo",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms"
};

export function buildMarketingMetadata(locale: Locale, page: MarketingPageKey): Metadata {
  const t = getTranslator(locale);
  const siteUrl = getSiteUrl();
  const path = buildLocalePathname(locale, routeByKey[page]);
  const canonical = `${siteUrl}${path}`;
  const languages = Object.fromEntries(
    locales.map((nextLocale) => [nextLocale, `${siteUrl}${buildLocalePathname(nextLocale, routeByKey[page])}`])
  );

  const title = t(`marketing.meta.${page}Title`);
  const description = t(`marketing.meta.${page}Description`);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: ["/og/marketing-default.svg"]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og/marketing-default.svg"]
    }
  };
}
