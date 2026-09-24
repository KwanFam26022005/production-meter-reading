"""
Tests for harness CLI interface, exit codes, JSON outputs, and git discovery.
"""

import json
import subprocess
import sys
from pathlib import Path
import pytest
from tools.harness import discover_changed_files, find_repo_root, matches_pattern


def test_discover_changed_files_normalizes_paths():
    repo_root = find_repo_root()
    files = discover_changed_files(repo_root)
    # Check that paths are normalized with forward slashes
    for f in files:
        assert "\\" not in f
        assert not f.startswith("/")


def test_discover_changed_files_with_base_ref():
    repo_root = find_repo_root()
    # HEAD~1 must return committed files from H3
    files = discover_changed_files(repo_root, base="HEAD~1")
    assert len(files) > 0
    # Should include docs/contracts files from H3 commit
    assert any("docs/contracts/" in f for f in files)


def test_pattern_matching_edge_cases():
    assert matches_pattern("frontend/src/index.css", "frontend/src/index.css")
    assert matches_pattern("frontend/src/components/map-v2/sub/foo.ts", "frontend/src/components/map-v2/**")
    assert matches_pattern("Dockerfile.prod", "Dockerfile*")
    assert matches_pattern("tests/test_foo.py", "tests/test_*.py")
    assert not matches_pattern("other/dir/test_foo.py", "tests/test_*.py")


def test_cli_plan_json_output():
    repo_root = find_repo_root()
    cmd = [sys.executable, "tools/harness.py", "plan", "--base", "HEAD~1", "--json"]
    res = subprocess.run(cmd, cwd=str(repo_root), capture_output=True, text=True, check=False)
    assert res.returncode == 0
    data = json.loads(res.stdout)
    assert "status" in data
    assert "gates" in data
    assert "contexts" in data
    assert "effective_mode" in data
    assert data["status"] == "READY"


def test_cli_plan_clean_worktree_no_local_changes():
    repo_root = find_repo_root()
    if not discover_changed_files(repo_root):
        cmd = [sys.executable, "tools/harness.py", "plan", "--json"]
        res = subprocess.run(cmd, cwd=str(repo_root), capture_output=True, text=True, check=False)
        assert res.returncode == 2
        data = json.loads(res.stdout)
        assert data["status"] == "NO_LOCAL_CHANGES"


def test_cli_plan_exit_code_3_on_mode_downgrade():
    repo_root = find_repo_root()
    # Request FAST on a base range that touched backend files or standard files
    cmd = [
        sys.executable,
        "tools/harness.py",
        "plan",
        "--base",
        "c469814645253b16f8e9908633a9081bd2402856~1",
        "--mode",
        "FAST",
    ]
    res = subprocess.run(cmd, cwd=str(repo_root), capture_output=True, text=True, check=False)
    assert res.returncode == 3
    assert "Cannot downgrade" in res.stdout or "Cannot downgrade" in res.stderr


def test_cli_verify_dry_run_exit_code_0():
    repo_root = find_repo_root()
    cmd = [sys.executable, "tools/harness.py", "verify", "--base", "HEAD~1", "--dry-run"]
    res = subprocess.run(cmd, cwd=str(repo_root), capture_output=True, text=True, check=False)
    assert res.returncode == 0
    assert "VERIFICATION RESULTS: PASSED" in res.stdout
