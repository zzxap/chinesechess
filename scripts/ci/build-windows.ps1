$ErrorActionPreference = 'Stop'
$ManifestPath = Join-Path $PWD 'windows/ChineseChess.Package/Package.appxmanifest'
[xml]$Manifest = Get-Content $ManifestPath -Raw
$Manifest.Package.Identity.Version = "$env:APP_VERSION.$env:APP_BUILD_NUMBER"
$Manifest.Save($ManifestPath)
pnpm exec react-native run-windows --release --arch x64 --no-packager --no-launch --no-deploy --logging --msbuildprops "AppxPackageSigningEnabled=false,GenerateAppxPackageOnBuild=false"
if ($LASTEXITCODE -ne 0) { throw 'Windows app build failed' }
$Exe = Get-ChildItem windows -Filter ChineseChess.exe -Recurse |
    Where-Object { $_.FullName -match '[\\/]x64[\\/]Release[\\/]' } |
    Select-Object -First 1
if (-not $Exe) { throw 'Windows release executable not found' }
$Stage = Join-Path $env:RUNNER_TEMP 'chinesechess-windows'
New-Item -ItemType Directory -Force $Stage | Out-Null
Copy-Item (Join-Path $Exe.DirectoryName '*') $Stage -Recurse -Force
if (-not (Test-Path (Join-Path $Stage 'Bundle/index.windows.bundle'))) {
    Copy-Item windows/ChineseChess/Bundle (Join-Path $Stage 'Bundle') -Recurse -Force
}
Get-ChildItem $Stage -Filter '*.pdb' -Recurse | Remove-Item
New-Item -ItemType Directory -Force release-artifacts | Out-Null
Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath "release-artifacts/chinesechess-$env:APP_VERSION-windows-x64-unsigned.zip" -Force
"Windows: x64 portable ZIP, unsigned" | Out-File -Append $env:GITHUB_STEP_SUMMARY
