# ==============================================================================
# DEV RUNTIME HELPERS (DX-02)
# Production Meter Reading - Saigon Port
# Compatible with Windows PowerShell 5.1 and PowerShell Core (pwsh)
# ==============================================================================

function Resolve-ProjectPaths {
    param([string]$ScriptPath)
    $scriptsDir = Split-Path -Parent (Resolve-Path $ScriptPath).Path
    $integrationRoot = (Resolve-Path "$scriptsDir\..").Path
    $projectRoot = (Resolve-Path "$integrationRoot\..").Path

    $runtimeRoot = $env:PMR_RUNTIME_ROOT
    if (-not $runtimeRoot) {
        $runtimeRoot = Join-Path $projectRoot ".runtime"
    }

    return @{
        ScriptsDir = $scriptsDir
        IntegrationRoot = $integrationRoot
        ProjectRoot = $projectRoot
        RuntimeRoot = $runtimeRoot
        StateDir = (Join-Path $runtimeRoot "state")
        PidFile = (Join-Path $runtimeRoot "state\dev-pids.json")
        LockFile = (Join-Path $runtimeRoot "state\dev.lock")
        DataDb = (Join-Path $runtimeRoot "data\app.db")
    }
}

function Ensure-RuntimeDirectories {
    param([string]$RuntimeRoot)
    $dirs = @("data", "evidence", "attendance", "training", "state", "logs")
    foreach ($d in $dirs) {
        $p = Join-Path $RuntimeRoot $d
        if (-not (Test-Path $p)) {
            New-Item -ItemType Directory -Path $p -Force | Out-Null
        }
    }
}

function Resolve-NpmCommand {
    # DX-02A: Windows command shim resolution
    $npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if ($npmCmd -and $npmCmd.Source) {
        return $npmCmd.Source
    }
    $generalNpm = Get-Command "npm" -ErrorAction SilentlyContinue
    if ($generalNpm -and $generalNpm.Source -and ($generalNpm.Source.ToLower().EndsWith(".cmd"))) {
        return $generalNpm.Source
    }
    throw "npm.cmd could not be resolved on this system. Node.js with npm.cmd is required in PATH."
}

function Resolve-PythonExecutable {
    param(
        [string]$ProjectRoot,
        [string]$IntegrationRoot
    )
    # DX-02E: Deterministic Python resolution
    # 1. Explicit runtime environment variable
    if ($env:PMR_PYTHON_EXE -and (Test-Path $env:PMR_PYTHON_EXE)) {
        return (Resolve-Path $env:PMR_PYTHON_EXE).Path
    }
    # 2. Virtual environment from active shell
    if ($env:VIRTUAL_ENV) {
        $activePy = Join-Path $env:VIRTUAL_ENV "Scripts\python.exe"
        if (Test-Path $activePy) {
            return (Resolve-Path $activePy).Path
        }
    }
    # 3. Local worktree .venv
    $localPy = Join-Path $IntegrationRoot ".venv\Scripts\python.exe"
    if (Test-Path $localPy) {
        return (Resolve-Path $localPy).Path
    }
    # 4. Parent workspace .venv
    $parentPy = Join-Path $ProjectRoot "production-meter-reading\.venv\Scripts\python.exe"
    if (Test-Path $parentPy) {
        return (Resolve-Path $parentPy).Path
    }
    $parentPy2 = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    if (Test-Path $parentPy2) {
        return (Resolve-Path $parentPy2).Path
    }
    # 5. Deterministic fallback to system python.exe
    $sysPy = Get-Command "python.exe" -ErrorAction SilentlyContinue
    if ($sysPy -and $sysPy.Source) {
        return $sysPy.Source
    }
    throw "Python executable could not be resolved. Ensure .venv or Python 3.11 is installed."
}

function Get-ProcessDescendantIds {
    param([int]$RootPid)
    if ($RootPid -le 0) { return @() }
    $descendants = New-Object System.Collections.Generic.List[int]
    $queue = New-Object System.Collections.Generic.Queue[int]
    $queue.Enqueue($RootPid)

    $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)

    while ($queue.Count -gt 0) {
        $parent = $queue.Dequeue()
        foreach ($proc in $allProcesses) {
            if ($proc.ParentProcessId -eq $parent -and $proc.ProcessId -ne $parent) {
                if (-not $descendants.Contains($proc.ProcessId)) {
                    $descendants.Add($proc.ProcessId)
                    $queue.Enqueue($proc.ProcessId)
                }
            }
        }
    }
    return $descendants.ToArray()
}

