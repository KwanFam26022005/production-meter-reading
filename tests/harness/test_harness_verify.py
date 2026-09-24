"""
Tests for harness verification execution, gate assertions, and known failure classification.
"""

from unittest.mock import patch, MagicMock
import pytest
from tools.harness import HarnessConfig, resolve_plan, execute_verify, find_repo_root


@pytest.fixture(scope="module")
def config():
    repo_root = find_repo_root()
    return HarnessConfig(repo_root)


def test_dry_run_verification(config):
    plan = resolve_plan(config, ["tools/harness.py"])
    res = execute_verify(config, plan, dry_run=True)
    assert res["overall_status"] == "PASSED"
    for g in res["gate_results"]:
        assert g["status"] == "PASS"
        assert g.get("dry_run") is True


def test_dependency_freshness_skip_on_failed_dependency(config):
    # bundle-separation requires user-build and operations-build
    plan = {
        "status": "READY",
        "gates": ["user-build", "operations-build", "bundle-separation"],
    }

    # Mock subprocess.run where user-build fails (exit code 1)
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="Build failed")
        res = execute_verify(config, plan)

        assert res["overall_status"] == "FAILED"
        user_res = next(g for g in res["gate_results"] if g["gate_id"] == "user-build")
        assert user_res["status"] == "FAIL"

        bundle_res = next(g for g in res["gate_results"] if g["gate_id"] == "bundle-separation")
        assert bundle_res["status"] == "SKIPPED_DEPENDENCY_FAILURE"
        assert "user-build" in bundle_res["missing_dependencies"]


def test_manual_gate_returns_manual_required(config):
    plan = {
        "status": "READY",
        "gates": ["admin-responsive-small"],
    }
    res = execute_verify(config, plan)
    assert res["overall_status"] == "INCOMPLETE"
    gate_res = res["gate_results"][0]
    assert gate_res["status"] == "MANUAL_REQUIRED"
    assert "1024x768" in gate_res["viewport_matrix"]
    assert "no-horizontal-page-overflow" in gate_res["assertions"]


def test_b2_hash_assertion_matching(config):
    plan = {
        "status": "READY",
        "gates": ["map-b2-freeze"],
    }
    mock_out = (
        "RECOMMENDED_LAYOUT_KEY: B2\n"
        "FROZEN B2 CONFIG SHA256: 7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a\n"
        "B2 NODES COUNT: 17\n"
    )
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_out, stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "PASSED"
        assert res["gate_results"][0]["status"] == "PASS"


def test_b2_hash_assertion_mismatch(config):
    plan = {
        "status": "READY",
        "gates": ["map-b2-freeze"],
    }
    mock_out = (
        "RECOMMENDED_LAYOUT_KEY: B2\n"
        "FROZEN B2 CONFIG SHA256: 0000000000000000000000000000000000000000000000000000000000000000\n"
    )
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_out, stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "FAILED"
        assert res["gate_results"][0]["status"] == "B2_HASH_MISMATCH"


def test_backend_full_known_failures_qualified(config):
    plan = {
        "status": "READY",
        "gates": ["backend-full"],
    }
    # Simulate pytest output containing exact 10 known failures
    known_nodes = [f["test_node_id"] for f in config.known_failures_data["failures"]]
    mock_out = "\n".join([f"FAILED {n} - AssertionError: reason" for n in known_nodes])

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout=mock_out, stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "PASSED"
        gate_res = res["gate_results"][0]
        assert gate_res["status"] == "QUALIFIED_WITH_KNOWN_FAILURES"
        assert gate_res["details"]["reason_check"] == "UNVERIFIED_REASON"
        assert len(gate_res["details"]["new_failures"]) == 0


def test_backend_full_new_failure_causes_fail(config):
    plan = {
        "status": "READY",
        "gates": ["backend-full"],
    }
    # Known nodes + 1 new node
    known_nodes = [f["test_node_id"] for f in config.known_failures_data["failures"]]
    mock_out = "\n".join([f"FAILED {n}" for n in known_nodes + ["tests/test_new_regression.py::test_fail"]])

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout=mock_out, stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "FAILED"
        gate_res = res["gate_results"][0]
        assert gate_res["status"] == "FAIL"
        assert "tests/test_new_regression.py::test_fail" in gate_res["details"]["new_failures"]


def test_backend_full_same_count_different_node_causes_fail(config):
    plan = {
        "status": "READY",
        "gates": ["backend-full"],
    }
    # Replace one known node with an unknown node (same total count = 10)
    known_nodes = [f["test_node_id"] for f in config.known_failures_data["failures"]][:9]
    mock_out = "\n".join([f"FAILED {n}" for n in known_nodes + ["tests/test_different.py::test_fail"]])

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout=mock_out, stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "FAILED"
        gate_res = res["gate_results"][0]
        assert gate_res["status"] == "FAIL"
        assert "tests/test_different.py::test_fail" in gate_res["details"]["new_failures"]
        assert len(gate_res["details"]["baseline_improvements"]) == 1


def test_backend_full_baseline_improvement(config):
    plan = {
        "status": "READY",
        "gates": ["backend-full"],
    }
    # Only 9 of 10 known failures fail (one improved)
    known_nodes = [f["test_node_id"] for f in config.known_failures_data["failures"]][:9]
    mock_out = "\n".join([f"FAILED {n}" for n in known_nodes])

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout=mock_out, stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "PASSED"
        gate_res = res["gate_results"][0]
        assert gate_res["status"] == "QUALIFIED_WITH_KNOWN_FAILURES"
        assert len(gate_res["details"]["baseline_improvements"]) == 1


def test_b2_hash_missing_label_fails(config):
    plan = {"status": "READY", "gates": ["map-b2-freeze"]}
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="Some unexpected output without hash label", stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "FAILED"
        assert res["gate_results"][0]["status"] == "FAIL"
        assert "Could not parse" in res["gate_results"][0]["details"]["failure_reason"]


def test_b2_hash_command_nonzero_fails(config):
    plan = {"status": "READY", "gates": ["map-b2-freeze"]}
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="Node syntax error")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "FAILED"
        assert res["gate_results"][0]["status"] == "FAIL"


def test_bundle_freshness_success_executes_bundle_separation(config):
    plan = {"status": "READY", "gates": ["user-build", "operations-build", "bundle-separation"]}
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="Success", stderr="")
        res = execute_verify(config, plan)
        assert res["overall_status"] == "PASSED"
        bundle_res = next(g for g in res["gate_results"] if g["gate_id"] == "bundle-separation")
        assert bundle_res["status"] == "PASS"
