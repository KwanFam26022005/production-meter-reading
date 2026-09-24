# ==============================================================================
# DUAL PORTAL DEMO MODE LAUNCHER
# Production Meter Reading — Saigon Port
#
# Launches:
#   - Backend: FastAPI on 127.0.0.1:8000
#   - User Portal: Vite on 0.0.0.0:5173
#   - Operations Portal: Vite on 0.0.0.0:5174
#   - (Optional / Default) Cloudflare Quick Tunnels for 5173 and 5174
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$NoTunnel,
    [switch]$SkipModelCheck
)

$ErrorActionPreference = "Stop"

# 1. Determine Project Root safely
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
Set-Location $ProjectRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  CSG Production Meter Reading - Dual Portal Demo " -ForegroundColor Cyan
Write-Host ("  Project Root: " + $ProjectRoot) -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan

# 2. Verify Python Virtual Environment & Python Executable
$PythonExe = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $ParentVenv = Join-Path $ProjectRoot "..\production-meter-reading\.venv\Scripts\python.exe"
    if (Test-Path $ParentVenv) {
        $PythonExe = (Resolve-Path $ParentVenv).Path
    } else {
        $SysPython = Get-Command python -ErrorAction SilentlyContinue
        if ($SysPython) {
            $PythonExe = $SysPython.Source
            Write-Warning "Local .venv\Scripts\python.exe not found. Using system Python: $PythonExe"
        } else {
            Write-Error "Python executable not found. Please create a virtual environment in .venv or ensure Python 3.11 is installed and in PATH."
            exit 1
        }
    }
}
Write-Host "[OK] Python environment found: $PythonExe" -ForegroundColor Green

# 3. Verify Node.js and npm
$NpmCmd = Get-Command npm -ErrorAction SilentlyContinue
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NpmCmd -or -not $NodeCmd) {
    Write-Error "Node.js and npm are required to run the frontend dev server. Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
} else {
    Write-Host "[OK] Node.js and npm runtime found." -ForegroundColor Green
}

# 4. Verify Cloudflared Quick Tunnel CLI (if tunnel requested)
if (-not $NoTunnel) {
    $CloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if (-not $CloudflaredCmd) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Yellow
        Write-Host "[MISSING PREREQUISITE] cloudflared CLI not found" -ForegroundColor Yellow
        Write-Host "==================================================" -ForegroundColor Yellow
        Write-Host "cloudflared is an external developer tool used to create temporary HTTPS tunnels."
        Write-Host "Please install cloudflared using one of the following methods:"
        Write-Host "  Option A (winget): winget install --id Cloudflare.cloudflared -e"
        Write-Host "  Option B (GitHub): https://github.com/cloudflare/cloudflared/releases"
        Write-Host "After installing, open a new PowerShell window or ensure cloudflared is in your PATH."
        Write-Host "Tip: To run locally without tunnels, run: .\scripts\demo-portals.ps1 -NoTunnel"
        Write-Host "==================================================" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "[OK] cloudflared CLI found: $($CloudflaredCmd.Source)" -ForegroundColor Green
    }
}

# 5. Verify Frozen AI Models and Third-Party Dependencies (unless -SkipModelCheck)
if (-not $SkipModelCheck) {
    $RequiredModelPaths = @(
        "models\e2\best.pt",
        "models\ppocrv6_medium\inference",
        "models\ppocrv6_medium\meter_digits_dict.txt",
        "third_party\PaddleOCR"
    )

    $MissingModels = @()
    foreach ($mPath in $RequiredModelPaths) {
        $FullPath = Join-Path $ProjectRoot $mPath
        if (-not (Test-Path $FullPath)) {
            $MissingModels += $mPath
        }
    }

    if ($MissingModels.Count -gt 0) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Red
        Write-Host "[MISSING MODEL FILES / ASSETS]" -ForegroundColor Red
        Write-Host "==================================================" -ForegroundColor Red
        foreach ($missing in $MissingModels) {
            Write-Host "  - $missing" -ForegroundColor Red
        }
        Write-Host "Please place the required model weights as described in models\README.md"
        Write-Host "Or pass -SkipModelCheck if you are not testing OCR inference."
        Write-Host "==================================================" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "[OK] All required model files and PaddleOCR assets verified." -ForegroundColor Green
    }
} else {
    Write-Host "[SKIP] Model check skipped by parameter." -ForegroundColor Gray
}

# 6. Verify Database & Directory Structure
$DataDir = Join-Path $ProjectRoot "data"
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

$DemoDir = Join-Path $ProjectRoot ".demo"
if (-not (Test-Path $DemoDir)) {
    New-Item -ItemType Directory -Path $DemoDir -Force | Out-Null
}

