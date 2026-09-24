# Stop only processes whose full recorded identity still matches.
# Windows PowerShell 5.1 and PowerShell 7.
[CmdletBinding()]
param([switch]$Force) # Compatibility only; never bypasses ownership checks.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "dev-runtime-helpers.ps1")
$Paths = Resolve-ProjectPaths -ScriptPath $MyInvocation.MyCommand.Path
if (-not (Acquire-DevLock -LockFile $Paths.LockFile)) { exit 1 }
try {
    $State = Get-DevState -PidFile $Paths.PidFile
    if (-not $State) {
        if (Test-Path $Paths.PidFile) { throw "Invalid state registry; preserved for inspection." }
        Write-Host "No development stack recorded. No process was terminated."
        exit 0
    }
    $roles = @("operations_tunnel", "user_tunnel", "operations_frontend", "user_frontend", "backend")
    foreach ($role in $roles) { Stop-RecordedService -Service $State.$role -Name $role }
    $remaining = @()
    foreach ($role in $roles) {
        foreach ($identity in @($State.$role.identities)) {
            if (Test-ProcessIdentityMatch $identity) { $remaining += $identity.process_id }
        }
    }
    if ($remaining.Count) { throw "Owned processes still active: $remaining. Registry retained." }
    $occupied = $false
    foreach ($role in @("backend", "user_frontend", "operations_frontend")) {
        if ($State.$role.port) {
            $ownerId = Get-PortListenerProcess -Port $State.$role.port
            if ($ownerId) {
                $occupied = $true
                Write-Host "Port $($State.$role.port): occupied by unowned PID $ownerId; preserved."
            } else { Write-Host "Port $($State.$role.port): FREE" }
        }
    }
    Remove-DevState -PidFile $Paths.PidFile
    if ($occupied) { exit 1 }
    Write-Host "Development stack stopped cleanly."
} catch {
    Write-Host "Stop failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Release-DevLock -LockFile $Paths.LockFile
}
exit 0
