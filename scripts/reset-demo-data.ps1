$ErrorActionPreference = "Stop"

$IntegrationRoot = Split-Path $PSScriptRoot -Parent
$ProjectRoot = Split-Path $IntegrationRoot -Parent

if (-not $env:PMR_RUNTIME_ROOT) {
    $env:PMR_RUNTIME_ROOT = Join-Path $ProjectRoot '.runtime'
}
$RuntimeRoot = $env:PMR_RUNTIME_ROOT

if (-not (Test-Path $RuntimeRoot)) {
    Write-Host "Runtime root $RuntimeRoot does not exist. Cannot reset data." -ForegroundColor Red
    exit 1
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $RuntimeRoot "backups\$Timestamp"

New-Item -ItemType Directory -Path $BackupDir | Out-Null

$DbPath = Join-Path $RuntimeRoot "data\app.db"
if (Test-Path $DbPath) {
    Write-Host "Backing up current database to $BackupDir..." -ForegroundColor Cyan
    Copy-Item -Path $DbPath -Destination $BackupDir -Force
}

Set-Location $IntegrationRoot

Write-Host "Resetting demo data (Tan Thuan V2)..." -ForegroundColor Cyan
$SeedProc = Start-Process -FilePath "python" -ArgumentList "scripts/seed_tan_thuan_demo_v2.py" -Wait -NoNewWindow -PassThru
if ($SeedProc.ExitCode -ne 0) {
    Write-Host "Error running seed script." -ForegroundColor Red
    exit $SeedProc.ExitCode
}

Write-Host "Auditing demo data..." -ForegroundColor Cyan
$AuditProc = Start-Process -FilePath "python" -ArgumentList "scripts/audit_demo_data_v2.py" -Wait -NoNewWindow -PassThru
if ($AuditProc.ExitCode -ne 0) {
    Write-Host "Error running audit script." -ForegroundColor Red
    exit $AuditProc.ExitCode
}

Write-Host "`nData reset and audit complete!" -ForegroundColor Green
Write-Host "Backup saved to: $BackupDir"
