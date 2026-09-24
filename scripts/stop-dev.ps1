$ErrorActionPreference = "Stop"

$IntegrationRoot = Split-Path $PSScriptRoot -Parent
$ProjectRoot = Split-Path $IntegrationRoot -Parent

if (-not $env:PMR_RUNTIME_ROOT) {
    $env:PMR_RUNTIME_ROOT = Join-Path $ProjectRoot '.runtime'
}
$RuntimeRoot = $env:PMR_RUNTIME_ROOT

$PidFile = Join-Path $RuntimeRoot "state\dev-pids.json"

if (-not (Test-Path $PidFile)) {
    Write-Host "No dev process state file found at $PidFile. Are they running?" -ForegroundColor Yellow
    exit 0
}

$Pids = Get-Content $PidFile -Raw | ConvertFrom-Json -AsHashtable

foreach ($key in $Pids.Keys) {
    $pidToKill = $Pids[$key]
    try {
        $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping $key (PID: $pidToKill)..."
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        } else {
            Write-Host "Process $key (PID: $pidToKill) is no longer running." -ForegroundColor Gray
        }
    } catch {
        Write-Host "Failed to stop process $key (PID: $pidToKill): $_" -ForegroundColor Red
    }
}

Remove-Item -Path $PidFile -Force
Write-Host "Development environment stopped successfully." -ForegroundColor Green
