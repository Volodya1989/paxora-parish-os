# App Store Connect Metadata (IOS-B5)

Use this as copy/paste source for iOS App Store Connect legal/support metadata.

## Canonical legal/support mapping

> Base URL: `https://<public-site-domain>` (must match `NEXT_PUBLIC_SITE_URL` in production)

- **Support URL:** `https://<public-site-domain>/en/contact`
- **Support email:** `support@paxora.app`
- **Privacy Policy URL:** `https://<public-site-domain>/en/privacy`
- **Terms of Use URL:** `https://<public-site-domain>/en/terms`
- **Account deletion URL (discoverability reference):** `https://<public-site-domain>/en/profile`

These values are codified in `lib/mobile/appStoreMetadata.ts` and rendered on user-facing pages:
- Marketing contact page (`/[locale]/contact`)
- Privacy policy page (`/[locale]/privacy`)
- Terms page (`/[locale]/terms`)
- Profile account deletion card (`/[locale]/profile`)

## Account deletion instructions summary (for metadata/review notes)

Users can delete their account in-app from **Profile → Delete account**. They must type `DELETE` to confirm.

When deletion is confirmed:
1. User sign-in access ends immediately.
2. Profile/account ownership links are removed.
3. Historical parish records (events, tasks, messages) remain for parish continuity and are reassigned to **Deleted User**.

For deletion help or parish-level data removal requests, users can email **support@paxora.app**.

Target response time for deletion support requests: **within 7 calendar days**.


## Related IOS-D1 listing pack

For full App Store listing content (description, keywords, categories, age rating, privacy labels, App Review notes, and pre-submit checklist), use `docs/mobile/ios-d1-app-store-connect-metadata-pack.md`.
