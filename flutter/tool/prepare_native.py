"""Stage existing AI SDK libraries/model for the Flutter FFI plugin."""
import argparse
import hashlib
from pathlib import Path
import plistlib
import shutil

project = Path(__file__).resolve().parents[1]
repo = project.parent
parser = argparse.ArgumentParser()
parser.add_argument('--sdk', type=Path, help='AI SDK folder containing XCFramework/android/windows/model')
parser.add_argument('--platform', choices=['available', 'apple', 'android', 'windows'], default='available')
args = parser.parse_args()
sdk = args.sdk.resolve() if args.sdk else repo / 'AI/lib-dist'
if not sdk.is_dir() and args.sdk is None:
    # Compatibility with the existing local SDK; public C ABI is unchanged.
    sdk = repo / 'Pikafish/lib-dist'
if not sdk.is_dir():
    raise SystemExit('AI SDK not found. Build the native libraries first, or use --sdk /path/to/lib-dist')
plugin = project / 'packages/chess_ai_ffi'
model = next((p for p in [sdk / 'model.nnue', sdk / 'pikafish.nnue'] if p.is_file()), None)
if model is None:
    raise SystemExit('AI SDK model file not found')
expected = '7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e'
if hashlib.sha256(model.read_bytes()).hexdigest() != expected:
    raise SystemExit('AI model checksum mismatch')
(project / 'assets/ai').mkdir(parents=True, exist_ok=True)
shutil.copy2(model, project / 'assets/ai/model.nnue')
prepared = []
framework = next((p for p in [sdk/'AIEngine.xcframework', sdk/'Pikafish.xcframework'] if p.is_dir()), None)
if framework and args.platform in ['available','apple']:
    with (framework/'Info.plist').open('rb') as f: info=plistlib.load(f)
    for item in info['AvailableLibraries']:
        if not (framework/item['LibraryIdentifier']/item['LibraryPath']).is_file():
            raise SystemExit('Incomplete Apple XCFramework')
    for platform in ['ios','macos']:
        vendor=plugin/platform/'vendor'
        vendor.mkdir(parents=True,exist_ok=True)
        shutil.copytree(framework,vendor/'AIEngine.xcframework',dirs_exist_ok=True)
        shutil.copy2(repo/'LICENSE',vendor/'LICENSE')
    prepared.append('Apple')
android=sdk/'android/jniLibs'
if android.is_dir() and args.platform in ['available','android']:
    for abi in ['arm64-v8a','x86_64']:
        folder=android/abi
        library=next((p for p in [folder/'libai_engine.so',folder/'libpikafish.so'] if p.is_file()),None)
        runtime=folder/'libc++_shared.so'
        if library is None or not runtime.is_file(): raise SystemExit('Android AI runtime missing for '+abi)
        target=plugin/'android/src/main/jniLibs'/abi
        target.mkdir(parents=True,exist_ok=True)
        shutil.copy2(library,target/'libai_engine.so');shutil.copy2(runtime,target/runtime.name)
    prepared.append('Android')
windows=sdk/'windows/x64/ai_engine.dll'
if windows.is_file() and args.platform in ['available','windows']:
    target=plugin/'windows/vendor';target.mkdir(parents=True,exist_ok=True)
    shutil.copy2(windows,target/windows.name);prepared.append('Windows')
if args.platform != 'available' and not prepared:
    raise SystemExit('Requested platform library is missing from SDK: '+args.platform)
if not prepared: raise SystemExit('No supported native libraries found')
print('Prepared: '+', '.join(prepared)+'; model checksum OK')
if 'Windows' not in prepared and args.platform == 'available':
    print('Windows DLL is not present locally; build/download its AI SDK before building Windows.')
