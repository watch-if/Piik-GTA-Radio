param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptHookSdk
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$sdk = (Resolve-Path -LiteralPath $ScriptHookSdk).Path
$header = Join-Path $sdk 'inc\main.h'
$lib = Join-Path $sdk 'lib\ScriptHookV.lib'
if (!(Test-Path -LiteralPath $header -PathType Leaf) -or !(Test-Path -LiteralPath $lib -PathType Leaf)) {
    throw 'The SDK path must contain inc\main.h and lib\ScriptHookV.lib.'
}
if ($env:VSCMD_ARG_TGT_ARCH -ne 'x64') {
    throw 'Run this script from the x64 Native Tools Command Prompt for Visual Studio.'
}
Get-Command npm.cmd, go.exe, cl.exe -ErrorAction Stop | Out-Null

$out = Join-Path $repo 'build\gta-radio'
[void][IO.Directory]::CreateDirectory($out)
Push-Location -LiteralPath $repo
try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    & npm.cmd run build:web
    if ($LASTEXITCODE -ne 0) { throw 'The Piik web build failed.' }

    $env:CGO_ENABLED = '0'
    $env:GOOS = 'windows'
    $env:GOARCH = 'amd64'
    & go.exe build -trimpath -o (Join-Path $out 'piik-radio.exe') ./cmd/piik-app
    if ($LASTEXITCODE -ne 0) { throw 'The Piik App build failed.' }

    $include = Join-Path $sdk 'inc'
    $source = Join-Path $PSScriptRoot 'PiikGtaRadio.cpp'
    $object = Join-Path $out 'PiikGtaRadio.obj'
    $plugin = Join-Path $out 'PiikGtaRadio.asi'
    & cl.exe /nologo /std:c++17 /EHsc /O2 /MT /LD "/I$include" "/Fo$object" $source $lib /link "/OUT:$plugin"
    if ($LASTEXITCODE -ne 0) { throw 'The GTA V plugin build failed.' }

    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Start-Piik-Radio.cmd') -Destination $out
    Write-Output "Build complete: $out"
} finally {
    Pop-Location
}
