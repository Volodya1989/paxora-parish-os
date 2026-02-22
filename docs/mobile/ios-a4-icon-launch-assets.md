# IOS-A4 Implementation: iOS Icon + Launch Assets

Status: **PARTIAL — workflow implemented; native project + approved brand pack files are still UNKNOWN — needs confirmation in this repo snapshot**

## 1) Discovery

### iOS wrapper structure check (IOS-A1 dependency)
- Expected path from Capacitor/Xcode: `ios/App/App/Assets.xcassets`.
- Current repo snapshot only contains `ios/.gitkeep`; no generated Xcode project files are present.
- Result: **UNKNOWN — needs confirmation** whether IOS-A1 artifacts are intentionally excluded from git or not yet generated.

### Existing reusable sources in repo
Reusable web/PWA assets:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-512-maskable.png`
- `public/apple-touch-icon.png`
- `app/manifest.ts` app name + icon declarations (`Paxora Parish Center App`).

### Missing source files from brand pack
For production iOS asset catalogs, the following approved brand exports are required and currently missing:
- 9 app-icon PNG files (including 1024x1024 marketing icon)
- 3 splash logo PNG files (plus 3 optional dark-mode variants)

These file names/dimensions are defined in `assets/brand/ios/README.md`.

## 2) Reproducible icon + launch pipeline

### Command
```bash
npm run mobile:ios:assets
```

### What it does
Script: `scripts/mobile/configure-ios-assets.sh`
1. Validates `ios/App/App/Assets.xcassets` exists.
2. Validates required brand-pack files exist at `assets/brand/ios` (or `$IOS_BRAND_ASSETS_DIR`).
3. Verifies PNG dimensions for each required input.
4. Replaces:
   - `AppIcon.appiconset` with all required iPhone + App Store slots.
   - `Splash.imageset` with universal splash logo(s).
5. Enables dark appearance splash variants only when `splash-logo-dark-*` files are provided.

### App icon constraints enforced
- Required iOS icon slots included:
  - 20pt (`2x`, `3x`)
  - 29pt (`2x`, `3x`)
  - 40pt (`2x`, `3x`)
  - 60pt (`2x`, `3x`)
  - 1024pt App Store marketing icon
- Naming consistency is fixed by scripted file names.
- Transparency/background policy must be enforced at export-time by design; script only validates dimensions.

## 3) Launch/splash behavior decision

- Default mode: **single-style splash** (same image used for light and dark).
- Optional: provide `splash-logo-dark-*` files to enable dark appearance overrides.
- The launch background color/logo placement is finalized in Xcode `LaunchScreen.storyboard` and should align with brand pack guidance.

## 4) Config wiring checks

After assets are generated:
1. Open `ios/App/App.xcworkspace`.
2. In target **App → General → App Icons and Launch Screen**:
   - App Icons Source = `AppIcon`
   - Launch Screen File = `LaunchScreen`
3. In `LaunchScreen.storyboard`, confirm image view references `Splash` image set.
4. Ensure no legacy/default Capacitor icon remains in `Assets.xcassets`.

No changes are required to `capacitor.config.ts` for icon wiring (Xcode asset catalogs are source of truth).

## 5) QA checklist (manual)

- [ ] `xcodebuild` succeeds for `ios/App` target.
- [ ] Simulator test: iPhone 15 shows branded home icon.
- [ ] Simulator test: iPhone SE (3rd gen) shows branded home icon.
- [ ] Launch screen logo is centered, not clipped/stretched.
- [ ] First rendered app screen appears immediately after launch.
- [ ] No pixelation at icon or splash display sizes.
- [ ] App Store 1024 icon is present in `AppIcon.appiconset`.

## 6) Known limitations

1. This container cannot currently install missing Capacitor dependencies due npm registry policy (`403 Forbidden`), so IOS-A1 project generation could not be completed here.
2. Xcode/simulator validation and screenshots must be run on a macOS environment with Xcode installed.
3. Approved brand-pack source files are not committed in this snapshot.

## 7) Regeneration steps for future brand updates

1. Replace files in `assets/brand/ios` with newly exported brand-pack PNGs.
2. Run:
   ```bash
   npm run mobile:ios:assets
   ```
3. Open Xcode and verify AppIcon/LaunchScreen wiring.
4. Run simulator QA checklist above.
5. Attach updated screenshots to IOS-D2 evidence.
