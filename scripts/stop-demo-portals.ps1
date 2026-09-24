# ==============================================================================
# STOP DUAL PORTAL DEMO PROCESSES
# KwanFam26022005/production-meter-reading
# ==============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
$PidFile = Join-Path $ProjectRoot ".demo_portals_pids.json"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Stopping CSG Dual Portal Demo Processes...      " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not (Test-Path $PidFile)) {
    Write-Host "No tracked .demo_portals_pids.json file found." -ForegroundColor Yellow
    Write-Host "If you started services manually, please close their respective terminal windows (Ctrl+C)." -ForegroundColor Gray
    exit 0
}

try {
    $PidsData = Get-Content -Path $PidFile -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Write-Warning "Failed to parse .demo_portals_pids.json. Removing corrupted file."
    Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue
    exit 0
}

function Stop-TrackedProcess {
    param([int]$ProcessId, [string]$Name)
    if ($ProcessId -gt 0) {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping $Name (PID: $ProcessId)..." -ForegroundColor White
            # Stop any child processes of the tracked process (e.g. node/vite spawned by cmd)
            try {
                & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
            } catch {}
            try {
                Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue | ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }
            } catch {}
            $stillAlive = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
            if ($stillAlive) {
                Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
            }
            Write-Host "[STOPPED] $Name (PID: $ProcessId)" -ForegroundColor Green
        } else {
            Write-Host "[INACTIVE] $Name (PID: $ProcessId already terminated)" -ForegroundColor Gray
        }
    }
}

if ($PidsData.backend_owned -eq $true -and $PidsData.backend_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.backend_pid -Name "FastAPI Backend"
} elseif ($PidsData.backend_owned -eq $false) {
    Write-Host "[SURVIVED] FastAPI Backend (not owned by launcher, preserving active instance)" -ForegroundColor Gray
} elseif ($PidsData.backend_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.backend_pid -Name "FastAPI Backend"
}

if ($PidsData.user_frontend_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.user_frontend_pid -Name "User Portal (Vite)"
}

if ($PidsData.operations_frontend_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.operations_frontend_pid -Name "Operations Portal (Vite)"
}

if ($PidsData.user_cloudflared_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.user_cloudflared_pid -Name "User Cloudflared Tunnel"
}

if ($PidsData.operations_cloudflared_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.operations_cloudflared_pid -Name "Operations Cloudflared Tunnel"
}

Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue
Write-Host "`nAll tracked dual-portal demo processes have been cleanly terminated." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
