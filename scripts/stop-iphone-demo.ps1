# ==============================================================================
# STOP IPHONE 14 PLUS DEMO PROCESSES
# KwanFam26022005/production-meter-reading
# ==============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
$PidFile = Join-Path $ProjectRoot ".demo_pids.json"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Stopping CSG iPhone Demo Mode Processes...      " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not (Test-Path $PidFile)) {
    Write-Host "No tracked .demo_pids.json file found." -ForegroundColor Yellow
    Write-Host "If you started services manually, please close their respective terminal windows (Ctrl+C)." -ForegroundColor Gray
    exit 0
}

try {
    $PidsData = Get-Content -Path $PidFile -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Write-Warning "Failed to parse .demo_pids.json. Removing corrupted file."
    Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue
    exit 0
}

function Stop-TrackedProcess {
    param([int]$ProcessId, [string]$Name)
    if ($ProcessId -gt 0) {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping $Name (PID: $ProcessId)..." -ForegroundColor White
            # Stop any child processes of the tracked process (e.g. node spawned by cmd)
            try {
                Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue | ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }
            } catch {}
            Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
            Write-Host "[STOPPED] $Name (PID: $ProcessId)" -ForegroundColor Green
        } else {
            Write-Host "[INACTIVE] $Name (PID: $ProcessId already terminated)" -ForegroundColor Gray
        }
    }
}

if ($PidsData.backend_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.backend_pid -Name "FastAPI Backend"
}

if ($PidsData.frontend_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.frontend_pid -Name "Vite Frontend"
}

if ($PidsData.cloudflared_pid) {
    Stop-TrackedProcess -ProcessId $PidsData.cloudflared_pid -Name "Cloudflared Tunnel"
}

Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue
Write-Host "`nAll tracked iPhone demo processes have been cleanly terminated." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
