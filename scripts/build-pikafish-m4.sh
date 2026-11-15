#!/bin/bash
set -eu

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$project_dir/Pikafish/source-m4/Pikafish-Pikafish-2026-09-06/src"
sdk_dir="$(xcrun --show-sdk-path)"
compiler="$(xcrun --find clang++)"

if [ ! -f "$source_dir/Makefile" ]; then
  printf '%s\n' '缺少同版本源码，请将 Pikafish-2026-09-06 源码解压至 Pikafish/source-m4。' >&2
  exit 1
fi
if [ ! -e "$source_dir/pikafish.nnue" ]; then
  ln -s ../../../pikafish.nnue "$source_dir/pikafish.nnue"
fi

# Cross-compilation works on Intel Macs with an Xcode supporting apple-m4.
# Plain build only: do not run PGO benchmarks or execute the ARM binary on this host.
make -C "$source_dir" -j4 build ARCH=apple-silicon COMP=clang CXX="$compiler" \
  mac_target_flags="-mmacosx-version-min=15.0 -arch arm64" \
  EXTRACXXFLAGS="-isysroot $sdk_dir -isystem $sdk_dir/usr/include/c++/v1 -mcpu=apple-m4 -mtune=apple-m4" \
  EXTRALDFLAGS="-isysroot $sdk_dir -mcpu=apple-m4 -mtune=apple-m4" \
  > "$project_dir/Pikafish/source-m4/build-m4.log" 2>&1
cp "$source_dir/pikafish" "$project_dir/Pikafish/Pikafish-MacOS-arm64-M4"
chmod +x "$project_dir/Pikafish/Pikafish-MacOS-arm64-M4"
printf '%s\n' "$project_dir/Pikafish/Pikafish-MacOS-arm64-M4"
