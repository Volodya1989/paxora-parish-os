# PR Notes: Greetings automation moved to daily cron on Vercel Hobby

## Step 0 investigation summary

- Cron configuration was in `vercel.json` and used `*/15 * * * *`, pointing to `/api/cron/greetings`.
- Scheduler endpoint lived at `app/api/cron/greetings/route.ts` and previously depended on a 15-minute window (`shouldRunGreetingForParishTime`) against parish-local `greetingsSendHourLocal` + `greetingsSendMinuteLocal`.
- Parish-local date/time and date key were derived in `lib/email/greetingSchedule.ts` via `getParishLocalDateParts`.
- Automation UI status lived in `components/automation/GreetingsConfig.tsx` + `app/[locale]/(app)/admin/automation/page.tsx`:
  - “Next run” preview was computed client-side by `getNextRunPreview` in `lib/time/parishTimezones.ts`.
  - “Planned for today” came from `getGreetingCandidatesForParish(...).summary.dateMatchedMemberships`.
  - “Confirmed sent today” was counted from `emailLog` by local-day UTC boundaries.
- Idempotency logic already existed in `lib/email/greetings.ts` with `GreetingEmailLog` unique key `(userId, parishId, type, dateKey)`, checking for existing log before send and writing log only after successful send.

## Strategy selected

- Implemented **Option 2 (Hobby-safe best effort)**: run cron once daily and send during that run. Preferred send time is still stored and shown as preferred/best-effort.