function Test-ProcessOwnedByTree {
    param(
        [int]$TargetPid,
        [int]$RootPid
    )
    if ($TargetPid -eq $RootPid) { return $true }
    $descendants = Get-ProcessDescendantIds -RootPid $RootPid
    if ($descendants -contains $TargetPid) { return $true }
    return $false
}

function Stop-OwnedProcessTree {
    param(
        [int]$RootPid,
        [string]$Name
    )
    if ($RootPid -le 0) { return }
    $proc = Get-Process -Id $RootPid -ErrorAction SilentlyContinue
    if (-not $proc) { return }

    # Terminate root process and its entire descendant tree
    try {
        & taskkill.exe /PID $RootPid /T /F 2>$null | Out-Null
    } catch {}

    # Verify and force-stop any lingering descendants
    $descendants = Get-ProcessDescendantIds -RootPid $RootPid
    foreach ($dPid in $descendants) {
        try {
            Stop-Process -Id $dPid -Force -ErrorAction SilentlyContinue
        } catch {}
    }
    try {
        Stop-Process -Id $RootPid -Force -ErrorAction SilentlyContinue
    } catch {}
}

function Get-PortListenerProcess {
    param([int]$Port)
    $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($connections.Count -gt 0) {
        $pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
        if ($pids.Count -gt 0) {
            return [int]$pids[0]
        }
    }
    return $null
}

# A PID or a role-like command line alone is never proof of ownership.
function Get-ProcessIdentity {
    param([int]$ProcessId)
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if (-not $p -or -not $p.CommandLine -or -not $p.ExecutablePath) { return $null }
    return [ordered]@{
        process_id = [int]$p.ProcessId
        created_at = $p.CreationDate.ToUniversalTime().ToString("o")
        executable = $p.ExecutablePath
        command_line = $p.CommandLine
    }
}

function Test-ProcessIdentityMatch {
    param([object]$Identity)
    if (-not $Identity -or -not $Identity.process_id) { return $false }
    $current = Get-ProcessIdentity -ProcessId $Identity.process_id
    return ($current -and $current.created_at -eq $Identity.created_at -and
        $current.executable -eq $Identity.executable -and
        $current.command_line -ceq $Identity.command_line)
}

function Get-OwnedServiceRecord {
    param([int]$RootPid, [int]$ListenerPid, [int]$Port, [string]$LogName)
    $identities = @()
    foreach ($processId in @($RootPid) + @(Get-ProcessDescendantIds -RootPid $RootPid)) {
        $identity = Get-ProcessIdentity -ProcessId $processId
        if ($identity) { $identities += $identity }
    }
    return [ordered]@{
        root_pid = $RootPid
        listener_pid = $ListenerPid
        port = $Port
        log_name = $LogName
        identities = $identities
    }
}

function Test-RecordedService {
    param([object]$Service)
    if (-not $Service -or -not $Service.identities) { return $false }
    $root = @($Service.identities | Where-Object { $_.process_id -eq $Service.root_pid })
    $listener = @($Service.identities | Where-Object { $_.process_id -eq $Service.listener_pid })
    return ($root.Count -eq 1 -and $listener.Count -eq 1 -and
        (Test-ProcessIdentityMatch $root[0]) -and (Test-ProcessIdentityMatch $listener[0]) -and
        (Test-ProcessOwnedByTree -TargetPid $Service.listener_pid -RootPid $Service.root_pid))
}

function Stop-RecordedService {
    param([object]$Service, [string]$Name)
    if (-not $Service) { return }
    # Also handles recorded children whose original parent has exited.
    foreach ($identity in @($Service.identities)) {
        if (Test-ProcessIdentityMatch $identity) {
            Stop-OwnedProcessTree -RootPid $identity.process_id -Name $Name
        }
    }
}

