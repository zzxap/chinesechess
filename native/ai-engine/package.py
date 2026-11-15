"""Bundle build inputs and license notices alongside native libraries."""
from pathlib import Path
import hashlib
import shutil
import tarfile

root = Path(__file__).resolve().parents[2]
dist = root / 'AI/lib-dist'
upstream = root / 'Pikafish/source-m4/Pikafish-Pikafish-2026-09-06'
licenses = dist / 'licenses'
licenses.mkdir(parents=True, exist_ok=True)
for name in ['Copying.txt', 'AUTHORS', 'README.txt']:
    shutil.copy2(upstream / name, licenses / ('engine-' + name))
shutil.copy2(root / 'native/ai-engine/README.md', dist / 'README.md')
model = root / 'Pikafish/pikafish.nnue'
expected = '7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e'
if hashlib.sha256(model.read_bytes()).hexdigest() != expected:
    raise SystemExit('NNUE checksum mismatch; packaging stopped')
shutil.copy2(model, dist / 'model.nnue')
with tarfile.open(dist / 'ai-engine-source.tar.gz', 'w:gz') as archive:
    for path in upstream.rglob('*'):
        if path.is_file() and (path.suffix in ('.cpp', '.h', '.S', '.awk') or path.name in ('Makefile', 'Copying.txt', 'AUTHORS', 'README.txt')):
            archive.add(path, arcname='upstream/' + path.relative_to(upstream).as_posix())
    for directory in ['native/ai-engine']:
        for path in (root / directory).rglob('*'):
            if path.is_file(): archive.add(path, arcname=path.relative_to(root).as_posix())
    archive.add(root / 'scripts/build-ai-engine-libs.sh', arcname='scripts/build-ai-engine-libs.sh')
    archive.add(root / 'scripts/build-ai-engine-libs.ps1', arcname='scripts/build-ai-engine-libs.ps1')
files = sorted(p for p in dist.rglob('*') if p.is_file() and p.name != 'SHA256SUMS')
(dist / 'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.relative_to(dist).as_posix() + '\n' for p in files))
print('Packaged native libraries at', dist)
