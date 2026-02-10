# i18n Locale Persistence + Ukrainian Completion Report

## Root cause of locale reset/mismatch

1. **Root `<html lang>` was derived only from cookie**, not the active locale path segment. On prefixed routes, this could render a mismatched document language during SSR when cookie and URL were temporarily out of sync.
2. **Locale persistence depended mostly on toggle handlers**, instead of a centralized sync at the app-level provider.
3. **Serve screens contained many hardcoded English strings**, creating the impression that locale reset happened even when the locale switcher showed `УК`.

## Source of truth now

- `NEXT_LOCALE` cookie remains the server source of truth for middleware redirects.
- App-level i18n provider locale (`/[locale]/...`) is synced to:
  - cookie (`NEXT_LOCALE`)
  - localStorage (`paxora_locale`)
- Root layout now resolves document language using middleware-provided pathname (`x-pathname`) first, with cookie fallback.

## Translation coverage updated in this change

- Serve page header/title/subtitle fallback text.
- Serve board UI strings (filters, empty states, actions, statuses, toasts).
- Volunteer hours summary labels and tier labels.
- Opportunity request dialog labels/placeholders/messages.
- Ukrainian translations added for all keys introduced above.

## Future Spanish onboarding

- Added `messages/es.json` placeholder copied from English structure.
- Added `localeCatalog` in i18n config with `es` included as staged locale.
- To fully enable Spanish later:
  1. Add `"es"` to `locales` in `lib/i18n/config.ts`.
  2. Register `es` in `messagesByLocale` in `lib/i18n/messages.ts`.
  3. Add Spanish option in language switcher UI.
  4. Translate `messages/es.json` values.

