#!/usr/bin/env bash
set -euo pipefail
status=unsigned
trap 'rm -f "$RUNNER_TEMP/chinesechess-upload.keystore"' EXIT
if [[ -n "${ANDROID_KEYSTORE_BASE64:-}${ANDROID_KEYSTORE_PASSWORD:-}${ANDROID_KEY_ALIAS:-}${ANDROID_KEY_PASSWORD:-}" ]]; then
  : "${ANDROID_KEYSTORE_BASE64:?Missing ANDROID_KEYSTORE_BASE64}"
  : "${ANDROID_KEYSTORE_PASSWORD:?Missing ANDROID_KEYSTORE_PASSWORD}"
  : "${ANDROID_KEY_ALIAS:?Missing ANDROID_KEY_ALIAS}"
  : "${ANDROID_KEY_PASSWORD:?Missing ANDROID_KEY_PASSWORD}"
  export ANDROID_KEYSTORE_PATH="$RUNNER_TEMP/chinesechess-upload.keystore"
  python3 - <<'PY'
import base64, os
from pathlib import Path
p = Path(os.environ['ANDROID_KEYSTORE_PATH'])
p.write_bytes(base64.b64decode(''.join(os.environ['ANDROID_KEYSTORE_BASE64'].split()), validate=True))
p.chmod(0o600)
PY
  status=signed
fi
build_log="$RUNNER_TEMP/chinesechess-android-build.log"
if (cd android && bash gradlew :app:assembleRelease :app:bundleRelease \
    --no-daemon --stacktrace --console=plain -PreactNativeArchitectures=arm64-v8a,x86_64) \
    2>&1 | tee "$build_log"; then
  :
else
  python3 scripts/ci/report-build-error.py "$build_log" || true
  exit 1
fi
mkdir -p release-artifacts
cp android/app/build/outputs/apk/release/*.apk "release-artifacts/chinesechess-$APP_VERSION-android-$status.apk"
cp android/app/build/outputs/bundle/release/*.aab "release-artifacts/chinesechess-$APP_VERSION-android-$status.aab"
echo "Android: $status APK + AAB" >> "$GITHUB_STEP_SUMMARY"
