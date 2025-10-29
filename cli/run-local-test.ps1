# SiyeFlow Local Test Runner
# This script starts the test API and runs workflow tests

param(
    [switch]$SkipRestore,
    [switch]$DryRun,
    [string]$Flow = "flow-local-test.json"
)

Write-Host "SiyeFlow Local Test Runner" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "SiyeFlow.CLI" -PathType Container)) {
    Write-Host "Error: Please run this script from the 'cli' directory" -ForegroundColor Red
    exit 1
}

# Restore packages if needed
if (-not $SkipRestore) {
    Write-Host "`nRestoring packages..." -ForegroundColor Yellow
    
    Write-Host "Restoring SiyeFlow.CLI..." -ForegroundColor Gray
    Push-Location "SiyeFlow.CLI"
    dotnet restore --ignore-failed-sources
    Pop-Location
    
    Write-Host "Restoring SiyeFlow.TestApi..." -ForegroundColor Gray
    Push-Location "..\demo\api1"
    dotnet restore --ignore-failed-sources
    Pop-Location
}

# Build projects
Write-Host "`nBuilding projects..." -ForegroundColor Yellow

Write-Host "Building SiyeFlow.CLI..." -ForegroundColor Gray
Push-Location "SiyeFlow.CLI"
$buildResult = dotnet build --no-restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed for SiyeFlow.CLI" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

    Write-Host "Building SiyeFlow.TestApi..." -ForegroundColor Gray
    Push-Location "..\demo\api1"
$buildResult = dotnet build --no-restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed for SiyeFlow.TestApi" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Start the API in background
Write-Host "`nStarting Test API..." -ForegroundColor Green
$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Push-Location "..\demo\api1"
    dotnet run --no-build
}

# Wait for API to be ready
Write-Host "Waiting for API to start..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$apiReady = $false

while ($attempt -lt $maxAttempts -and -not $apiReady) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5216" -Method Get -ErrorAction SilentlyContinue
        if ($response) {
            $apiReady = $true
            Write-Host "API is ready!" -ForegroundColor Green
        }
    }
    catch {
        $attempt++
        Write-Host "." -NoNewline
    }
}

if (-not $apiReady) {
    Write-Host "`nAPI failed to start. Check the logs:" -ForegroundColor Red
    Receive-Job -Job $apiJob
    Stop-Job -Job $apiJob
    Remove-Job -Job $apiJob
    exit 1
}

Write-Host "`nAPI is running at:" -ForegroundColor Cyan
Write-Host "  HTTP:  http://localhost:5216" -ForegroundColor White
Write-Host "  HTTPS: https://localhost:7023" -ForegroundColor White
Write-Host "  Swagger: http://localhost:5216/swagger" -ForegroundColor White

# Run the CLI workflow
Write-Host "`nRunning workflow: $Flow" -ForegroundColor Yellow

Push-Location "SiyeFlow.CLI"

$cliArgs = @(
    "--api", "./samples/openapi-local.json",
    "--flow", "./samples/$Flow"
)

if ($DryRun) {
    $cliArgs += "--dry-run"
}

Write-Host "Executing: dotnet run -- $($cliArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

dotnet run -- @cliArgs

$cliExitCode = $LASTEXITCODE
Pop-Location

# Cleanup
Write-Host "`nStopping API..." -ForegroundColor Yellow
Stop-Job -Job $apiJob
Remove-Job -Job $apiJob

if ($cliExitCode -eq 0) {
    Write-Host "`nWorkflow completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nWorkflow failed with exit code: $cliExitCode" -ForegroundColor Red
}

exit $cliExitCode
