$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot
$AIRuntime = @(
    (Join-Path $ProjectRoot 'AI/lib-dist/windows/x64/ai_engine.dll'),
    (Join-Path $ProjectRoot 'AI/lib-dist/model.nnue')
)
foreach ($Source in $AIRuntime) {
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "AI build output missing: $Source. Run scripts/build-ai-engine-libs.ps1 first."
    }
}
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
if (Test-Path -LiteralPath $Stage) { Remove-Item -LiteralPath $Stage -Recurse -Force }
New-Item -ItemType Directory -Force $Stage | Out-Null
Copy-Item (Join-Path $Exe.DirectoryName '*') $Stage -Recurse -Force
# Package from the library build's canonical outputs, independently of the
# app project's OutDir/TargetDir and MSBuild's post-build copy target.
foreach ($Source in $AIRuntime) {
    Copy-Item -LiteralPath $Source -Destination $Stage -Force
}
foreach ($RuntimeFile in @('ai_engine.dll', 'model.nnue')) {
    if (-not (Test-Path -LiteralPath (Join-Path $Stage $RuntimeFile) -PathType Leaf)) {
        throw "Bundled AI missing: $RuntimeFile"
    }
}
Copy-Item licenses (Join-Path $Stage 'licenses') -Recurse -Force
# Bundle the redistributable CRT files so the installer needs no second download.
$VSWhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$VSRoot = & $VSWhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if ($LASTEXITCODE -ne 0 -or -not $VSRoot) { throw 'Visual C++ redistributable location not found' }
$CRTRoot = Get-ChildItem (Join-Path $VSRoot 'VC/Redist/MSVC') -Directory |
    Sort-Object Name -Descending | Select-Object -First 1
$CRTFiles = Get-ChildItem (Join-Path $CRTRoot.FullName 'x64/Microsoft.VC143.CRT') -Filter '*.dll'
if (-not $CRTFiles) { throw 'Visual C++ redistributable files not found' }
$CRTFiles | Copy-Item -Destination $Stage -Force
if (-not (Test-Path (Join-Path $Stage 'Bundle/index.windows.bundle'))) {
    Copy-Item windows/ChineseChess/Bundle (Join-Path $Stage 'Bundle') -Recurse -Force
}
Get-ChildItem $Stage -Filter '*.pdb' -Recurse | Remove-Item
New-Item -ItemType Directory -Force release-artifacts | Out-Null
Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath "release-artifacts/chinesechess-$env:APP_VERSION-windows-x64-unsigned.zip" -Force
$Compiler = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe'
if (-not (Test-Path $Compiler)) { throw 'Inno Setup 6 is required to produce the Windows installer' }
& $Compiler "/DAppVersion=$env:APP_VERSION" "/DSourceDir=$Stage" "/DOutputDir=$PWD/release-artifacts" scripts/ci/windows-installer.iss
if ($LASTEXITCODE -ne 0) { throw 'Windows installer compile failed' }
"Windows: x64 installer EXE + portable ZIP, bundled AI, unsigned" | Out-File -Append $env:GITHUB_STEP_SUMMARY
