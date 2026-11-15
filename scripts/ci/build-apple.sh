#!/usr/bin/env bash
set -euo pipefail
platform="${1:?ios or macos}"
if [[ "$platform" == macos && "${APPLE_SIGNED:-false}" == true ]]; then
  : "${APPLE_ID:?Add APPLE_ID to GitHub Actions Secrets for notarization}"
  : "${APPLE_APP_SPECIFIC_PASSWORD:?Add APPLE_APP_SPECIFIC_PASSWORD to GitHub Actions Secrets for notarization}"
  : "${APPLE_TEAM_ID:?Missing APPLE_TEAM_ID}"
fi
mkdir -p release-artifacts
if [[ "$platform" == ios ]]; then
  args=("MARKETING_VERSION=$APP_VERSION" "CURRENT_PROJECT_VERSION=$APP_BUILD_NUMBER")
  if [[ "${APPLE_SIGNED:-false}" != true ]]; then
    args+=(CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO)
  fi
  xcodebuild -workspace ios/ChineseChess.xcworkspace -scheme ChineseChess \
    -configuration Release -destination 'generic/platform=iOS' \
    -archivePath "$RUNNER_TEMP/ChineseChess.xcarchive" archive \
    "${args[@]}"
  if [[ "${APPLE_SIGNED:-false}" == true ]]; then
    xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/ChineseChess.xcarchive" \
      -exportOptionsPlist "$RUNNER_TEMP/ExportOptions.plist" -exportPath "$RUNNER_TEMP/ios-export"
    cp "$RUNNER_TEMP/ios-export/ChineseChess.ipa" "release-artifacts/chinesechess-$APP_VERSION-ios-appstore.ipa"
    echo 'iOS: App Store signed IPA (not uploaded to App Store Connect)' >> "$GITHUB_STEP_SUMMARY"
  else
    mkdir -p "$RUNNER_TEMP/unsigned-ios/Payload"
    ditto "$RUNNER_TEMP/ChineseChess.xcarchive/Products/Applications/ChineseChess.app" "$RUNNER_TEMP/unsigned-ios/Payload/ChineseChess.app"
    (cd "$RUNNER_TEMP/unsigned-ios" && ditto -c -k --keepParent Payload "$GITHUB_WORKSPACE/release-artifacts/chinesechess-$APP_VERSION-ios-unsigned.ipa")
    echo 'iOS: unsigned IPA, requires signing before installation' >> "$GITHUB_STEP_SUMMARY"
  fi
  ditto -c -k --keepParent "$RUNNER_TEMP/ChineseChess.xcarchive" "release-artifacts/chinesechess-$APP_VERSION-ios.xcarchive.zip"
elif [[ "$platform" == macos ]]; then
  RN_PLATFORM=macos xcodebuild -workspace macos/ChineseChess.xcworkspace -scheme ChineseChess-macOS \
    -configuration Release -destination 'generic/platform=macOS' \
    -derivedDataPath "$RUNNER_TEMP/macos-build" build \
    ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO CODE_SIGNING_ALLOWED=NO \
    MARKETING_VERSION="$APP_VERSION" CURRENT_PROJECT_VERSION="$APP_BUILD_NUMBER"
  app="$RUNNER_TEMP/macos-build/Build/Products/Release/ChineseChess.app"
  status=adhoc
  if [[ "${APPLE_SIGNED:-false}" == true ]]; then
    codesign --force --deep --options runtime --timestamp --sign "$MACOS_SIGN_IDENTITY" "$app"
    codesign --verify --deep --strict --verbose=2 "$app"
    ditto -c -k --keepParent "$app" "$RUNNER_TEMP/chinesechess-notarize.zip"
    python3 scripts/ci/notarize-apple.py "$RUNNER_TEMP/chinesechess-notarize.zip"
    xcrun stapler staple "$app"
    xcrun stapler validate "$app"
    spctl --assess --type execute --verbose=2 "$app"
    status=notarized
  else
    codesign --force --deep --sign - "$app"
  fi
  ditto -c -k --keepParent "$app" "release-artifacts/chinesechess-$APP_VERSION-macos-universal-$status.zip"
  mkdir -p "$RUNNER_TEMP/dmg"
  ditto "$app" "$RUNNER_TEMP/dmg/ChineseChess.app"
  ln -s /Applications "$RUNNER_TEMP/dmg/Applications"
  hdiutil create -volname ChineseChess -srcfolder "$RUNNER_TEMP/dmg" -ov -format UDZO \
    "release-artifacts/chinesechess-$APP_VERSION-macos-universal-$status.dmg"
  if [[ "$status" == notarized ]]; then
    dmg="release-artifacts/chinesechess-$APP_VERSION-macos-universal-$status.dmg"
    codesign --force --timestamp --sign "$MACOS_SIGN_IDENTITY" "$dmg"
    python3 scripts/ci/notarize-apple.py "$dmg"
    xcrun stapler staple "$dmg"
    xcrun stapler validate "$dmg"
  fi
  echo "macOS: universal $status ZIP + DMG" >> "$GITHUB_STEP_SUMMARY"
else
  echo 'Expected ios or macos' >&2; exit 2
fi
