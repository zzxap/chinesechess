"""Stage desktop executable sources on the project volume, without old objects."""
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parents[1]
target = sys.argv[1]
if target not in ('x86-64', 'm4'):
    raise SystemExit('Unsupported desktop target')
upstream = root / 'Pikafish/source-m4/Pikafish-Pikafish-2026-09-06'
stage = root / 'AI/build' / ('cli-' + target) / 'source'
shutil.copytree(upstream, stage, dirs_exist_ok=True,
                ignore=shutil.ignore_patterns('*.o', 'pikafish', 'pikafish.nnue', '.depend'))
model = stage / 'src/pikafish.nnue'
if not model.exists():
    model.symlink_to(root / 'Pikafish/pikafish.nnue')
print(stage / 'src')
