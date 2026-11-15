#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/AI/build"
DIST="$ROOT/AI/lib-dist"
JOBS="${JOBS:-4}"
TARGET="${1:-all}"
SOURCE="${AI_ENGINE_SOURCE:-$ROOT/Pikafish/source-m4/Pikafish-Pikafish-2026-09-06/src}"
mkdir -p "$BUILD" "$DIST/include"
cp "$ROOT/native/ai-engine/include/ai_engine.h" "$DIST/include/"

build_apple() {
  local name="$1" sdk="$2" arch="$3" system="$4" minimum="$5"
  local sdkpath compiler
  sdkpath="$(xcrun --sdk "$sdk" --show-sdk-path)"
  compiler="$(xcrun --sdk "$sdk" --find clang++)"
  cmake -S "$ROOT/native/ai-engine" -B "$BUILD/$name" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_SYSTEM_NAME="$system" -DAI_ENGINE_SOURCE="$SOURCE" \
    -DCMAKE_CXX_COMPILER="$compiler" -DCMAKE_OSX_SYSROOT="$sdkpath" \
    -DCMAKE_OSX_ARCHITECTURES="$arch" -DCMAKE_OSX_DEPLOYMENT_TARGET="$minimum" \
    "-DCMAKE_CXX_FLAGS=-isystem $sdkpath/usr/include/c++/v1" \
    -DBUILD_SHARED_LIBS=OFF > "$BUILD/$name-configure.log" 2>&1
  cmake --build "$BUILD/$name" -j "$JOBS" > "$BUILD/$name-build.log" 2>&1
  echo "Built $name"
}

if [[ "$TARGET" == apple || "$TARGET" == all ]]; then
  build_apple ios-arm64 iphoneos arm64 iOS 15.1
  build_apple ios-sim-arm64 iphonesimulator arm64 iOS 15.1
  build_apple ios-sim-x86_64 iphonesimulator x86_64 iOS 15.1
  build_apple macos-arm64 macosx arm64 Darwin 12.0
  build_apple macos-x86_64 macosx x86_64 Darwin 12.0
  mkdir -p "$DIST/ios-simulator" "$DIST/macos"
  xcrun lipo -create "$BUILD/ios-sim-arm64/libai_engine.a" "$BUILD/ios-sim-x86_64/libai_engine.a" -output "$DIST/ios-simulator/libai_engine.a"
  xcrun lipo -create "$BUILD/macos-arm64/libai_engine.a" "$BUILD/macos-x86_64/libai_engine.a" -output "$DIST/macos/libai_engine.a"
  # xcodebuild requires an absent destination. Preserve old output on build failure above.
  rm -rf "$DIST/AIEngine.xcframework"
  xcodebuild -create-xcframework \
    -library "$BUILD/ios-arm64/libai_engine.a" -headers "$DIST/include" \
    -library "$DIST/ios-simulator/libai_engine.a" -headers "$DIST/include" \
    -library "$DIST/macos/libai_engine.a" -headers "$DIST/include" \
    -output "$DIST/AIEngine.xcframework" > "$BUILD/xcframework.log" 2>&1
  echo "Packaged AIEngine.xcframework"
fi

if [[ "$TARGET" == android || "$TARGET" == all ]]; then
  NDK="${ANDROID_NDK_HOME:-${ANDROID_HOME:-$HOME/Library/Android/sdk}/ndk/27.1.12297006}"
  ndk_hosts=("$NDK/toolchains/llvm/prebuilt/"*)
  if [[ ${#ndk_hosts[@]} != 1 ]]; then echo "Expected one NDK host toolchain" >&2; exit 1; fi
  for abi in arm64-v8a x86_64; do
    name="android-$abi"
    cmake -S "$ROOT/native/ai-engine" -B "$BUILD/$name" -G Ninja \
      -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON -DAI_ENGINE_SOURCE="$SOURCE" \
      -DCMAKE_TOOLCHAIN_FILE="$NDK/build/cmake/android.toolchain.cmake" \
      -DANDROID_ABI="$abi" -DANDROID_PLATFORM=android-24 \
      -DANDROID_STL=c++_shared -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON \
      > "$BUILD/$name-configure.log" 2>&1
    cmake --build "$BUILD/$name" -j "$JOBS" > "$BUILD/$name-build.log" 2>&1
    mkdir -p "$DIST/android/jniLibs/$abi"
    cp "$BUILD/$name/libai_engine.so" "$DIST/android/jniLibs/$abi/"
    case "$abi" in arm64-v8a) triple=aarch64-linux-android;; x86_64) triple=x86_64-linux-android;; esac
    cp "${ndk_hosts[0]}/sysroot/usr/lib/$triple/libc++_shared.so" "$DIST/android/jniLibs/$abi/"
    echo "Built $name"
  done
fi
if [[ "$TARGET" != all && "$TARGET" != apple && "$TARGET" != android ]]; then
  echo 'Usage: build-ai-engine-libs.sh [all|apple|android]' >&2
  exit 2
fi
python3 "$ROOT/native/ai-engine/package.py"
if [[ "$TARGET" == apple || "$TARGET" == all ]]; then
  python3 "$ROOT/scripts/ci/prepare-apple-ai.py"
fi
