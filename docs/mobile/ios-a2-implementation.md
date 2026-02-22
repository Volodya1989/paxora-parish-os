# IOS-A2 Implementation Notes

Status: **PARTIAL — script authored but blocked by IOS-A1; never validated against real Xcode project files**

## What was added
- `scripts/mobile/configure-ios-identity.sh` to configure iOS app identity in a Capacitor-generated project:
  - `PRODUCT_BUNDLE_IDENTIFIER`
  - `CFBundleDisplayName`
  - `CFBundleShortVersionString`
  - `CFBundleVersion`
  - `DEVELOPMENT_TEAM` (optional)
- `package.json` script alias:
  - `mobile:ios:identity`

## Usage
After IOS-A1 has generated the iOS project (`ios/App/*`), run:

```bash
IOS_BUNDLE_ID=com.paxora.parishcenter \
IOS_DISPLAY_NAME="Paxora Parish Center" \
IOS_VERSION_NAME=1.0.0 \
IOS_BUILD_NUMBER=1 \
IOS_DEVELOPMENT_TEAM=YOURTEAMID \
npm run mobile:ios:identity
```

If `IOS_DEVELOPMENT_TEAM` is omitted, bundle/app/version/build values are still configured.

## Actions needed from you
1. Ensure npm registry access works in your environment.
2. Run IOS-A1 bootstrap to generate native files:
   - `bash scripts/mobile/bootstrap-capacitor-ios.sh`
3. Run identity configuration command above.
4. Open `ios/App/App.xcworkspace` in Xcode and confirm signing profile/certificates for your Apple team.
