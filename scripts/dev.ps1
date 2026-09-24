# ==============================================================================
# UNIFIED DEVELOPMENT RUNTIME LAUNCHER (DX-02)
# Production Meter Reading - Saigon Port
# Compatible with Windows PowerShell 5.1 and pwsh
# ==============================================================================
[CmdletBinding()]
param (
    [switch]$Tunnel,
    [int]$BackendPort = 8000,
    [int]$UserPort = 5173,
    [int]$OpsPort = 5174,
    [switch]$NonInteractive,
    [ValidateSet("", "user", "operations")]
    [string]$QualificationFailure = ""
)

$ErrorActionPreference = "Stop"

# Import helper library
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HelpersPath = Join-Path $ScriptDir "dev-runtime-helpers.ps1"
if (-not (Test-Path $HelpersPath)) {
    throw "Helper script dev-runtime-helpers.ps1 not found at $HelpersPath"
}
. $HelpersPath

# 1. Resolve project paths and runtime directories
$Paths = Resolve-ProjectPaths -ScriptPath $MyInvocation.MyCommand.Path
$IntegrationRoot = $Paths.IntegrationRoot
$ProjectRoot = $Paths.ProjectRoot
$RuntimeRoot = $Paths.RuntimeRoot
$PidFile = $Paths.PidFile
$LockFile = $Paths.LockFile

Ensure-RuntimeDirectories -RuntimeRoot $RuntimeRoot
$env:PMR_RUNTIME_ROOT = $RuntimeRoot
$env:VITE_BACKEND_URL = "http://127.0.0.1:$BackendPort"
if ($Tunnel) { $env:VITE_TUNNEL = "1" }
if ($QualificationFailure -and ($BackendPort -ne 18000 -or $UserPort -ne 15173 -or $OpsPort -ne 15174)) {
    throw "Failure injection is restricted to qualification ports."
}
if (@($BackendPort, $UserPort, $OpsPort | Select-Object -Unique).Count -ne 3) {
    throw "Service ports must be distinct."
}

# 2. Concurrency protection
$lockAcquired = Acquire-DevLock -LockFile $LockFile
if (-not $lockAcquired) {
    exit 1
}

$StartedProcesses = New-Object System.Collections.Generic.List[int]

