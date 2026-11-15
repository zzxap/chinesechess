#!/bin/bash
set -eu

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$(python3 "$project_dir/scripts/prepare-ai-cli.py" x86-64)"
sdk_dir="$(xcrun --show-sdk-path)"
compiler="$(xcrun --find clang++)"

if [ ! -f "$source_dir/Makefile" ]; then
  printf '%s\n' '缺少 AI库对应版本的源码。' >&2
  exit 1
fi
if [ "$(uname -m)" != x86_64 ]; then
  printf '%s\n' '此脚本用于 Intel Mac 的 x86-64 / SSE2 兼容版本。' >&2
  exit 1
fi

# All source files, objects and the linked executable stay on the project volume.
# Plain build performs no PGO benchmark or game tests.
make -C "$source_dir" -j4 build ARCH=x86-64 COMP=clang CXX="$compiler" \
  EXTRACXXFLAGS="-isysroot $sdk_dir -isystem $sdk_dir/usr/include/c++/v1" \
  EXTRALDFLAGS="-isysroot $sdk_dir" \
  > "$project_dir/AI/build/cli-x86-64/build.log" 2>&1
cp "$source_dir/pikafish" "$project_dir/Pikafish/Pikafish-MacOS-x86-64-compatible"
chmod +x "$project_dir/Pikafish/Pikafish-MacOS-x86-64-compatible"
printf '%s\n' "$project_dir/Pikafish/Pikafish-MacOS-x86-64-compatible"
