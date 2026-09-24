"""
Portability and command resolution tests for Lean SE Harness V1.
Covers executable resolution, Windows .cmd shims, explicit paths,
shlex semantics, exit codes, and stdout/stderr capture.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from tools.harness import (
    HarnessConfig,
    execute_verify,
    find_repo_root,
    resolve_executable,
    resolve_plan,
)


def test_python_token_resolves_to_sys_executable():
    """1. Python token resolves to sys.executable."""
    resolved = resolve_executable("python")
    assert resolved == sys.executable


def test_windows_npm_resolves_to_launchable_target():
    """2. Windows: npm command resolves to a launchable npm.cmd-equivalent target."""
    if os.name == "nt":
        resolved = resolve_executable("npm")
        assert resolved is not None
        assert resolved.lower().endswith((".cmd", ".exe", ".bat", ".com"))
        assert not resolved.lower().endswith(".ps1")


def test_windows_npm_bypasses_ps1_and_extensionless(monkeypatch):
    """Windows resolution must reject .ps1 and extensionless files, preferring .cmd."""
    def mock_which(cmd):
        # Simulate environment where which('npm') returns .ps1 or extensionless
        if cmd == "npm":
            return r"C:\nodejs\npm.ps1"
        if cmd == "npm.cmd":
            return r"C:\nodejs\npm.cmd"
        if cmd == "npm.exe":
            return None
        return None

    monkeypatch.setattr(shutil, "which", mock_which)
    resolved = resolve_executable("npm", _os_name="nt")
    assert resolved == r"C:\nodejs\npm.cmd"


def test_windows_npm_fallback_when_default_which_is_extensionless(monkeypatch):
    """Windows resolution fallback when default which returns extensionless bash script."""
    def mock_which(cmd):
        if cmd == "npm":
            return r"C:\Program Files\Git\usr\bin\npm"
        if cmd == "npm.cmd":
            return r"C:\Program Files\nodejs\npm.cmd"
        return None

    monkeypatch.setattr(shutil, "which", mock_which)
    resolved = resolve_executable("npm", _os_name="nt")
    assert resolved == r"C:\Program Files\nodejs\npm.cmd"


def test_explicit_executable_paths_remain_unchanged():
    """3. Windows & POSIX: explicit executable paths remain unchanged."""
    # Absolute paths
    assert resolve_executable(r"C:\Custom\tool.exe") == r"C:\Custom\tool.exe"
    assert resolve_executable(r"C:\Custom\npm.cmd") == r"C:\Custom\npm.cmd"
    assert resolve_executable("/usr/local/bin/tool") == "/usr/local/bin/tool"

    # Relative paths with path separators
    assert resolve_executable("./scripts/check.sh") == "./scripts/check.sh"
    assert resolve_executable(r".\scripts\check.bat") == r".\scripts\check.bat"
    assert resolve_executable("scripts/verify.mjs") == "scripts/verify.mjs"


def test_executable_not_found_produces_deterministic_harness_failure():
    """4. Executable-not-found produces deterministic Harness failure output, not an uncaught exception."""
    # Directly test resolver returns None
    assert resolve_executable("nonexistent_command_xyz_98765") is None

    # Test via execute_verify
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)

    # Inject a synthetic command with nonexistent executable
    bad_cmd_id = "test-bad-executable-command"
    bad_gate_id = "test-bad-executable-gate"
    config.commands[bad_cmd_id] = {
        "id": bad_cmd_id,
        "command": "nonexistent_binary_tool_xyz --flag",
        "cwd": ".",
    }
    config.gates[bad_gate_id] = {
        "commands": [bad_cmd_id],
        "requires_gates": [],
    }

    mock_plan = {
        "status": "READY",
        "gates": [bad_gate_id],
        "changed_files": ["sample.txt"],
        "derived_impacts": [],
        "explicit_impacts": [],
        "minimum_mode": "FAST",
        "effective_mode": "FAST",
    }

    verify_res = execute_verify(config, mock_plan)
    assert verify_res["overall_status"] == "FAILED"
    gate_res = verify_res["gate_results"][0]
    assert gate_res["status"] == "FAIL"

    cmd_res = verify_res["command_results"][0]
    assert cmd_res["exit_code"] == 1
    # Check that error includes command ID, executable token, and cwd
    assert bad_cmd_id in gate_res["details"]["failure_reason"]
    assert "nonexistent_binary_tool_xyz" in gate_res["details"]["failure_reason"]
    assert str(repo_root) in gate_res["details"]["failure_reason"]

    assert bad_cmd_id in cmd_res["stderr"]
    assert "nonexistent_binary_tool_xyz" in cmd_res["stderr"]
    assert str(repo_root) in cmd_res["stderr"]


def test_posix_behavior_remains_unchanged(monkeypatch):
    """5. POSIX behavior remains unchanged."""
    def mock_which(cmd):
        if cmd == "npm":
            return "/usr/bin/npm"
        if cmd == "git":
            return "/usr/bin/git"
        return None

    monkeypatch.setattr(shutil, "which", mock_which)

    assert resolve_executable("npm", _os_name="posix") == "/usr/bin/npm"
    assert resolve_executable("git", _os_name="posix") == "/usr/bin/git"
    assert resolve_executable("unknown_tool", _os_name="posix") is None


def test_arguments_with_spaces_and_quotes_preserve_shlex_semantics():
    """6. Arguments with spaces/quotes preserve current shlex semantics."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)

    test_cmd_id = "test-spaces-quotes"
    test_gate_id = "test-spaces-gate"
    # Python script printing sys.argv[1] and sys.argv[2]
    config.commands[test_cmd_id] = {
        "id": test_cmd_id,
        "command": f'python -c "import sys; print(\'ARG1:\' + sys.argv[1]); print(\'ARG2:\' + sys.argv[2])" "argument with spaces" "second \\"quoted\\" arg"',
        "cwd": ".",
    }
    config.gates[test_gate_id] = {
        "commands": [test_cmd_id],
        "requires_gates": [],
    }

    mock_plan = {
        "status": "READY",
        "gates": [test_gate_id],
        "changed_files": ["sample.txt"],
        "derived_impacts": [],
        "explicit_impacts": [],
        "minimum_mode": "FAST",
        "effective_mode": "FAST",
    }

    verify_res = execute_verify(config, mock_plan)
    assert verify_res["overall_status"] == "PASSED"
    cmd_res = verify_res["command_results"][0]
    assert cmd_res["exit_code"] == 0
    assert "ARG1:argument with spaces" in cmd_res["stdout_preview"]
    assert 'ARG2:second "quoted" arg' in cmd_res["stdout_preview"]


