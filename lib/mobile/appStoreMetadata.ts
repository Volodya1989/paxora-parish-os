import { defaultLocale } from "@/lib/i18n/config";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { getSiteUrl } from "@/lib/marketing/site";

export const APP_STORE_SUPPORT_EMAIL = "support@paxora.app";

export const APP_STORE_PATHS = {
  support: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  accountDeletion: "/profile"
} as const;

export function getAppStoreMetadataUrls() {
  const siteUrl = getSiteUrl();

  const localize = (pathname: string) => `${siteUrl}${buildLocalePathname(defaultLocale, pathname)}`;

  return {
    supportUrl: localize(APP_STORE_PATHS.support),
    privacyPolicyUrl: localize(APP_STORE_PATHS.privacy),
    termsOfUseUrl: localize(APP_STORE_PATHS.terms),
    accountDeletionUrl: localize(APP_STORE_PATHS.accountDeletion)
  };
}