function Start-LoggedService {
    param([string]$FilePath, [string]$Arguments, [string]$WorkingDirectory,
          [string]$RuntimeRoot, [string]$LogName)
    if (-not ('PmrDetachedProcess' -as [type])) {
        Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.ComponentModel;
public static class PmrDetachedProcess {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct StartupInfo {
        public int cb;
        public string reserved, desktop, title;
        public int x, y, xSize, ySize, xChars, yChars, fill, flags;
        public short showWindow, reservedSize;
        public IntPtr reservedPtr, stdin, stdout, stderr;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct ProcessInfo { public IntPtr process, thread; public int pid, tid; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool CreateProcessW(string app, StringBuilder command, IntPtr pa,
        IntPtr ta, bool inheritHandles, uint flags, IntPtr environment, string cwd,
        ref StartupInfo startup, out ProcessInfo process);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    public static int Start(string app, string command, string cwd) {
        var startup = new StartupInfo(); startup.cb = Marshal.SizeOf(startup);
        ProcessInfo process;
        // CREATE_NO_WINDOW, inheritHandles=false: no console or caller pipe leaks.
        if (!CreateProcessW(app, new StringBuilder(command), IntPtr.Zero, IntPtr.Zero,
            false, 0x08000000, IntPtr.Zero, cwd, ref startup, out process))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        CloseHandle(process.thread); CloseHandle(process.process);
        return process.pid;
    }
}
"@
    }
    $executable = (Get-Command $FilePath -ErrorAction Stop).Source
    $stdout = Join-Path $RuntimeRoot "logs\$LogName.log"
    $stderr = Join-Path $RuntimeRoot "logs\$LogName.err.log"
    # cmd owns new file handles and passes only those to npm/python/node.
    # No user-supplied command text: Arguments are assembled from fixed roles and integer ports.
    foreach ($path in @($executable, $stdout, $stderr)) {
        if ($path -match '[%"\r\n]') { throw "Unsupported shell metacharacter in service path: $path" }
    }
    $command = '"' + $env:ComSpec + '" /d /s /c ""' + $executable + '" ' + $Arguments +
        ' 1>"' + $stdout + '" 2>"' + $stderr + '" <NUL"'
    $processId = [PmrDetachedProcess]::Start($env:ComSpec, $command, $WorkingDirectory)
    return Get-Process -Id $processId -ErrorAction Stop
}

function Get-DevState {
    param([string]$PidFile)
    if (-not (Test-Path $PidFile)) { return $null }
    try {
        $raw = Get-Content -Path $PidFile -Raw -Encoding UTF8 -ErrorAction Stop
        return ($raw | ConvertFrom-Json)
    } catch {
        return $null
    }
}

function Save-DevStateAtomic {
    param(
        [string]$PidFile,
        [object]$StateData
    )
    $stateDir = Split-Path -Parent $PidFile
    if (-not (Test-Path $stateDir)) {
        New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    }
    $tempFile = Join-Path $stateDir ("dev-pids-" + [System.Guid]::NewGuid().ToString() + ".tmp")
    $json = $StateData | ConvertTo-Json -Depth 6
    $json | Set-Content -Path $tempFile -Encoding UTF8 -Force

    # Validate JSON integrity before replacing
    try {
        $null = Get-Content -Path $tempFile -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        throw "Failed to persist state file: JSON validation failed."
    }

    Move-Item -Path $tempFile -Destination $PidFile -Force
}

function Remove-DevState {
    param([string]$PidFile)
    if (Test-Path $PidFile) {
        Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue
    }
}

function Acquire-DevLock {
    param([string]$LockFile)
    $lockDir = Split-Path -Parent $LockFile
    [IO.Directory]::CreateDirectory($lockDir) | Out-Null
    try {
        $script:DevLockStream = [IO.File]::Open($LockFile, [IO.FileMode]::OpenOrCreate,
            [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    } catch [IO.IOException] {
        Write-Host "Another dev launcher operation is in progress."
        return $false
    }
    $bytes = [Text.Encoding]::UTF8.GetBytes("launcher_pid=$PID")
    $script:DevLockStream.SetLength(0)
    $script:DevLockStream.Write($bytes, 0, $bytes.Length)
    $script:DevLockStream.Flush()
    return $true
}

function Release-DevLock {
    param([string]$LockFile)
    if ($script:DevLockStream) {
        $script:DevLockStream.Dispose()
        $script:DevLockStream = $null
    }
    # Keep the lock inode/path stable; the exclusive handle defines ownership.
}

function Check-OCRModelReadiness {
    param([string]$IntegrationRoot)
    $requiredModels = @(
        "models\e2\best.pt",
        "models\ppocrv6_medium\inference",
        "models\ppocrv6_medium\meter_digits_dict.txt"
    )
    $missing = 0
    foreach ($m in $requiredModels) {
        $p = Join-Path $IntegrationRoot $m
        if (-not (Test-Path $p)) {
            $missing++
        }
    }
    if ($missing -eq 0) {
        return "READY"
    } else {
        return "WARNING - model artifacts unavailable"
    }
}
