# IOS-D4: CI Lane for iOS Build Validation + Artifact Upload Notes

## Purpose
IOS-D4 adds a dedicated CI lane for iOS build validation and operator-facing artifact guidance so TestFlight prep can reference reproducible evidence before final release promotion.

This story depends on IOS-A3 and reuses its baseline command sequence (`npm ci`, `npm run mobile:ios:pipeline`) to avoid workflow drift.

## CI lane location
- Workflow file: `.github/workflows/ios-build-validation.yml`
- Workflow name: **iOS Build Validation**
- Triggers:
  - `pull_request`
  - `push` to `main`
  - `workflow_dispatch`

## What this lane validates
The lane executes, in order:
1. Dependency install (`npm ci`)
2. Core quality checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
3. IOS-A3 iOS pipeline baseline:
   - `npm run mobile:ios:pipeline`

## Environment fallback behavior (explicit)
Current IOS-D4 lane runs on `ubuntu-latest` for broad CI availability and fast feedback.

Because native Xcode build/archive tooling is not available in this environment, native archive validation is explicitly marked as **skipped** in generated run metadata:
- `ios_native_build=skipped`
- `skip_reason=xcodebuild is not available on ubuntu-latest; use a macOS lane for native archive validation`

This is intentional for IOS-D4 scope: deterministic wrapper sync/build validation + evidence bundle generation.

## Artifact upload notes
The lane uploads a single artifact bundle via `actions/upload-artifact`:
- Artifact name: `ios-d4-validation-<github_run_id>`
- Path in workflow workspace: `artifacts/ios-d4/<github_run_id>/`
- Retention: `14` days

### Files included in artifact bundle
- `run-metadata.txt`
  - run ID/attempt, commit SHA/ref, runner OS
  - explicit native build skip marker for non-macOS
- `mobile-ios-pipeline.log`
  - captured output of `npm run mobile:ios:pipeline`
- `ios-app-project.tgz` (if present)
  - compressed `ios/App` project snapshot after sync
- `capacitor.config.ts` (if present)
  - config snapshot used by the run

## How QA/Ops uses this (TestFlight prep)
1. Open the **iOS Build Validation** workflow run for the release candidate commit.
2. Download `ios-d4-validation-<run_id>` artifact.
3. Review `run-metadata.txt` and `mobile-ios-pipeline.log` first to confirm pipeline success and environment context.
4. Use this artifact as a supporting evidence input alongside IOS-C4 smoke artifacts (`docs/mobile/ios-c4-app-store-qa-smoke-suite.md`).
5. Carry both evidence sets into IOS-D3 go/no-go and promotion steps (`docs/mobile/ios-d3-testflight-to-production-runbook.md`).

## Operator checklist snippet
- [ ] Workflow run passed on candidate SHA
- [ ] Artifact `ios-d4-validation-<run_id>` downloaded
- [ ] `run-metadata.txt` reviewed (including native build skip note)
- [ ] `mobile-ios-pipeline.log` reviewed for sync/build errors
- [ ] IOS-C4 smoke evidence attached for same candidate build
- [ ] IOS-D3 release record linked with CI artifact + IOS-C4 artifacts
