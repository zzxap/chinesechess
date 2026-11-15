# Pikafish for Apple M4 Mac

Source: official-pikafish/Pikafish, tag Pikafish-2026-09-06.
https://github.com/official-pikafish/Pikafish/tree/Pikafish-2026-09-06

Target: ARM64, apple-m4 CPU / tuning, NEON dot-product. Minimum macOS: 15.0.
Build: make build ARCH=apple-silicon COMP=clang with -mcpu=apple-m4 -mtune=apple-m4.
Built on an Intel Mac using Xcode Apple clang 17 cross-compilation.
No runtime CPU dispatch; no PGO benchmarks or game tests.

Binary: Pikafish-MacOS-arm64-M4
SHA256: a5d25cebe9894b29078336e71fc91139b03cb977917c9930a2c4bb10af66062a
Model: pikafish.nnue
Model SHA256: 7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e

Keep the binary and model in the same directory on an M4 Mac.
This binary cannot run on Intel Macs. Actual M4 startup has not been verified.
Source, archive, objects and log are in source-m4 on the external project volume.
Rebuild: bash scripts/build-pikafish-m4.sh from the project root.
License: https://github.com/official-pikafish/Pikafish/blob/Pikafish-2026-09-06/Copying.txt
Model license: official release NNUE-License.md.
