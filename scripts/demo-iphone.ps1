# ==============================================================================
# IPHONE 14 PLUS DEMO MODE LAUNCHER
# KwanFam26022005/production-meter-reading
# ==============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# 1. Determine Project Root safely
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
Set-Location $ProjectRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  CSG Production Meter Reading - iPhone Demo Mode " -ForegroundColor Cyan
Write-Host ("  Project Root: " + $ProjectRoot) -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan

# 2. Verify Python Virtual Environment & Python Executable
$PythonExe = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $SysPython = Get-Command python -ErrorAction SilentlyContinue
    if ($SysPython) {
        $PythonExe = $SysPython.Source
        Write-Warning "Local .venv\Scripts\python.exe not found. Using system Python: $PythonExe"
    } else {
        Write-Error "Python executable not found. Please create a virtual environment in .venv or ensure Python 3.11 is installed and in PATH."
        exit 1
    }
} else {
    Write-Host "[OK] Python environment found: $PythonExe" -ForegroundColor Green
}

# 3. Verify Node.js and npm
$NpmCmd = Get-Command npm -ErrorAction SilentlyContinue
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NpmCmd -or -not $NodeCmd) {
    Write-Error "Node.js and npm are required to run the frontend dev server. Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
} else {
    Write-Host "[OK] Node.js and npm runtime found." -ForegroundColor Green
}

# 4. Verify Cloudflared Quick Tunnel CLI
$CloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $CloudflaredCmd) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Yellow
    Write-Host "[MISSING PREREQUISITE] cloudflared CLI not found" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Yellow
    Write-Host "cloudflared is an external developer tool used to create a temporary HTTPS tunnel."
    Write-Host "Please install cloudflared using one of the following methods:"
    Write-Host "  Option A (winget): winget install --id Cloudflare.cloudflared -e"
    Write-Host "  Option B (GitHub): https://github.com/cloudflare/cloudflared/releases"
    Write-Host "After installing, open a new PowerShell window or ensure cloudflared is in your PATH."
    Write-Host "==================================================" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[OK] cloudflared CLI found: $($CloudflaredCmd.Source)" -ForegroundColor Green
}

# 5. Verify Frozen AI Models and Third-Party Dependencies
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
    Write-Host "==================================================" -ForegroundColor Red
    exit 1
} else {
    Write-Host "[OK] All required model files and PaddleOCR assets verified." -ForegroundColor Green
}

# 6. Verify Database & Directory Structure
$DataDir = Join-Path $ProjectRoot "data"
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

# Clean any existing tracked demo processes first
$PidFile = Join-Path $ProjectRoot ".demo_pids.json"
if (Test-Path $PidFile) {
    Write-Host "Previous demo process record found. Stopping existing demo instances..." -ForegroundColor Yellow
    & "$ScriptDir\stop-iphone-demo.ps1"
}

Write-Host ""
Write-Host "Starting services for iPhone Demo Mode..." -ForegroundColor Cyan

# 7. Launch Backend (FastAPI on 127.0.0.1:8000)
Write-Host "-> Launching FastAPI Backend on port 8000..." -ForegroundColor White
$BackendProcess = Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $ProjectRoot `
    -PassThru

# 8. Launch Frontend (Vite Dev Server on 5173 with same-origin proxy)
Write-Host "-> Launching Vite Frontend Dev Server on port 5173..." -ForegroundColor White
$FrontendDir = Join-Path $ProjectRoot "frontend"
$FrontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "set VITE_TUNNEL=1&& set VITE_API_BASE_URL=&& npm run dev" `
    -WorkingDirectory $FrontendDir `
    -PassThru

# 9. Wait for Backend and Frontend Services to be Fully Ready
Write-Host "-> Waiting for backend and frontend services to be ready..." -ForegroundColor Yellow
$BackendReady = $false
$FrontendReady = $false
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
    if (-not $FrontendReady) {
        try {
            $fResp = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($fResp.StatusCode -eq 200) {
                $FrontendReady = $true
                Write-Host "   [READY] Vite frontend is responding on port 5173." -ForegroundColor Green
            }
        } catch {}
    }
    if ($BackendReady -and $FrontendReady) {
        break
    }
    Start-Sleep -Milliseconds 500
}

if (-not $BackendReady -or -not $FrontendReady) {
    Write-Warning "One or more services did not respond within timeout, proceeding to launch cloudflared anyway..."
}

# 10. Launch Cloudflare Quick Tunnel (target: http://127.0.0.1:5173 with Host header)
Write-Host "-> Launching Cloudflare Quick Tunnel for port 5173 (HTTP/2)..." -ForegroundColor White
$CloudflareProcess = Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel", "--protocol", "http2", "--url", "http://127.0.0.1:5173", "--http-host-header", "localhost:5173" `
    -WorkingDirectory $ProjectRoot `
    -PassThru

# 11. Record PIDs for Clean & Targeted Process Termination
$TrackedPids = @{
    backend_pid = $BackendProcess.Id
    frontend_pid = $FrontendProcess.Id
    cloudflared_pid = $CloudflareProcess.Id
    created_at = (Get-Date).ToString("o")
}
$TrackedPids | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "                  IPHONE 14 PLUS DEMO READY!                        " -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host " 1. Check the opened Cloudflared terminal window and COPY your URL:" -ForegroundColor Yellow
Write-Host "    --> https://<subdomain>.trycloudflare.com" -ForegroundColor Cyan
Write-Host " 2. Open Safari on iPhone 14 Plus and navigate to that HTTPS URL." -ForegroundColor Yellow
Write-Host " 3. Sign in with employee credentials (e.g. NV001)." -ForegroundColor Yellow
Write-Host " 4. Allow Camera permission when Safari requests it." -ForegroundColor Yellow
Write-Host " 5. Test Live Attendance Selfie (front cam) and Meter OCR (rear cam)." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------------" -ForegroundColor Gray
Write-Host " To stop all demo processes cleanly, run:" -ForegroundColor White
Write-Host "    .\scripts\stop-iphone-demo.ps1" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
