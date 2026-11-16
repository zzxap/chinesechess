$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
python tool/prepare_native.py --platform windows @args
if ($LASTEXITCODE -ne 0) { throw 'Native AI preparation failed' }
flutter pub get
if ($LASTEXITCODE -ne 0) { throw 'Flutter dependency resolution failed' }
dart run ffigen --config ffigen.yaml
if ($LASTEXITCODE -ne 0) { throw 'FFI binding generation failed' }
dart format lib
if ($LASTEXITCODE -ne 0) { throw 'Dart formatting failed' }
flutter analyze
if ($LASTEXITCODE -ne 0) { throw 'Flutter static analysis failed' }
