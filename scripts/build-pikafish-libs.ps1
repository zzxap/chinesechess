# Run on Windows with Visual Studio 2022 C++ x64 tools, CMake, and Python 3.
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BuildRoot = Join-Path $ProjectRoot 'Pikafish/lib-build/windows-x64'
$DistRoot = Join-Path $ProjectRoot 'Pikafish/lib-dist/windows/x64'
cmake -S (Join-Path $ProjectRoot 'native/pikafish') -B $BuildRoot -A x64 -DBUILD_SHARED_LIBS=ON
if ($LASTEXITCODE -ne 0) { throw 'CMake configure failed' }
cmake --build $BuildRoot --config Release --parallel 4
if ($LASTEXITCODE -ne 0) { throw 'Pikafish compile failed' }
New-Item -ItemType Directory -Force $DistRoot | Out-Null
Copy-Item (Join-Path $BuildRoot 'Release/pikafish.dll') $DistRoot
Copy-Item (Join-Path $BuildRoot 'Release/pikafish.lib') $DistRoot
$StaticBuildRoot = Join-Path $ProjectRoot 'Pikafish/lib-build/windows-x64-static'
cmake -S (Join-Path $ProjectRoot 'native/pikafish') -B $StaticBuildRoot -A x64 -DBUILD_SHARED_LIBS=OFF
if ($LASTEXITCODE -ne 0) { throw 'Static library configure failed' }
cmake --build $StaticBuildRoot --config Release --parallel 4
if ($LASTEXITCODE -ne 0) { throw 'Static library compile failed' }
Copy-Item (Join-Path $StaticBuildRoot 'Release/pikafish.lib') (Join-Path $DistRoot 'pikafish-static.lib')
$IncludeRoot = Join-Path $ProjectRoot 'Pikafish/lib-dist/include'
New-Item -ItemType Directory -Force $IncludeRoot | Out-Null
Copy-Item (Join-Path $ProjectRoot 'native/pikafish/include/pikafish.h') $IncludeRoot
python (Join-Path $ProjectRoot 'native/pikafish/package.py')
if ($LASTEXITCODE -ne 0) { throw 'Source/license packaging failed' }
