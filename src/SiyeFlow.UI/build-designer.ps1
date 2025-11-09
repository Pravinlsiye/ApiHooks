# Build SiyeFlow Designer and copy to UI folder
# This script is run as a pre-build event for SiyeFlow.UI

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building SiyeFlow Designer..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get paths
$projectRoot = Split-Path -Parent $PSScriptRoot
$designerPath = Join-Path $projectRoot "siye-flow-designer"
$uiPath = Join-Path $PSScriptRoot "UI"

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
    
    # Remove old UI files before copying new ones
    Write-Host "Removing old UI files..." -ForegroundColor Yellow
    $oldFiles = @("workflow-designer.js", "styles.css")
    foreach ($file in $oldFiles) {
        $oldFilePath = Join-Path $uiPath $file
        if (Test-Path $oldFilePath) {
            Remove-Item $oldFilePath -Force
            Write-Host "  Removed: $file" -ForegroundColor Gray
        }
    }
    
    # Remove old _siyeflow subfolder if it exists
    $oldSubfolder = Join-Path $uiPath "_siyeflow"
    if (Test-Path $oldSubfolder) {
        Remove-Item $oldSubfolder -Recurse -Force
        Write-Host "  Removed: _siyeflow subfolder" -ForegroundColor Gray
    }
    
    # Copy built files (but preserve index.html if it exists - it's a template file)
    Write-Host "Copying built files to UI..." -ForegroundColor Yellow
    $indexHtmlPath = Join-Path $uiPath "index.html"
    $tempIndexPath = Join-Path $uiPath "index.html.tmp"
    $preserveIndexHtml = Test-Path $indexHtmlPath
    
    # Clean up any leftover temp files from previous failed builds
    if (Test-Path $tempIndexPath) {
        Write-Host "  Cleaning up leftover temp file..." -ForegroundColor Gray
        Remove-Item $tempIndexPath -Force
    }
    
    if ($preserveIndexHtml) {
        Write-Host "  Preserving existing index.html (template file)" -ForegroundColor Gray
        # Temporarily rename to preserve it
        Move-Item -Path $indexHtmlPath -Destination $tempIndexPath -Force
    }
    
    # Copy all files from dist
    Copy-Item -Path "dist\*" -Destination $uiPath -Recurse -Force
    
    # Restore index.html if it was preserved
    if ($preserveIndexHtml) {
        if (Test-Path $tempIndexPath) {
            Move-Item -Path $tempIndexPath -Destination $indexHtmlPath -Force
            Write-Host "  Restored index.html" -ForegroundColor Gray
        } else {
            Write-Host "  WARNING: index.html.tmp not found after copy!" -ForegroundColor Yellow
        }
    }
    
    # Verify index.html exists and is not empty
    if (Test-Path $indexHtmlPath) {
        $indexContent = Get-Content $indexHtmlPath -Raw
        if ([string]::IsNullOrWhiteSpace($indexContent)) {
            Write-Host "  ERROR: index.html is empty after build!" -ForegroundColor Red
            exit 1
        }
        Write-Host "  Verified: index.html exists and is valid" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: index.html missing after build!" -ForegroundColor Red
        exit 1
    }
    
    # Final cleanup: ensure no temp files remain
    if (Test-Path $tempIndexPath) {
        Write-Host "  WARNING: Cleaning up leftover temp file" -ForegroundColor Yellow
        Remove-Item $tempIndexPath -Force
    }
    
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

