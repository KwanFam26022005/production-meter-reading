<#
.SYNOPSIS
    Builds release artifacts for User Portal and Operations Portal independently.
.DESCRIPTION
    Creates versioned tarballs / zip archives for deployment and safe rollback.
#>

param (
    [string]$Target = "all",
    [string]$Version = (Get-Date -Format "yyyyMMdd-HHmmss")
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path "$ScriptDir\..\.."
$ArtifactsDir = "$RootDir\deployment\artifacts"

if (!(Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SAIGON PORT - FRONTEND ARTIFACT BUILDER ($Version)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($Target -in @("user", "all")) {
    Write-Host "[1/2] Building User Portal (Mobile-first PWA)..." -ForegroundColor Yellow
    npm --prefix "$RootDir\frontend" run build:user
    
    $UserDist = "$RootDir\frontend\dist\user"
    $UserZip = "$ArtifactsDir\user-web-$Version.zip"
    Compress-Archive -Path "$UserDist\*" -DestinationPath $UserZip -Force
    Write-Host "  -> Created User Portal Artifact: $UserZip" -ForegroundColor Green
}

if ($Target -in @("operations", "all")) {
    Write-Host "[2/2] Building Operations Portal (Desktop-first Admin)..." -ForegroundColor Yellow
    npm --prefix "$RootDir\frontend" run build:operations
    
    $OpsDist = "$RootDir\frontend\dist\operations"
    $OpsZip = "$ArtifactsDir\operations-web-$Version.zip"
    Compress-Archive -Path "$OpsDist\*" -DestinationPath $OpsZip -Force
    Write-Host "  -> Created Operations Portal Artifact: $OpsZip" -ForegroundColor Green
}

Write-Host ""
Write-Host "All requested artifacts built successfully!" -ForegroundColor Green
