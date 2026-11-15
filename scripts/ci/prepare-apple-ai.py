"""Validate native artifacts and stage them inside the local CocoaPods root."""
import hashlib
from pathlib import Path
import plistlib
import shutil
import subprocess

root = Path(__file__).resolve().parents[2]
dist = root / 'AI/lib-dist'
framework = dist / 'AIEngine.xcframework'
with (framework / 'Info.plist').open('rb') as stream:
    libraries = plistlib.load(stream)['AvailableLibraries']
required = {
    ('ios', '', 'arm64'),
    ('ios', 'simulator', 'arm64'),
    ('ios', 'simulator', 'x86_64'),
    ('macos', '', 'arm64'),
    ('macos', '', 'x86_64'),
}
found = set()
for library in libraries:
    binary = framework / library['LibraryIdentifier'] / library['LibraryPath']
    for arch in library['SupportedArchitectures']:
        subprocess.run(['xcrun', 'lipo', '-verify_arch', arch, str(binary)], check=True)
        symbols = subprocess.run(['xcrun', 'nm', '-arch', arch, '-gU', str(binary)],
                                 check=True, capture_output=True, text=True).stdout
        defined = {line.split()[-1] for line in symbols.splitlines() if line.split()}
        missing = {'_pf_create', '_pf_analyze', '_pf_stop', '_pf_destroy'} - defined
        if missing:
            raise SystemExit(f'{binary.name} ({arch}) missing symbols: {sorted(missing)}')
        found.add((library['SupportedPlatform'], library.get('SupportedPlatformVariant', ''), arch))
if required - found:
    raise SystemExit(f'XCFramework missing slices: {sorted(required - found)}')
model = dist / 'model.nnue'
expected = '7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e'
if hashlib.sha256(model.read_bytes()).hexdigest() != expected:
    raise SystemExit('Bundled AI model checksum mismatch')
vendor = root / 'native/ai-engine/vendor'
vendor.mkdir(parents=True, exist_ok=True)
shutil.copytree(framework, vendor / framework.name, dirs_exist_ok=True)
shutil.copy2(model, vendor / model.name)
shutil.copytree(root / 'licenses', vendor / 'licenses', dirs_exist_ok=True)
shutil.copy2(root / 'LICENSE', vendor / 'LICENSE')
print('Apple AI architectures, C symbols and model verified; staged inside Pod root')
