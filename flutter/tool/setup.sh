#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tool/prepare_native.py "$@"
flutter pub get
# Real ffigen generation replaces the checked-in bootstrap declarations.
dart run ffigen --config ffigen.yaml
dart format lib
flutter analyze
