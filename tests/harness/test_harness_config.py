"""
Tests for harness configuration integrity and validation.
"""

from pathlib import Path
import pytest
from tools.harness import HarnessConfig, ConfigIntegrityError, find_repo_root


def test_real_repo_config_integrity():
    """Verify that current repository harness configuration is 100% valid."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    assert config is not None
    assert len(config.commands) >= 19
    assert len(config.gates) >= 21
    assert len(config.domains) >= 13


def test_missing_command_raises_error():
    """Verify that referencing an unknown command in a gate raises ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    # Inject invalid command reference into gate
    config.gates["docs-integrity"]["commands"] = ["non-existent-cmd-id"]
    with pytest.raises(ConfigIntegrityError, match="references unknown command"):
        config.validate_integrity()


def test_missing_gate_dependency_raises_error():
    """Verify that requiring an unknown gate raises ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    config.gates["bundle-separation"]["requires_gates"] = ["non-existent-gate-id"]
    with pytest.raises(ConfigIntegrityError, match="requires unknown gate"):
        config.validate_integrity()


def test_dependency_cycle_raises_error():
    """Verify that cyclical gate dependencies raise ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    # Create cycle: A -> B -> A
    config.gates["user-build"]["requires_gates"] = ["operations-build"]
    config.gates["operations-build"]["requires_gates"] = ["user-build"]
    with pytest.raises(ConfigIntegrityError, match="cycle detected"):
        config.validate_integrity()


def test_missing_tracked_skill_raises_error(tmp_path):
    """Verify that a missing TRACKED_CURRENT skill path raises ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    config.skills["saigon-port-ui"]["path"] = "missing/path/SKILL.md"
    with pytest.raises(ConfigIntegrityError, match="TRACKED_CURRENT skill 'saigon-port-ui' missing"):
        config.validate_integrity()


def test_missing_optional_external_skill_is_ignored():
    """Verify that absence of OPTIONAL_EXTERNAL skill does NOT raise error."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    config.skills["non-existent-external"] = {
        "status": "OPTIONAL_EXTERNAL",
        "path": "does/not/exist.md",
    }
    # Should not raise
    config.validate_integrity()


def test_duplicate_known_failure_raises_error():
    """Verify duplicate test node IDs in known failures raise ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    failures = config.known_failures_data.get("failures", [])
    config.known_failures_data["failures"] = failures + [failures[0]]
    with pytest.raises(ConfigIntegrityError, match="Duplicate test_node_id"):
        config.validate_integrity()


def test_invalid_b2_expected_hash_raises_error():
    """Verify that malformed B2 hash in gates.yml raises ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    config.gates["map-b2-freeze"]["expected_hash"] = "invalid_hash_string"
    with pytest.raises(ConfigIntegrityError, match="Invalid map-b2-freeze expected_hash"):
        config.validate_integrity()


def test_duplicate_command_id_raises_error():
    """Verify that duplicate command IDs raise ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    cmds = config.commands_data.get("commands", [])
    config.commands_data["commands"] = cmds + [cmds[0]]
    with pytest.raises(ConfigIntegrityError, match="Duplicate command ID"):
        config.validate_integrity()


def test_unknown_context_in_domain_raises_error():
    """Verify that referencing an unknown context in a domain raises ConfigIntegrityError."""
    repo_root = find_repo_root()
    config = HarnessConfig(repo_root)
    config.domains["backend-core"]["contexts"] = ["non-existent-ctx"]
    with pytest.raises(ConfigIntegrityError, match="references unknown context"):
        config.validate_integrity()
