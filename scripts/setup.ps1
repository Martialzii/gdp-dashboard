param(
    [ValidateSet("typescript", "go", "both")]
    [string]$Choice
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not $Choice) {
    Write-Host "Choose dashboard implementation to set up:"
    Write-Host "  1) TypeScript / JavaScript"
    Write-Host "  2) Go"
    Write-Host "  3) Both"
    $selection = Read-Host "Selection [1-3]"
    switch ($selection) {
        "1" { $Choice = "typescript" }
        "2" { $Choice = "go" }
        "3" { $Choice = "both" }
        default { throw "Choose 1, 2, or 3." }
    }
}

function Get-Tool([string]$Name) {
    $tool = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $tool) {
        throw "$Name is required. Install the documented runtime and retry."
    }
    return $tool.Source
}

function Invoke-TypeScriptSetup {
    $node = Get-Tool "node.exe"
    $npm = Get-Tool "npm.cmd"
    $nodeMajor = [int](& $node -p "process.versions.node.split('.')[0]")
    if ($LASTEXITCODE -ne 0 -or $nodeMajor -lt 18) {
        throw "TypeScript setup requires Node.js 18 or newer."
    }
    & $npm --prefix (Join-Path $root "typescript-dashboard") ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
    & $npm --prefix (Join-Path $root "typescript-dashboard") run build
    if ($LASTEXITCODE -ne 0) { throw "The TypeScript dashboard build failed." }
}

function Invoke-GoSetup {
    $go = Get-Tool "go.exe"
    $versionText = & $go version
    if ($LASTEXITCODE -ne 0 -or $versionText -notmatch "go(\d+)\.(\d+)") {
        throw "Unable to determine Go version."
    }
    $goMajor = [int]$Matches[1]
    $goMinor = [int]$Matches[2]
    if ($goMajor -lt 1 -or ($goMajor -eq 1 -and $goMinor -lt 21)) {
        throw "Go setup requires Go 1.21 or newer."
    }
    $bin = Join-Path $root "bin"
    New-Item -ItemType Directory -Force -Path $bin | Out-Null
    Push-Location $root
    try {
        & $go build -o (Join-Path $bin "gdp-dashboard.exe") ./go-dashboard
        if ($LASTEXITCODE -ne 0) { throw "The Go dashboard build failed." }
    }
    finally {
        Pop-Location
    }
}

if ($Choice -eq "typescript" -or $Choice -eq "both") {
    Invoke-TypeScriptSetup
}
if ($Choice -eq "go" -or $Choice -eq "both") {
    Invoke-GoSetup
}

Write-Host ""
Write-Host "Setup complete. Start the selected dashboard with:"
if ($Choice -eq "typescript" -or $Choice -eq "both") {
    Write-Host "  cd typescript-dashboard; npm start  (http://localhost:3000)"
}
if ($Choice -eq "go" -or $Choice -eq "both") {
    Write-Host "  .\bin\gdp-dashboard.exe  (http://localhost:8080)"
}
