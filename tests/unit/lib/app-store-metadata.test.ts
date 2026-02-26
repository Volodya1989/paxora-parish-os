import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  APP_STORE_PATHS,
  APP_STORE_SUPPORT_EMAIL,
  getAppStoreMetadataUrls
} from "@/lib/mobile/appStoreMetadata";

const ORIGINAL_ENV = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL
};

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV.NEXT_PUBLIC_SITE_URL;
  process.env.NEXTAUTH_URL = ORIGINAL_ENV.NEXTAUTH_URL;
});

test("app store metadata maps to stable default-locale URLs", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://app.paxora.example/";

  const urls = getAppStoreMetadataUrls();

  assert.equal(APP_STORE_SUPPORT_EMAIL, "support@paxora.com");
  assert.equal(urls.supportUrl, "https://app.paxora.example/en/contact");
  assert.equal(urls.privacyPolicyUrl, "https://app.paxora.example/en/privacy");
  assert.equal(urls.termsOfUseUrl, "https://app.paxora.example/en/terms");
  assert.equal(urls.accountDeletionUrl, "https://app.paxora.example/en/profile");
});

test("path mapping stays aligned with localized routes", () => {
  assert.deepEqual(APP_STORE_PATHS, {
    support: "/contact",
    privacy: "/privacy",
    terms: "/terms",
    accountDeletion: "/profile"
  });
});
