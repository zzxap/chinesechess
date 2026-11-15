#!/bin/bash
set -eu

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$(python3 "$project_dir/scripts/prepare-ai-cli.py" m4)"
sdk_dir="$(xcrun --show-sdk-path)"
compiler="$(xcrun --find clang++)"

if [ ! -f "$source_dir/Makefile" ]; then
  printf '%s\n' '缺少 AI库对应版本的源码。' >&2
  exit 1
fi

# Cross-compilation works on Intel Macs with an Xcode supporting apple-m4.
# Plain build only: do not run PGO benchmarks or execute the ARM binary on this host.
make -C "$source_dir" -j4 build ARCH=apple-silicon COMP=clang CXX="$compiler" \
  mac_target_flags="-mmacosx-version-min=15.0 -arch arm64" \
  EXTRACXXFLAGS="-isysroot $sdk_dir -isystem $sdk_dir/usr/include/c++/v1 -mcpu=apple-m4 -mtune=apple-m4" \
  EXTRALDFLAGS="-isysroot $sdk_dir -mcpu=apple-m4 -mtune=apple-m4" \
  > "$project_dir/AI/build/cli-m4/build.log" 2>&1
cp "$source_dir/pikafish" "$project_dir/Pikafish/Pikafish-MacOS-arm64-M4"
chmod +x "$project_dir/Pikafish/Pikafish-MacOS-arm64-M4"
printf '%s\n' "$project_dir/Pikafish/Pikafish-MacOS-arm64-M4"