# 7. Clean any existing tracked demo processes first
$PidFile = Join-Path $ProjectRoot ".demo_portals_pids.json"
if (Test-Path $PidFile) {
    Write-Host "Previous dual-portal demo process record found. Stopping existing instances..." -ForegroundColor Yellow
    & "$ScriptDir\stop-demo-portals.ps1"
}

Write-Host ""
Write-Host "Starting services for Dual Portal Demo Mode..." -ForegroundColor Cyan

# 8. Launch Backend (FastAPI on 127.0.0.1:8000)
$BackendProcess = $null
$BackendAlreadyRunning = $false
try {
    $checkB = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($checkB.StatusCode -eq 200) {
        $BackendAlreadyRunning = $true
        Write-Host "-> FastAPI Backend is already running on port 8000 (reusing existing instance)." -ForegroundColor Green
    }
} catch {}

if (-not $BackendAlreadyRunning) {
    Write-Host "-> Launching FastAPI Backend on port 8000..." -ForegroundColor White
    $BackendProcess = Start-Process -FilePath $PythonExe `
        -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000" `
        -WorkingDirectory $ProjectRoot `
        -PassThru
}

# 9. Launch User Portal (Vite Dev Server on 5173)
Write-Host "-> Launching Vite User Frontend on port 5173..." -ForegroundColor White
$FrontendDir = Join-Path $ProjectRoot "frontend"
$TunnelFlag = if ($NoTunnel) { "0" } else { "1" }
$UserProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "set VITE_TUNNEL=$TunnelFlag&& set VITE_API_BASE_URL=&& npm run dev:user" `
    -WorkingDirectory $FrontendDir `
    -PassThru

# 10. Launch Operations Portal (Vite Dev Server on 5174)
Write-Host "-> Launching Vite Operations Frontend on port 5174..." -ForegroundColor White
$OpsProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "set VITE_TUNNEL=$TunnelFlag&& set VITE_API_BASE_URL=&& npm run dev:operations" `
    -WorkingDirectory $FrontendDir `
    -PassThru

# 11. Wait for Backend and Frontend Services to be Fully Ready
Write-Host "-> Waiting for backend and frontend services to be ready..." -ForegroundColor Yellow
$BackendReady = $false
$UserReady = $false
$OpsReady = $false
$MaxAttempts = 40

for ($i = 1; $i -le $MaxAttempts; $i++) {
    if (-not $BackendReady) {
        try {
            $bResp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($bResp.StatusCode -eq 200) {
                $BackendReady = $true
                Write-Host "   [READY] FastAPI backend is responding on port 8000." -ForegroundColor Green
            }
        } catch {}
    }
    if (-not $UserReady) {
        try {
            $uResp = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($uResp.StatusCode -eq 200) {
                $UserReady = $true
                Write-Host "   [READY] User Portal frontend is responding on port 5173." -ForegroundColor Green
            }
        } catch {}
    }
    if (-not $OpsReady) {
        try {
            $oResp = Invoke-WebRequest -Uri "http://127.0.0.1:5174" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($oResp.StatusCode -eq 200) {
                $OpsReady = $true
                Write-Host "   [READY] Operations Portal frontend is responding on port 5174." -ForegroundColor Green
            }
        } catch {}
    }
    if ($BackendReady -and $UserReady -and $OpsReady) {
        break
    }
    Start-Sleep -Milliseconds 500
}

if (-not $BackendReady) {
    Write-Host "[ERROR] Backend service failed to start on http://127.0.0.1:8000/health" -ForegroundColor Red
    # Clean up started processes
    $CleanupPids = @{
        backend_pid = if ($BackendProcess) { $BackendProcess.Id } else { $null }
        user_frontend_pid = $UserProcess.Id
        operations_frontend_pid = $OpsProcess.Id
    }
    $CleanupPids | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8
    & "$ScriptDir\stop-demo-portals.ps1"
    exit 1
}

if (-not $UserReady) {
    Write-Warning "User Portal frontend did not respond within timeout on http://127.0.0.1:5173."
}
if (-not $OpsReady) {
    Write-Warning "Operations Portal frontend did not respond within timeout on http://127.0.0.1:5174."
}

# 12. Optional Cloudflare Quick Tunnels for User & Operations Portals
$UserCloudflareProcess = $null
$OpsCloudflareProcess = $null
$UserTunnelUrl = $null
$OpsTunnelUrl = $null
$UserLog = Join-Path $DemoDir "user-cloudflared.log"
$OpsLog = Join-Path $DemoDir "operations-cloudflared.log"

if (-not $NoTunnel) {
    # Remove previous log files
    Remove-Item -Path $UserLog -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $OpsLog -Force -ErrorAction SilentlyContinue

    Write-Host "-> Launching Cloudflare Quick Tunnel for User Portal (port 5173)..." -ForegroundColor White
    $UserCloudflareProcess = Start-Process -FilePath "cloudflared" `
        -ArgumentList "tunnel", "--protocol", "http2", "--url", "http://127.0.0.1:5173", "--http-host-header", "localhost:5173", "--logfile", $UserLog `
        -WorkingDirectory $ProjectRoot `
        -WindowStyle Hidden `
        -PassThru

    Write-Host "-> Launching Cloudflare Quick Tunnel for Operations Portal (port 5174)..." -ForegroundColor White
    $OpsCloudflareProcess = Start-Process -FilePath "cloudflared" `
        -ArgumentList "tunnel", "--protocol", "http2", "--url", "http://127.0.0.1:5174", "--http-host-header", "localhost:5174", "--logfile", $OpsLog `
        -WorkingDirectory $ProjectRoot `
        -WindowStyle Hidden `
        -PassThru

    Write-Host "-> Capturing Cloudflare tunnel URLs..." -ForegroundColor Yellow
    $CaptureAttempts = 40
    for ($i = 1; $i -le $CaptureAttempts; $i++) {
        if (-not $UserTunnelUrl -and (Test-Path $UserLog)) {
            try {
                $uLogContent = Get-Content -Path $UserLog -Raw -ErrorAction SilentlyContinue
                if ($uLogContent -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') {
                    $UserTunnelUrl = $Matches[0]
                }
            } catch {}
        }
        if (-not $OpsTunnelUrl -and (Test-Path $OpsLog)) {
            try {
                $oLogContent = Get-Content -Path $OpsLog -Raw -ErrorAction SilentlyContinue
                if ($oLogContent -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') {
                    $OpsTunnelUrl = $Matches[0]
                }
            } catch {}
        }
        if ($UserTunnelUrl -and $OpsTunnelUrl) {
            break
        }
        Start-Sleep -Milliseconds 500
    }
}

# 13. Record PIDs for Clean & Targeted Process Termination
$TrackedPids = [ordered]@{
    backend_pid = if ($BackendProcess) { $BackendProcess.Id } else { $null }
    user_frontend_pid = $UserProcess.Id
    operations_frontend_pid = $OpsProcess.Id
    user_cloudflared_pid = if ($UserCloudflareProcess) { $UserCloudflareProcess.Id } else { $null }
    operations_cloudflared_pid = if ($OpsCloudflareProcess) { $OpsCloudflareProcess.Id } else { $null }
    user_url = if ($UserTunnelUrl) { $UserTunnelUrl } else { "http://localhost:5173" }
    operations_url = if ($OpsTunnelUrl) { $OpsTunnelUrl } else { "http://localhost:5174" }
    created_at = (Get-Date).ToString("o")
}
$TrackedPids | ConvertTo-Json -Depth 4 | Set-Content -Path $PidFile -Encoding UTF8

# 14. Display Summary Information
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " CSG — DUAL PORTAL DEMO" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend" -ForegroundColor Cyan
Write-Host "[READY] http://127.0.0.1:8000" -ForegroundColor White
Write-Host ""
Write-Host "User Portal" -ForegroundColor Cyan
Write-Host "[READY] http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Operations Portal" -ForegroundColor Cyan
Write-Host "[READY] http://localhost:5174" -ForegroundColor White
Write-Host ""
if (-not $NoTunnel) {
    Write-Host "Cloudflare" -ForegroundColor Cyan
    if ($UserTunnelUrl) {
        Write-Host "[READY] User:" -ForegroundColor Green
        Write-Host "$UserTunnelUrl" -ForegroundColor Cyan
    } else {
        Write-Host "[TUNNEL_URL_NOT_CAPTURED] User (Check log: $UserLog)" -ForegroundColor Yellow
    }
    Write-Host ""
    if ($OpsTunnelUrl) {
        Write-Host "[READY] Operations/Admin:" -ForegroundColor Green
        Write-Host "$OpsTunnelUrl" -ForegroundColor Cyan
    } else {
        Write-Host "[TUNNEL_URL_NOT_CAPTURED] Operations/Admin (Check log: $OpsLog)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Cloudflare" -ForegroundColor Cyan
    Write-Host "[SKIPPED] (-NoTunnel specified)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "EMPLOYEE:" -ForegroundColor Yellow
Write-Host "Open USER PORTAL" -ForegroundColor White
Write-Host ""
Write-Host "ADMIN:" -ForegroundColor Yellow
Write-Host "Open OPERATIONS PORTAL" -ForegroundColor White
Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Stop:" -ForegroundColor Yellow
Write-Host ".\scripts\stop-demo-portals.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
