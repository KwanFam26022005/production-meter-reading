<#
.SYNOPSIS
    Performs independent rollback for User Portal or Operations Portal.
.DESCRIPTION
    Extracts a previously archived version into the active static serving directory.
    Zero downtime, does NOT restart backend, does NOT affect the other site.
#>

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("user", "operations")]
    [string]$Target,

    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path "$ScriptDir\..\.."
$ArtifactsDir = "$RootDir\deployment\artifacts"

$ZipFile = "$ArtifactsDir\$Target-web-$Version.zip"

if (!(Test-Path $ZipFile)) {
    Write-Error "Artifact archive not found: $ZipFile"
    exit 1
}

$DestDir = "$RootDir\frontend\dist\$Target"

Write-Host "============================================================" -ForegroundColor Red
Write-Host "  SAIGON PORT - INDEPENDENT FRONTEND ROLLBACK" -ForegroundColor Red
Write-Host "  Target: $Target Portal | Restoring Version: $Version" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red

# Safety Backup of current state
$BackupTime = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = "$RootDir\deployment\artifacts\pre-rollback-backup-$Target-$BackupTime"
if (Test-Path $DestDir) {
    Copy-Item -Path $DestDir -Destination $BackupDir -Recurse -Force
    Write-Host "Backed up current $Target directory to $BackupDir" -ForegroundColor Yellow
}

# Clear and restore
Remove-Item -Path "$DestDir\*" -Recurse -Force
Expand-Archive -Path $ZipFile -DestinationPath $DestDir -Force

Write-Host ""
Write-Host "[SUCCESS] $Target Portal rolled back to $Version without impacting other services." -ForegroundColor Green
