# Real Windows process qualification. Run under Windows PowerShell 5.1.
[CmdletBinding()]
param()
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "dev-runtime-helpers.ps1")
$Paths = Resolve-ProjectPaths -ScriptPath $MyInvocation.MyCommand.Path
Ensure-RuntimeDirectories $Paths.RuntimeRoot
$script:Passed = 0
$script:Failed = 0
$script:Invocation = 0
$ports = @(18000, 15173, 15174)
function Assert-Test {
    param([string]$Name, [bool]$Condition, [string]$Details = "")
    if ($Condition) { $script:Passed++; Write-Host "[PASS] $Name" }
    else { $script:Failed++; Write-Host "[FAIL] $Name -- $Details" }
}
function Test-PortsFree {
    foreach ($port in $ports) { if (Get-PortListenerProcess $port) { return $false } }
    return $true
}
function Invoke-Launcher {
    param([string]$Script = "dev.ps1", [string]$Extra = "")
    $script:Invocation++
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = (Get-Command powershell.exe).Source
    $info.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $PSScriptRoot $Script) + '"'
    if ($Script -eq "dev.ps1") { $info.Arguments += ' -BackendPort 18000 -UserPort 15173 -OpsPort 15174 -NonInteractive' }
    $info.Arguments += " $Extra"
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    $null = $process.Start()
    $outTask = $process.StandardOutput.ReadToEndAsync()
    $errTask = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(120000)) {
        Stop-OwnedProcessTree -RootPid $process.Id -Name "Qualification launcher timeout"
        throw "Launcher exceeded 120 seconds."
    }
    $eof = $outTask.Wait(5000) -and $errTask.Wait(5000)
    if (-not $eof) { throw "Launcher exited but capture did not receive EOF." }
    $output = $outTask.Result + $errTask.Result
    $output | Set-Content (Join-Path $Paths.RuntimeRoot "logs\qualification-$($script:Invocation).log") -Encoding UTF8
    return @{ Code = $process.ExitCode; Output = $output }
}
function Assert-CleanStop {
    param([string]$Case)
    $result = Invoke-Launcher "stop-dev.ps1"
    Assert-Test "$Case stop exit 0" ($result.Code -eq 0) $result.Output
    Assert-Test "$Case ports released" (Test-PortsFree)
    Assert-Test "$Case registry removed" (-not (Test-Path $Paths.PidFile))
}
if (Test-Path $Paths.PidFile) { throw "Existing registry preserved. Stop its proven owned stack before qualification." }
if (-not (Test-PortsFree)) { throw "Qualification ports occupied; no process was terminated." }
try {
    Write-Host "CASE I: Windows PowerShell parser and runtime"
    Assert-Test "Windows PowerShell 5.1 runtime" ($PSVersionTable.PSVersion.Major -eq 5 -and $PSVersionTable.PSVersion.Minor -eq 1)
    foreach ($name in @("dev.ps1", "stop-dev.ps1", "dev-runtime-helpers.ps1", "test-dev-qualification.ps1")) {
        $errs = $null
        $null = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $name), [ref]$null, [ref]$errs)
        Assert-Test "5.1 AST: $name" ($errs.Count -eq 0) ($errs | Out-String)
    }
    Write-Host "CASE F: controlled unknown listener"
    $dummy = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 18000)
    try {
        $dummy.Start()
        $result = Invoke-Launcher
        Assert-Test "F rejects unknown owner" ($result.Code -ne 0 -and $result.Output -match "No process was terminated") $result.Output
        Assert-Test "F unknown owner survives" ((Get-PortListenerProcess 18000) -eq $PID)
        Assert-Test "F no registry" (-not (Test-Path $Paths.PidFile))
    } finally { $dummy.Stop() }
    Write-Host "CASE A: clean start and captured EOF"
    $result = Invoke-Launcher
    Assert-Test "A launcher returns 0 and EOF" ($result.Code -eq 0 -and $result.Output -match "Development stack READY") $result.Output
    $state = Get-DevState $Paths.PidFile
    Assert-Test "A canonical runtime" ($state.runtime_root -eq $Paths.RuntimeRoot)
    Assert-Test "A current API compatible" ($state.backend.capability -eq "COMPATIBLE")
    foreach ($role in @("backend", "user_frontend", "operations_frontend")) {
        Assert-Test "A $role ownership and registry" (Test-RecordedService $state.$role)
        Assert-Test "A $role listener" ((Get-PortListenerProcess $state.$role.port) -eq $state.$role.listener_pid)
        Assert-Test "A $role log files" ((Test-Path (Join-Path $Paths.RuntimeRoot "logs\$($state.$role.log_name).log")) -and (Test-Path (Join-Path $Paths.RuntimeRoot "logs\$($state.$role.log_name).err.log")))
    }
    foreach ($role in @("user_frontend", "operations_frontend")) {
        $command = (Get-ProcessIdentity $state.$role.listener_pid).command_line
        Assert-Test "A $role one authoritative port" (([regex]::Matches($command, '--port\s').Count -eq 1) -and $command -match "--port $($state.$role.port)") $command
        $health = Invoke-RestMethod "http://127.0.0.1:$($state.$role.port)/health" -TimeoutSec 5
        Assert-Test "A $role proxies selected backend" ($health.status -eq "ok")
    }
    Write-Host "CASE H: double start"
    $before = Get-Content $Paths.PidFile -Raw
    $result = Invoke-Launcher
    Assert-Test "H exits 0, already running" ($result.Code -eq 0 -and $result.Output -match "Development stack already running") $result.Output
    Assert-Test "H registry unchanged, no duplicate stack" ($before -ceq (Get-Content $Paths.PidFile -Raw))
    Write-Host "CASE B: clean stop"
    Assert-CleanStop "B"
    Write-Host "CASE C: second clean start"
    $result = Invoke-Launcher
    Assert-Test "C second start returns 0" ($result.Code -eq 0) $result.Output
    Assert-CleanStop "C"
    foreach ($scenario in @(@{ Case = 'D'; Role = 'user' }, @{ Case = 'E'; Role = 'operations' })) {
        Write-Host "CASE $($scenario.Case): actual npm launch failure ($($scenario.Role))"
        $result = Invoke-Launcher -Extra "-QualificationFailure $($scenario.Role)"
        Assert-Test "$($scenario.Case) failed launch" ($result.Code -ne 0 -and $result.Output -match "terminated prematurely") $result.Output
        Assert-Test "$($scenario.Case) backend started before failure" ($result.Output -match "Starting User Frontend")
        if ($scenario.Case -eq 'E') { Assert-Test "E User ready before Operations launch" ($result.Output -match "Starting Operations Frontend") }
        Assert-Test "$($scenario.Case) all partial ports released" (Test-PortsFree)
        Assert-Test "$($scenario.Case) no false registry" (-not (Test-Path $Paths.PidFile))
    }
    Write-Host "CASE G: stale registry and PID reuse protection"
    $identity = Get-ProcessIdentity $PID
    $identity.created_at = "2000-01-01T00:00:00.0000000Z"
    $fake = @{ backend = @{ root_pid = $PID; listener_pid = $PID; port = 18000; identities = @($identity) } }
    Save-DevStateAtomic -PidFile $Paths.PidFile -StateData $fake
    $result = Invoke-Launcher
    Assert-Test "G stale registry replaced safely" ($result.Code -eq 0 -and $result.Output -match "Detected stale") $result.Output
    Assert-Test "G unrelated reused PID preserved" ($null -ne (Get-Process -Id $PID -ErrorAction SilentlyContinue))
    Assert-CleanStop "G"
} catch {
    Assert-Test "Qualification infrastructure" $false $_.Exception.Message
} finally {
    $state = Get-DevState $Paths.PidFile
    if ($state -and $state.source_worktree -eq $Paths.IntegrationRoot -and $state.backend.port -eq 18000) {
        $cleanup = Invoke-Launcher "stop-dev.ps1"
        Assert-Test "Final owned cleanup" ($cleanup.Code -eq 0) $cleanup.Output
    }
}
Write-Host "QUALIFICATION SUMMARY: $script:Passed PASSED, $script:Failed FAILED"
if ($script:Failed) { exit 1 }
exit 0
