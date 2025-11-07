# Build SiyeFlow Designer and copy to UI folder
# This script is run as a pre-build event for SiyeFlow.UI

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building SiyeFlow Designer..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get paths
$projectRoot = Split-Path -Parent $PSScriptRoot
$designerPath = Join-Path $projectRoot "siye-flow-designer"
$uiPath = Join-Path $PSScriptRoot "UI\_siyeflow"

# Check if designer directory exists
if (-not (Test-Path $designerPath)) {
    Write-Host "ERROR: Designer directory not found at: $designerPath" -ForegroundColor Red
    exit 1
}

# Navigate to designer directory
Push-Location $designerPath

try {
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
    }
    
    # Build the designer
    Write-Host "Building designer..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm build failed"
    }
    
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Create UI directory if it doesn't exist
    if (-not (Test-Path $uiPath)) {
        Write-Host "Creating UI directory: $uiPath" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $uiPath -Force | Out-Null
    }
    
    # Copy built files
    Write-Host "Copying built files to UI..." -ForegroundColor Yellow
    Copy-Item -Path "dist\*" -Destination $uiPath -Recurse -Force
    
    Write-Host "Files copied successfully!" -ForegroundColor Green
    
    # List copied files
    Write-Host "`nCopied files:" -ForegroundColor Cyan
    Get-ChildItem $uiPath | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Gray
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Designer build and copy completed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "`nERROR: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

exit 0

