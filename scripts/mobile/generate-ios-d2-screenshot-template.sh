#!/usr/bin/env bash
set -euo pipefail

RUN_DATE="${1:-$(date +%F)}"
OUTPUT_DIR="artifacts/ios-d2/${RUN_DATE}"
CHECKLIST_FILE="${OUTPUT_DIR}/IOS-D2-screenshot-checklist.md"
BUILD_FILE="${OUTPUT_DIR}/source-build.txt"
PLAN_FILE="${OUTPUT_DIR}/screenshot-plan.csv"

mkdir -p "${OUTPUT_DIR}/asc-upload" "${OUTPUT_DIR}/screenshots/iphone-6.7" "${OUTPUT_DIR}/screenshots/iphone-6.5"

if [[ ! -f "${CHECKLIST_FILE}" ]]; then
  cat > "${CHECKLIST_FILE}" <<'TEMPLATE'
# IOS-D2 Screenshot Run Record

- Run date: __RUN_DATE__
- Operator:
- Reviewer:
- App version (CFBundleShortVersionString):
- Build number (CFBundleVersion):
- Commit SHA:
- Build source: (TestFlight / local release archive)
- Locale(s): en-US

## Device targets
- 6.7-inch simulator/device:
- 6.5-inch simulator/device:
- iOS version(s):

## Screenshot verification matrix
| Screenshot ID | Page/surface mapping | 6.7 file | 6.5 file | Pass/Fail | Reviewer | Date |
|---|---|---|---|---|---|---|
| SS-01 | This Week landing |  |  |  |  |  |
| SS-02 | Tasks / Serve |  |  |  |  |  |
| SS-03 | Calendar/Event detail |  |  |  |  |  |
| SS-04 | Chat thread + attachment render |  |  |  |  |  |
| SS-05 | Profile/Settings |  |  |  |  |  |

## ASC packaging check
- [ ] File names follow `SS-<nn>-<surface>-iphone-<class>-<locale>.png`
- [ ] Both required classes present (6.7 and 6.5)
- [ ] Upload set contains only final approved images
- [ ] PNG dimensions match class targets (6.7 = 1290x2796, 6.5 = 1242x2688)
- [ ] Checklist signed by operator + reviewer

## Final sign-off
- Overall status: PASS / CONDITIONAL PASS / FAIL
- Notes:
TEMPLATE
  sed -i "s/__RUN_DATE__/${RUN_DATE}/g" "${CHECKLIST_FILE}"
fi

if [[ ! -f "${BUILD_FILE}" ]]; then
  cat > "${BUILD_FILE}" <<'BUILDINFO'
# Fill before capture
CFBundleShortVersionString=
CFBundleVersion=
commit_sha=
build_source=
BUILDINFO
fi

if [[ ! -f "${PLAN_FILE}" ]]; then
  cat > "${PLAN_FILE}" <<'PLAN'
screenshot_id,surface_slug,device_class,locale,file_name
SS-01,this-week,iphone-6.7,en-US,SS-01-this-week-iphone-6.7-en-US.png
SS-01,this-week,iphone-6.5,en-US,SS-01-this-week-iphone-6.5-en-US.png
SS-02,tasks-serve,iphone-6.7,en-US,SS-02-tasks-serve-iphone-6.7-en-US.png
SS-02,tasks-serve,iphone-6.5,en-US,SS-02-tasks-serve-iphone-6.5-en-US.png
SS-03,event-detail,iphone-6.7,en-US,SS-03-event-detail-iphone-6.7-en-US.png
SS-03,event-detail,iphone-6.5,en-US,SS-03-event-detail-iphone-6.5-en-US.png
SS-04,chat-thread-attachment,iphone-6.7,en-US,SS-04-chat-thread-attachment-iphone-6.7-en-US.png
SS-04,chat-thread-attachment,iphone-6.5,en-US,SS-04-chat-thread-attachment-iphone-6.5-en-US.png
SS-05,profile-settings,iphone-6.7,en-US,SS-05-profile-settings-iphone-6.7-en-US.png
SS-05,profile-settings,iphone-6.5,en-US,SS-05-profile-settings-iphone-6.5-en-US.png
PLAN
fi

echo "Prepared ${OUTPUT_DIR}"
echo "- Checklist: ${CHECKLIST_FILE}"
echo "- Build metadata: ${BUILD_FILE}"
echo "- Capture plan: ${PLAN_FILE}"
