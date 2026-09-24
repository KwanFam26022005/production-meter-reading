"""Exercise the actual Windows runtime helpers; end-to-end cases live in PS1."""
import json
import os
from pathlib import Path
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
HELPERS = ROOT / "scripts" / "dev-runtime-helpers.ps1"


def powershell(body, **env):
    executable = shutil.which("powershell.exe")
    if not executable:
        pytest.skip("Windows PowerShell 5.1 required")
    result = subprocess.run(
        [executable, "-NoProfile", "-NonInteractive", "-Command",
         "$ErrorActionPreference = 'Stop'; . $env:PMR_TEST_HELPERS; " + body],
        env={**os.environ, "PMR_TEST_HELPERS": str(HELPERS), **env},
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout)


def test_required_reporting_endpoints_exist_in_openapi():
    from backend.app.main import app
    paths = app.openapi()["paths"]
    for route in ("/api/v1/admin/reports/operations/overview",
                  "/api/v1/admin/reports/usage/overview", "/health"):
        assert route in paths


def test_actual_state_atomic_roundtrip(tmp_path):
    target = tmp_path / "state" / "dev-pids.json"
    state = powershell(
        "Save-DevStateAtomic $env:PMR_TEST_STATE @{ backend = @{ root_pid = 42; port = 18000 } }; "
        "Get-DevState $env:PMR_TEST_STATE | ConvertTo-Json -Depth 6",
        PMR_TEST_STATE=str(target),
    )
    assert state["backend"] == {"root_pid": 42, "port": 18000}
    assert list(target.parent.glob("*.tmp")) == []


def test_live_identity_and_recycled_pid_preservation():
    result = powershell(
        "$identity = Get-ProcessIdentity $PID; "
        "$matches = Test-ProcessIdentityMatch $identity; "
        "$identity.created_at = '2000-01-01T00:00:00.0000000Z'; "
        "$recycled = Test-ProcessIdentityMatch $identity; "
        "Stop-RecordedService @{ identities = @($identity) } 'unrelated'; "
        "@{ matches = $matches; recycled = $recycled; survived = [bool](Get-Process -Id $PID) } | ConvertTo-Json"
    )
    assert result == {"matches": True, "recycled": False, "survived": True}


def test_command_mismatch_and_missing_identity_are_not_owned():
    result = powershell(
        "$identity = Get-ProcessIdentity $PID; $identity.command_line = 'unrelated'; "
        "@{ mismatch = (Test-ProcessIdentityMatch $identity); "
        "legacy = (Test-RecordedService @{ root_pid = $PID; listener_pid = $PID }); "
        "empty = (Test-ProcessIdentityMatch $null) } | ConvertTo-Json"
    )
    assert result == {"mismatch": False, "legacy": False, "empty": False}


def test_exclusive_lock_can_be_reacquired_after_release(tmp_path):
    result = powershell(
        "$first = Acquire-DevLock $env:PMR_TEST_LOCK; "
        "$second = Acquire-DevLock $env:PMR_TEST_LOCK 6>$null; "
        "Release-DevLock $env:PMR_TEST_LOCK; "
        "$third = Acquire-DevLock $env:PMR_TEST_LOCK; "
        "Release-DevLock $env:PMR_TEST_LOCK; "
        "@{ first = $first; second = $second; third = $third } | ConvertTo-Json",
        PMR_TEST_LOCK=str(tmp_path / "dev.lock"),
    )
    assert result == {"first": True, "second": False, "third": True}
