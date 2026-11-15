#!/bin/bash
set -eu

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$project_dir/Pikafish/source/Pikafish-Pikafish-2026-09-06/src"
sdk_dir="$(xcrun --show-sdk-path)"
compiler="$(xcrun --find clang++)"

if [ ! -f "$source_dir/Makefile" ]; then
  printf '%s\n' '缺少 Pikafish 2026-09-06 源码，请先解压至 Pikafish/source。' >&2
  exit 1
fi
if [ "$(uname -m)" != x86_64 ]; then
  printf '%s\n' '此脚本用于 Intel Mac 的 x86-64 / SSE2 兼容版本。' >&2
  exit 1
fi
if [ ! -e "$source_dir/pikafish.nnue" ]; then
  ln -s ../../../pikafish.nnue "$source_dir/pikafish.nnue"
fi

# All source files, objects and the linked executable stay on the project volume.
# Plain build performs no PGO benchmark or game tests.
make -C "$source_dir" -j4 build ARCH=x86-64 COMP=clang CXX="$compiler" \
  EXTRACXXFLAGS="-isysroot $sdk_dir -isystem $sdk_dir/usr/include/c++/v1" \
  EXTRALDFLAGS="-isysroot $sdk_dir" \
  > "$project_dir/Pikafish/source/build-x86-64.log" 2>&1
cp "$source_dir/pikafish" "$project_dir/Pikafish/Pikafish-MacOS-x86-64-compatible"
chmod +x "$project_dir/Pikafish/Pikafish-MacOS-x86-64-compatible"
printf '%s\n' "$project_dir/Pikafish/Pikafish-MacOS-x86-64-compatible"
