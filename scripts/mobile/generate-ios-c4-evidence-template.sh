#!/usr/bin/env bash
set -euo pipefail

RUN_DATE="${1:-$(date +%F)}"
OUTPUT_DIR="artifacts/ios-c4/${RUN_DATE}"
OUTPUT_FILE="${OUTPUT_DIR}/IOS-C4-smoke-run-record.md"

mkdir -p "${OUTPUT_DIR}"

cat > "${OUTPUT_FILE}" <<TEMPLATE
# IOS-C4 Smoke Run Record

- Date: ${RUN_DATE}
- Tester:
- Device model:
- iOS version:
- App build (TestFlight build # / commit SHA):
- Runtime mode: (native_wrapper / pwa_standalone / safari_tab)
- Runtime flags:
  - NEXT_PUBLIC_IOS_NATIVE_SHELL=true
  - NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native

## Results by area
| Area | Expected | Actual | Pass/Fail | Artifact links/files |
|---|---|---|---|---|
| Auth | Sign in + continuity + sign out |  |  |  |
| Onboarding/access gate | Gate shown, then approved flow enters shell |  |  |  |
| Tasks (create + complete) | Task created and completion persists after refresh |  |  |  |
| Events (create + RSVP) | Event created and RSVP state retained |  |  |  |
| Chat upload/render | Authorized upload succeeds and attachment renders |  |  |  |
| Giving shortcut behavior | Wrapper mode hides giving shortcut; API/log shows shortcut: null |  |  |  |

## Artifacts index
- Screenshots:
- Video:
- Logs/network snippets:

## Defects / triage notes
- Severity:
- Owner:
- Target fix build/date:

## Final status
- Overall: PASS / CONDITIONAL PASS / FAIL
- Reviewer sign-off:
TEMPLATE

echo "Created ${OUTPUT_FILE}"