def test_stdout_stderr_and_nonzero_exit_codes_propagate_correctly():
    """7. stdout, stderr and nonzero exit codes still propagate correctly."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)

    test_cmd_id = "test-exit-code-propagation"
    test_gate_id = "test-exit-gate"
    config.commands[test_cmd_id] = {
        "id": test_cmd_id,
        "command": 'python -c "import sys; sys.stdout.write(\'HELLO_STDOUT\\n\'); sys.stderr.write(\'HELLO_STDERR\\n\'); sys.exit(42)"',
        "cwd": ".",
    }
    config.gates[test_gate_id] = {
        "commands": [test_cmd_id],
        "requires_gates": [],
    }

    mock_plan = {
        "status": "READY",
        "gates": [test_gate_id],
        "changed_files": ["sample.txt"],
        "derived_impacts": [],
        "explicit_impacts": [],
        "minimum_mode": "FAST",
        "effective_mode": "FAST",
    }

    verify_res = execute_verify(config, mock_plan)
    assert verify_res["overall_status"] == "FAILED"
    cmd_res = verify_res["command_results"][0]
    assert cmd_res["exit_code"] == 42
    assert "HELLO_STDOUT" in cmd_res["stdout_preview"]
    assert "HELLO_STDERR" in cmd_res["stderr_preview"]


@pytest.mark.skipif(os.name != "nt", reason="Real Windows integration test")
def test_real_windows_integration_npm_resolution_and_launch():
    """Real Windows integration invocation verifying npm resolution and launch."""
    resolved_npm = resolve_executable("npm")
    assert resolved_npm is not None
    assert resolved_npm.lower().endswith((".cmd", ".exe"))

    res = subprocess.run([resolved_npm, "--version"], capture_output=True, text=True, check=False)
    assert res.returncode == 0
    assert len(res.stdout.strip()) > 0