try {
    # 3. Resolve execution environments
    $NpmCmd = Resolve-NpmCommand
    $PythonExe = Resolve-PythonExecutable -ProjectRoot $ProjectRoot -IntegrationRoot $IntegrationRoot
    $PythonVersion = (& $PythonExe --version 2>&1).ToString().Trim()

    $GitBranch = ""
    $GitSha = ""
    try {
        $GitBranch = (git -C $IntegrationRoot branch --show-current 2>$null).Trim()
        $GitSha = (git -C $IntegrationRoot rev-parse HEAD 2>$null).Trim()
    } catch {}

    # 4. Port and existing stack evaluation
    $ExistingState = Get-DevState -PidFile $PidFile
    $PortsToCheck = @(
        @{ Port = $BackendPort; Name = "Backend"; Role = "backend" },
        @{ Port = $UserPort; Name = "User Frontend"; Role = "user_frontend" },
        @{ Port = $OpsPort; Name = "Ops Frontend"; Role = "operations_frontend" }
    )

    # Check if a healthy current stack already exists
    if ($ExistingState) {
        $allRunning = $true
        foreach ($item in $PortsToCheck) {
            $lPid = Get-PortListenerProcess -Port $item.Port
            $record = $ExistingState.($item.Role)
            if (-not $lPid -or $record.port -ne $item.Port -or
                $lPid -ne $record.listener_pid -or -not (Test-RecordedService $record) -or
                $ExistingState.source_worktree -ne $IntegrationRoot -or
                $ExistingState.runtime_root -ne $RuntimeRoot -or $ExistingState.git_sha -ne $GitSha) {
                $allRunning = $false
                break
            }
        }

        if ($allRunning) {
            # Validate health of running stack
            $bOk = $false
            try {
                $h = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
                if ($h.status -eq "ok") { $bOk = $true }
            } catch {}

            $uOk = $false
            try {
                $u = Invoke-WebRequest -Uri "http://127.0.0.1:$UserPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($u.StatusCode -eq 200) { $uOk = $true }
            } catch {}

            $oOk = $false
            try {
                $o = Invoke-WebRequest -Uri "http://127.0.0.1:$OpsPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($o.StatusCode -eq 200) { $oOk = $true }
            } catch {}

            if ($bOk -and $uOk -and $oOk) {
                $schema = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/openapi.json" -TimeoutSec 3
                foreach ($required in @("/api/v1/admin/reports/operations/overview", "/api/v1/admin/reports/usage/overview")) {
                    if (-not $schema.paths.PSObject.Properties[$required]) { throw "Current API capability missing: $required" }
                }
                Write-Host "Development stack already running." -ForegroundColor Green
                Write-Host "Backend API:      http://127.0.0.1:$BackendPort (PID: $($ExistingState.backend.root_pid))"
                Write-Host "User App:         http://localhost:$UserPort (PID: $($ExistingState.user_frontend.root_pid))"
                Write-Host "Operations App:   http://localhost:$OpsPort (PID: $($ExistingState.operations_frontend.root_pid))"
                Release-DevLock -LockFile $LockFile
                exit 0
            }
        }

        # If state file exists but stack is not fully healthy, treat as STALE_RECORDED_STACK
        Write-Host "Detected stale or incomplete recorded stack state. Cleaning stale processes..." -ForegroundColor Yellow
        foreach ($role in @("backend", "user_frontend", "operations_frontend", "user_tunnel", "operations_tunnel")) {
            Stop-RecordedService -Service $ExistingState.$role -Name "Stale $role"
        }
        Remove-DevState -PidFile $PidFile
        Start-Sleep -Seconds 1
    }

    # Verify ports are FREE. If any port has an UNKNOWN owner, fail immediately without touching it.
    foreach ($item in $PortsToCheck) {
        $ownerPid = Get-PortListenerProcess -Port $item.Port
        if ($ownerPid) {
            Write-Host "Port $($item.Port) ($($item.Name)) is occupied by an unowned process." -ForegroundColor Red
            Write-Host "PID: $ownerPid" -ForegroundColor Red
            Write-Host "No process was terminated." -ForegroundColor Red
            Release-DevLock -LockFile $LockFile
            exit 1
        }
    }

    # 5. Start Backend
    Write-Host "Starting Backend on 127.0.0.1:$BackendPort..." -ForegroundColor Cyan
    $BackendProc = Start-LoggedService -FilePath $PythonExe `
        -Arguments "-m uvicorn backend.app.main:app --host 127.0.0.1 --port $BackendPort" `
        -WorkingDirectory $IntegrationRoot -RuntimeRoot $RuntimeRoot -LogName "backend"

    if (-not $BackendProc -or -not $BackendProc.Id) {
        throw "Failed to spawn Backend process with $PythonExe"
    }

    $BackendRootPid = $BackendProc.Id
    $StartedProcesses.Add($BackendRootPid)

    # 6. Verify Backend Listener Ownership & Health
    Write-Host "Waiting for backend listener and health..."
    $MaxWaitSec = 30
    $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $BackendReady = $false
    $BackendListenerPid = $null

    while ($Stopwatch.Elapsed.TotalSeconds -lt $MaxWaitSec) {
        # Check if root process crashed
        $rootCheck = Get-Process -Id $BackendRootPid -ErrorAction SilentlyContinue
        if (-not $rootCheck) {
            throw "Backend process PID $BackendRootPid terminated prematurely before binding port $BackendPort."
        }

        $listenerPid = Get-PortListenerProcess -Port $BackendPort
        if ($listenerPid) {
            # Ownership verification (DX-02D requirement)
            $isOwned = Test-ProcessOwnedByTree -TargetPid $listenerPid -RootPid $BackendRootPid
            if (-not $isOwned) {
                throw "Port $BackendPort became active, but listener PID $listenerPid is not owned by backend root PID $BackendRootPid. Startup aborted without touching PID $listenerPid."
            }
            $BackendListenerPid = $listenerPid

            # Verify /health
            try {
                $hResp = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
                if ($hResp.status -eq "ok") {
                    $BackendReady = $true
                    break
                }
            } catch {
                # Still initializing app
            }
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $BackendReady) {
        throw "Backend service failed to become healthy on http://127.0.0.1:$BackendPort within $MaxWaitSec seconds."
    }

    # 7. Validate API capabilities via OpenAPI
    Write-Host "Validating API capabilities via /openapi.json..."
    try {
        $openapi = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/openapi.json" -Method Get -TimeoutSec 3 -ErrorAction Stop
        $paths = @($openapi.paths.PSObject.Properties.Name)
        $requiredPaths = @(
            "/api/v1/admin/reports/operations/overview",
            "/api/v1/admin/reports/usage/overview"
        )
        $missing = @()
        foreach ($rp in $requiredPaths) {
            if (-not ($paths -contains $rp)) {
                $missing += $rp
            }
        }
        if ($missing.Count -gt 0) {
            throw "Missing required reporting routes in OpenAPI: $($missing -join ', ')"
        }
        $ApiCapability = "COMPATIBLE"
    } catch {
        throw "Backend API capability probe failed: $_"
    }

    # 8. Start User Frontend
    Write-Host "Starting User Frontend on port $UserPort..." -ForegroundColor Cyan
    $frontendScript = "dev:user"
    if ($QualificationFailure -eq "user") { $frontendScript = "dev:qualification-missing" }
    $UserProc = Start-LoggedService -FilePath $NpmCmd `
        -Arguments "--prefix frontend run $frontendScript -- --port $UserPort --strictPort" `
        -WorkingDirectory $IntegrationRoot -RuntimeRoot $RuntimeRoot -LogName "user-vite"

    if (-not $UserProc -or -not $UserProc.Id) {
        throw "Failed to spawn User Frontend using $NpmCmd"
    }

    $UserRootPid = $UserProc.Id
    $StartedProcesses.Add($UserRootPid)

    # 9. Wait for User Frontend readiness
    Write-Host "Waiting for User Frontend on http://127.0.0.1:$UserPort..."
    $Stopwatch.Restart()
    $UserReady = $false
    $UserListenerPid = $null

    while ($Stopwatch.Elapsed.TotalSeconds -lt $MaxWaitSec) {
        $uProcCheck = Get-Process -Id $UserRootPid -ErrorAction SilentlyContinue
        if (-not $uProcCheck) {
            throw "User frontend process PID $UserRootPid terminated prematurely."
        }

        $uListener = Get-PortListenerProcess -Port $UserPort
        if ($uListener) {
            if (-not (Test-ProcessOwnedByTree -TargetPid $uListener -RootPid $UserRootPid)) {
                throw "Unowned listener on port $UserPort; preserving it."
            }
            $UserListenerPid = $uListener
            try {
                $uResp = Invoke-WebRequest -Uri "http://127.0.0.1:$UserPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($uResp.StatusCode -eq 200) {
                    $UserReady = $true
                    break
                }
            } catch {}
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $UserReady) {
        throw "User frontend failed to become ready on http://127.0.0.1:$UserPort within $MaxWaitSec seconds."
    }

    # 10. Start Operations Frontend
    Write-Host "Starting Operations Frontend on port $OpsPort..." -ForegroundColor Cyan
    $frontendScript = "dev:operations"
    if ($QualificationFailure -eq "operations") { $frontendScript = "dev:qualification-missing" }
    $OpsProc = Start-LoggedService -FilePath $NpmCmd `
        -Arguments "--prefix frontend run $frontendScript -- --port $OpsPort --strictPort" `
        -WorkingDirectory $IntegrationRoot -RuntimeRoot $RuntimeRoot -LogName "operations-vite"

    if (-not $OpsProc -or -not $OpsProc.Id) {
        throw "Failed to spawn Operations Frontend using $NpmCmd"
    }

    $OpsRootPid = $OpsProc.Id
    $StartedProcesses.Add($OpsRootPid)

    # 11. Wait for Operations Frontend readiness
    Write-Host "Waiting for Operations Frontend on http://127.0.0.1:$OpsPort..."
    $Stopwatch.Restart()
    $OpsReady = $false
    $OpsListenerPid = $null

    while ($Stopwatch.Elapsed.TotalSeconds -lt $MaxWaitSec) {
        $oProcCheck = Get-Process -Id $OpsRootPid -ErrorAction SilentlyContinue
        if (-not $oProcCheck) {
            throw "Operations frontend process PID $OpsRootPid terminated prematurely."
        }

        $oListener = Get-PortListenerProcess -Port $OpsPort
        if ($oListener) {
            if (-not (Test-ProcessOwnedByTree -TargetPid $oListener -RootPid $OpsRootPid)) {
                throw "Unowned listener on port $OpsPort; preserving it."
            }
            $OpsListenerPid = $oListener
            try {
                $oResp = Invoke-WebRequest -Uri "http://127.0.0.1:$OpsPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($oResp.StatusCode -eq 200) {
                    $OpsReady = $true
                    break
                }
            } catch {}
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $OpsReady) {
        throw "Operations frontend failed to become ready on http://127.0.0.1:$OpsPort within $MaxWaitSec seconds."
    }

    # 12. Optional Cloudflare tunnels
    $UserTunnelRecord = $null
    $OpsTunnelRecord = $null
    if ($Tunnel) {
        $uTunnelProc = Start-LoggedService -FilePath "cloudflared" -Arguments "tunnel --url http://localhost:$UserPort" `
            -WorkingDirectory $IntegrationRoot -RuntimeRoot $RuntimeRoot -LogName "user-tunnel"
        $StartedProcesses.Add($uTunnelProc.Id)
        $UserTunnelRecord = Get-OwnedServiceRecord -RootPid $uTunnelProc.Id -LogName "user-tunnel"
        $oTunnelProc = Start-LoggedService -FilePath "cloudflared" -Arguments "tunnel --url http://localhost:$OpsPort" `
            -WorkingDirectory $IntegrationRoot -RuntimeRoot $RuntimeRoot -LogName "operations-tunnel"
        $StartedProcesses.Add($oTunnelProc.Id)
        $OpsTunnelRecord = Get-OwnedServiceRecord -RootPid $oTunnelProc.Id -LogName "operations-tunnel"
    }

    # 13. Check OCR model readiness
    $OcrStatus = Check-OCRModelReadiness -IntegrationRoot $IntegrationRoot

    # 14. Atomically persist state file
    $FinalState = [ordered]@{
        runtime_root = $RuntimeRoot
        launcher_pid = $PID
        start_timestamp = (Get-Date).ToString("o")
        source_worktree = $IntegrationRoot
        git_branch = $GitBranch
        git_sha = $GitSha
        python_executable = $PythonExe
        python_version = $PythonVersion
        npm_command = $NpmCmd
        backend = Get-OwnedServiceRecord -RootPid $BackendRootPid -ListenerPid $BackendListenerPid -Port $BackendPort -LogName "backend"
        user_frontend = Get-OwnedServiceRecord -RootPid $UserRootPid -ListenerPid $UserListenerPid -Port $UserPort -LogName "user-vite"
        operations_frontend = Get-OwnedServiceRecord -RootPid $OpsRootPid -ListenerPid $OpsListenerPid -Port $OpsPort -LogName "operations-vite"
        user_tunnel = $UserTunnelRecord
        operations_tunnel = $OpsTunnelRecord
    }
    $FinalState.backend.capability = $ApiCapability
    foreach ($role in @("backend", "user_frontend", "operations_frontend")) {
        if (-not (Test-RecordedService $FinalState.$role)) { throw "Service identity unavailable: $role" }
    }

    Save-DevStateAtomic -PidFile $PidFile -StateData $FinalState

    # Release startup lock
    Release-DevLock -LockFile $LockFile

    Write-Host "Development stack READY." -ForegroundColor Green
    Write-Host "Source: $IntegrationRoot ($GitBranch @ $GitSha)"
    Write-Host "Runtime: $RuntimeRoot | Database: $($Paths.DataDb)"
    Write-Host "Python: $PythonExe ($PythonVersion) | npm: $NpmCmd"
    Write-Host "Backend READY: http://127.0.0.1:$BackendPort (root $BackendRootPid, listener $BackendListenerPid; API $ApiCapability)"
    Write-Host "User READY: http://localhost:$UserPort (root $UserRootPid, listener $UserListenerPid)"
    Write-Host "Operations READY: http://localhost:$OpsPort (root $OpsRootPid, listener $OpsListenerPid)"
    Write-Host "Logs: $(Join-Path $RuntimeRoot 'logs')"
    Write-Host "OCR local inference: $OcrStatus"

} catch {
    $errMessage = $_.Exception.Message
    Write-Host ""
    Write-Host "FAILED: $errMessage" -ForegroundColor Red
    Write-Host ""
    Write-Host "Resolved npm:"
    Write-Host $NpmCmd
    Write-Host ""
    Write-Host "Cleanup:"

    # Transactional rollback: clean up ONLY processes spawned by THIS invocation
    for ($i = $StartedProcesses.Count - 1; $i -ge 0; $i--) {
        $pToClean = $StartedProcesses[$i]
        try {
            Stop-OwnedProcessTree -RootPid $pToClean -Name "Process $pToClean"
            Write-Host "  Stopped process tree PID $pToClean." -ForegroundColor Gray
        } catch {}
    }

    # Verify ports are freed
    Start-Sleep -Seconds 1
    $bStatus = if (Get-PortListenerProcess -Port $BackendPort) { "IN_USE" } else { "FREE" }
    $uStatus = if (Get-PortListenerProcess -Port $UserPort) { "IN_USE" } else { "FREE" }
    $oStatus = if (Get-PortListenerProcess -Port $OpsPort) { "IN_USE" } else { "FREE" }

    Write-Host ""
    Write-Host "Ports:"
    Write-Host "  $BackendPort $bStatus"
    Write-Host "  $UserPort $uStatus"
    Write-Host "  $OpsPort $oStatus"
    Write-Host ""
    Write-Host "Rollback attempted for this invocation only. See port status above and logs at $RuntimeRoot\logs." -ForegroundColor Yellow
    Write-Host ""

    Remove-DevState -PidFile $PidFile
    Release-DevLock -LockFile $LockFile
    exit 1
}
 finally {
    Release-DevLock -LockFile $LockFile
}
# Compatibility switch retained; every successful invocation now returns.
exit 0
