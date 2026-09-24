param (
    [switch]$Tunnel
)

$ErrorActionPreference = "Stop"

# Determine project root and runtime root
$IntegrationRoot = Split-Path $PSScriptRoot -Parent
$ProjectRoot = Split-Path $IntegrationRoot -Parent

if (-not $env:PMR_RUNTIME_ROOT) {
    $env:PMR_RUNTIME_ROOT = Join-Path $ProjectRoot '.runtime'
}
$RuntimeRoot = $env:PMR_RUNTIME_ROOT

Write-Host "Using Runtime Root: $RuntimeRoot" -ForegroundColor Cyan

# Validate and ensure runtime root directories exist
$Dirs = @("data", "evidence", "attendance", "training", "state")
foreach ($dir in $Dirs) {
    $path = Join-Path $RuntimeRoot $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

$PidFile = Join-Path $RuntimeRoot "state\dev-pids.json"
$OwnedPids = @{}
if (Test-Path $PidFile) {
    $OwnedPids = Get-Content $PidFile -Raw | ConvertFrom-Json -AsHashtable
}

function Check-Port {
    param([int]$Port, [string]$Name)
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        $pidOwner = $connection.OwningProcess
        $isOwned = $false
        if ($OwnedPids.Values -contains $pidOwner) {
            $isOwned = $true
        }
        
        if ($isOwned) {
            Write-Host "Port $Port ($Name) is in use by a known process (PID: $pidOwner). Please run stop-dev.ps1 first." -ForegroundColor Red
        } else {
            Write-Host "Port $Port ($Name) is in use by an UNKNOWN process (PID: $pidOwner). Cannot start." -ForegroundColor Red
        }
        exit 1
    }
}

Write-Host "Checking ports..."
Check-Port 8000 "Backend"
Check-Port 5173 "User Frontend"
Check-Port 5174 "Ops Frontend"

$NewPids = @{}

# Change to integration root for commands
Set-Location $IntegrationRoot

Write-Host "Starting Backend..."
$BackendProc = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000" -PassThru -NoNewWindow
$NewPids["backend"] = $BackendProc.Id

Write-Host "Waiting for backend to be healthy..."
$MaxWait = 30
$Healthy = $false
for ($i = 0; $i -lt $MaxWait; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get -ErrorAction Stop
        if ($resp.status -eq "ok") {
            $Healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $Healthy) {
    Write-Host "Backend failed to start or did not become healthy in time." -ForegroundColor Red
    Stop-Process -Id $BackendProc.Id -Force
    exit 1
}

Write-Host "Validating API capabilities..."
try {
    # Check if the overview endpoint is registered (will return 401 or 403 or 405 if it exists but requires auth, 404 if not exists)
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/admin/reports/operations/overview" -Method Options -UseBasicParsing -ErrorAction Stop
    Write-Host "API capabilities validated." -ForegroundColor Green
} catch [System.Net.WebException] {
    $statusCode = [int]$_.Exception.Response.StatusCode
    if ($statusCode -eq 404) {
        Write-Host "Warning: API capability /api/v1/admin/reports/operations/overview returned 404." -ForegroundColor Yellow
    } else {
        Write-Host "API capabilities validated (HTTP $statusCode)." -ForegroundColor Green
    }
} catch {
    Write-Host "Failed to validate API capabilities: $_" -ForegroundColor Yellow
}

Write-Host "Starting Frontends..."
$UserProc = Start-Process -FilePath "npm" -ArgumentList "--prefix", "frontend", "run", "dev:user" -PassThru -NoNewWindow
$NewPids["user_frontend"] = $UserProc.Id

$OpsProc = Start-Process -FilePath "npm" -ArgumentList "--prefix", "frontend", "run", "dev:operations" -PassThru -NoNewWindow
$NewPids["ops_frontend"] = $OpsProc.Id

if ($Tunnel) {
    Write-Host "Starting Cloudflare Tunnels..."
    $UserTunnel = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:5173" -PassThru -NoNewWindow
    $NewPids["user_tunnel"] = $UserTunnel.Id
    
    $OpsTunnel = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:5174" -PassThru -NoNewWindow
    $NewPids["ops_tunnel"] = $OpsTunnel.Id
}

$NewPids | ConvertTo-Json | Set-Content $PidFile

Write-Host "`nDevelopment Environment Running!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000"
Write-Host "User App: http://localhost:5173"
Write-Host "Ops App: http://localhost:5174"
if ($Tunnel) {
    Write-Host "Cloudflare tunnels are running. Check output for public URLs."
}
Write-Host "`nPress Ctrl+C to exit (Use stop-dev.ps1 to cleanly stop processes)" -ForegroundColor Cyan

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Exiting. Run scripts\stop-dev.ps1 to clean up processes." -ForegroundColor Yellow
}
