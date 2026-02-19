import { getTranslator } from "@/lib/i18n/translator";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export function getMarketingCopy(localeParam: string) {
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);

  return {
    locale,
    t,
    navLinks: [
      { href: "/features", label: t("marketing.nav.features") },
      { href: "/pricing", label: t("marketing.nav.pricing") },
      { href: "/about", label: t("marketing.nav.about") },
      { href: "/demo", label: t("marketing.nav.demo") },
      { href: "/contact", label: t("marketing.nav.contact") }
    ],
    footerLinks: [
      { href: "/features", label: t("marketing.nav.features") },
      { href: "/pricing", label: t("marketing.nav.pricing") },
      { href: "/privacy", label: t("marketing.nav.privacy") },
      { href: "/terms", label: t("marketing.nav.terms") },
      { href: "/contact", label: t("marketing.nav.contact") }
    ]
  };
}
