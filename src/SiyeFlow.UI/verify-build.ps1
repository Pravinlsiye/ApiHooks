# Build Verification Script
# Tests that the build process correctly preserves index.html

param(
    [string]$ProjectPath = "src\SiyeFlow.UI"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Verification Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$uiPath = Join-Path $ProjectPath "UI"
$indexHtmlPath = Join-Path $uiPath "index.html"
$tempIndexPath = Join-Path $uiPath "index.html.tmp"

# Test 1: Check if index.html exists
Write-Host "`nTest 1: Checking if index.html exists..." -ForegroundColor Yellow
if (-not (Test-Path $indexHtmlPath)) {
    Write-Host "  ❌ FAILED: index.html not found!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ PASSED: index.html exists" -ForegroundColor Green

# Test 2: Check if index.html is not empty
Write-Host "`nTest 2: Checking if index.html is not empty..." -ForegroundColor Yellow
$content = Get-Content $indexHtmlPath -Raw
if ([string]::IsNullOrWhiteSpace($content)) {
    Write-Host "  ❌ FAILED: index.html is empty!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ PASSED: index.html has content ($($content.Length) characters)" -ForegroundColor Green

# Test 3: Check if index.html contains template markers
Write-Host "`nTest 3: Checking if index.html contains template markers..." -ForegroundColor Yellow
if ($content -notmatch "{{RoutePrefix}}") {
    Write-Host "  ⚠️  WARNING: index.html doesn't contain {{RoutePrefix}} marker" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ PASSED: Contains {{RoutePrefix}} marker" -ForegroundColor Green
}

# Test 4: Check for leftover temp files
Write-Host "`nTest 4: Checking for leftover temp files..." -ForegroundColor Yellow
if (Test-Path $tempIndexPath) {
    Write-Host "  ❌ FAILED: index.html.tmp found! This should be cleaned up." -ForegroundColor Red
    Write-Host "  Removing leftover temp file..." -ForegroundColor Yellow
    Remove-Item $tempIndexPath -Force
    exit 1
}
Write-Host "  ✅ PASSED: No leftover temp files" -ForegroundColor Green

# Test 5: Check required generated files exist
Write-Host "`nTest 5: Checking required generated files..." -ForegroundColor Yellow
$requiredFiles = @(
    "siye-flow-designer.umd.js",
    "style.css"
)

$allFound = $true
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $uiPath $file
    if (Test-Path $filePath) {
        Write-Host "  ✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
        $allFound = $false
    }
}

if (-not $allFound) {
    Write-Host "  ⚠️  WARNING: Some generated files are missing. Run build first." -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

