# IOS-D2: App Store Screenshot Generation + Checklist Pipeline

## Purpose
Provide a lightweight, repeatable pipeline to capture, verify, and package iPhone screenshots required for App Store Connect (ASC) submission readiness.

This story covers roadmap item **IOS-D2** and depends on **IOS-A4** (icon/launch assets complete and validated in Xcode/simulator). Execute after IOS-C4 smoke stability is confirmed for the candidate build.

## Source alignment
- Scope/dependency/milestone: `docs/PRODUCT_ROADMAP.md` (IOS-D2, IOS-A4 dependency, Week 4 M4).
- Risk framing: `docs/mobile/app-store-readiness-review.md` P2-2 (missing screenshot pipeline).
- Native execution boundary and validation context: `docs/mobile/ios-a4-icon-launch-assets.md`.
- Artifact naming style baseline: `docs/mobile/ios-c4-app-store-qa-smoke-suite.md`.
- Runbook linkage: `docs/pilot-runbook.md`.

## Execution boundary (important)

### Can be done in-repo (Linux CI/dev)
- Prepare checklist/run folders and artifact names.
- Confirm target build SHA/version, run ID, and required screen list.
- Validate checklist completeness before upload.

### Must be done on macOS + Xcode/simulator
- Launch native iOS wrapper build.
- Capture ASC screenshots from required iPhone simulator classes.
- Perform final visual QA (safe areas, truncation, status bar consistency).

## Required ASC iPhone classes for this pipeline
At minimum, every screenshot run must include:
1. **6.7-inch iPhone class** (example simulator: iPhone 15 Pro Max / iPhone 14 Pro Max).
2. **6.5-inch iPhone class** (example simulator: iPhone 11 Pro Max / iPhone XS Max).

> If ASC requirements change, update this matrix first and reference the change in run notes.

## Capture matrix (minimum viable)
Use one locale at minimum (`en-US`). Add additional locales only when Product requires localized listing screenshots.

| Screenshot ID | App surface (target state) | 6.7" | 6.5" | en-US | Notes |
|---|---|---:|---:|---:|---|
| SS-01 | This Week landing (signed-in member) | Required | Required | Required | Use realistic parish content |
| SS-02 | Tasks / Serve state (open items) | Required | Required | Required | Show at least one assigned/completable task |
| SS-03 | Calendar or Event detail | Required | Required | Required | Prefer event detail with RSVP state |
| SS-04 | Group chat thread with attachment rendered | Required | Required | Required | Attachment must be policy-safe |
| SS-05 | Profile/Settings with account controls visible | Required | Required | Required | Keep copy App Review-safe |

Recommended count for first submission: 5 screenshots per required device class (10 total for one locale).

## Artifact structure + naming convention
Reuse IOS-C4 artifact style (`<area>-<step>-<device>.png`) with explicit screenshot IDs.

```text
artifacts/
  ios-d2/
    <YYYY-MM-DD>/
      IOS-D2-screenshot-checklist.md
      source-build.txt
      asc-upload/
      screenshots/
        iphone-6.7/
          SS-01-this-week-iphone-6.7-en-US.png
          ...
        iphone-6.5/
          SS-01-this-week-iphone-6.5-en-US.png
          ...
```

Naming format:
- `SS-<nn>-<surface>-iphone-<class>-<locale>.png`
- Example: `SS-03-event-detail-iphone-6.7-en-US.png`

Rules:
- Keep `SS-<nn>` stable across both device classes.
- Lowercase + hyphen-separated slug.
- No spaces or reviewer initials in file names.

## Operator workflow (step-by-step)

### 1) Prep run folder and checklist (in repo)
1. From repo root run:
   ```bash
   bash scripts/mobile/generate-ios-d2-screenshot-template.sh
   ```
2. Confirm run directory exists in `artifacts/ios-d2/<date>/`.
3. Fill build metadata (`CFBundleShortVersionString`, `CFBundleVersion`, commit SHA) in checklist.

### 2) Prepare capture environment (macOS)
1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select candidate build/runtime aligned with release branch.
3. Boot simulators for one 6.7" and one 6.5" iPhone class.
4. Ensure app state is seeded with realistic non-sensitive demo data.

### 3) Capture screenshots (macOS)
For each matrix row `SS-01..SS-05`:
1. Navigate to exact target surface/state.
2. Capture screenshot on 6.7" simulator.
3. Capture same surface on 6.5" simulator.
4. Save with required naming format into corresponding class folder.
5. Record completion and operator initials/date in checklist.

### 4) Verify and QA sign-off
Use checklist pass/fail fields for each screenshot ID:
- Correct surface and content.
- No clipped text, broken layout, debug overlays, or dev banners.
- Correct locale copy and no placeholder/mixed-language strings.
- Visual parity between 6.7" and 6.5" captures.

### 5) Package for ASC upload
1. Copy final approved PNGs into `asc-upload/` (or zip from class folders).
2. Keep checklist and build metadata in same dated run folder.
3. Link run folder in release ticket/PR notes for evidence traceability.

## QA checklist template (copy/paste)

```md
# IOS-D2 Screenshot Run Record

- Run date:
- Operator:
- Reviewer:
- App version (`CFBundleShortVersionString`):
- Build number (`CFBundleVersion`):
- Commit SHA:
- Build source: (TestFlight / local release archive)
- Locale(s):

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
- [ ] Checklist signed by operator + reviewer

## Final sign-off
- Overall status: PASS / CONDITIONAL PASS / FAIL
- Notes:
```

## Failure triage hints
- **Missing one device class capture:** block upload; rerun missing class before ASC submission.
- **Wrong app state/content drift:** restore seed data and recapture affected `SS-<nn>` only.
- **Layout/copy regression:** log defect with screenshot ID + device class + build number.
- **Policy-sensitive content visible (payments/external donation shortcuts in native mode):** classify as App Review risk and resolve before upload.
- **Unknown simulator mismatch:** standardize on documented 6.7/6.5 targets and rerun full pair for impacted IDs.

## Quick-start (Product/Design/QA)
1. Generate a run template: `bash scripts/mobile/generate-ios-d2-screenshot-template.sh`.
2. Fill build metadata + owners in `IOS-D2-screenshot-checklist.md`.
3. Capture `SS-01..SS-05` on both 6.7" and 6.5" iPhone classes (macOS/Xcode).
4. Mark pass/fail per screenshot row and reviewer/date.
5. Package approved files for ASC upload and link the dated artifact folder in release notes.
