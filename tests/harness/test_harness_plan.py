"""
Tests for harness planning, impact routing, mode resolution, and context loading.
"""

from pathlib import Path
import pytest
from tools.harness import HarnessConfig, resolve_plan, find_repo_root, ConfigIntegrityError


@pytest.fixture(scope="module")
def config():
    repo_root = find_repo_root()
    return HarnessConfig(repo_root)


def test_documentation_only_routing(config):
    plan = resolve_plan(config, ["docs/contracts/reading-schedule.md", "README.md"])
    assert plan["status"] == "READY"
    assert "documentation" in plan["derived_impacts"]
    assert plan["minimum_mode"] == "FAST"
    assert plan["effective_mode"] == "FAST"
    assert plan["gates"] == ["docs-integrity"]
    assert "AGENTS.md" in plan["contexts"]


def test_harness_infrastructure_routing(config):
    plan = resolve_plan(config, ["tools/harness.py", "harness/impact-map.yml", "tests/harness/test_foo.py"])
    assert plan["status"] == "READY"
    assert "harness-infrastructure" in plan["derived_impacts"]
    assert plan["minimum_mode"] == "FAST"
    assert plan["effective_mode"] == "FAST"
    assert set(plan["gates"]) == {"docs-integrity", "harness-self-tests"}
    assert "tools/harness.py" in plan["contexts"]


def test_user_ui_routing(config):
    plan = resolve_plan(config, ["frontend/src/components/ReadingBatchView.tsx"])
    assert plan["status"] == "READY"
    assert "user-ui" in plan["derived_impacts"]
    assert plan["minimum_mode"] == "FAST"
    assert set(plan["skills"]) == {"saigon-port-ui", "ui-ux-pro-max"}
    assert "user-suite" in plan["gates"]


def test_operations_ui_routing(config):
    plan = resolve_plan(config, ["frontend/src/components/admin/AdminStaffRoster.tsx"])
    assert plan["status"] == "READY"
    assert "operations-ui" in plan["derived_impacts"]
    assert plan["minimum_mode"] == "FAST"
    assert set(plan["skills"]) == {"saigon-port-ui", "ui-ux-pro-max"}
    assert "operations-suite" in plan["gates"]


def test_admin_responsive_routing(config):
    plan = resolve_plan(config, ["frontend/src/components/admin/roster/RosterMobileView.tsx"])
    assert plan["status"] == "READY"
    assert "admin-responsive" in plan["derived_impacts"]
    assert set(plan["skills"]) == {"saigon-port-ui", "saigon-port-admin-responsive", "ui-ux-pro-max"}
    assert "admin-responsive-small" in plan["gates"]


def test_map_v2_routing(config):
    plan = resolve_plan(config, ["frontend/src/components/map-v2/MapV2Workspace.tsx"])
    assert plan["status"] == "READY"
    assert "map-v2" in plan["derived_impacts"]
    assert plan["minimum_mode"] == "STANDARD"
    assert set(plan["skills"]) == {"saigon-port-ui", "saigon-port-map-v2"}
    assert "ui-ux-pro-max" not in plan["skills"]
    assert "docs/contracts/map-v2.md" in plan["contexts"]


def test_backend_core_does_not_load_design_skills(config):
    plan = resolve_plan(
        config,
        ["backend/app/main.py"],
        explicit_impacts=["backend-core"],
        test_nodes=["tests/test_main.py::test_root"],
    )
    assert plan["status"] == "READY"
    assert "backend-core" in plan["explicit_impacts"]
    assert "ui-ux-pro-max" not in plan["skills"]
    assert "saigon-port-ui" not in plan["skills"]


def test_user_task_projection_backend_routing(config):
    plan = resolve_plan(config, ["backend/app/user_tasks.py"])
    assert plan["status"] == "READY"
    assert "user-task-projection" in plan["derived_impacts"]
    assert plan["minimum_mode"] == "STANDARD"
    assert "user-task-projection" in plan["gates"]
    assert "docs/contracts/user-task-projection.md" in plan["contexts"]


def test_unknown_source_requires_semantic_review(config):
    plan = resolve_plan(config, ["packages/unrecognized_service.py"])
    assert plan["status"] == "BLOCKED_SEMANTIC_REVIEW"
    assert plan["minimum_mode"] == "STANDARD"
    assert "packages/unrecognized_service.py" in plan["semantic_review"]["unresolved_files"]


def test_shared_files_preempt_and_require_semantic_review(config):
    for shared in ["frontend/src/types.ts", "frontend/src/services/api.ts", "backend/app/models.py", "backend/app/main.py"]:
        plan = resolve_plan(config, [shared])
        assert plan["status"] == "BLOCKED_SEMANTIC_REVIEW"
        assert plan["minimum_mode"] == "STANDARD"
        assert shared in plan["semantic_review"]["unresolved_files"]


def test_shared_file_semantic_review_resolved_with_explicit_impact(config):
    plan = resolve_plan(config, ["backend/app/models.py"], explicit_impacts=["reading-schedule"])
    assert plan["status"] == "READY"
    assert plan["semantic_review"]["resolved"] is True
    assert "reading-schedule" in plan["gates"]


def test_mode_escalation(config):
    # FAST path requested as STANDARD
    plan_std = resolve_plan(config, ["docs/contracts/reading-schedule.md"], requested_mode="STANDARD")
    assert plan_std["status"] == "READY"
    assert plan_std["minimum_mode"] == "FAST"
    assert plan_std["effective_mode"] == "STANDARD"

    # FAST path requested as RELEASE
    plan_rel = resolve_plan(config, ["docs/contracts/reading-schedule.md"], requested_mode="RELEASE")
    assert plan_rel["status"] == "READY"
    assert plan_rel["effective_mode"] == "RELEASE"


def test_mode_downgrade_rejected(config):
    # STANDARD path requested as FAST
    plan = resolve_plan(config, ["backend/app/user_tasks.py"], requested_mode="FAST")
    assert plan["status"] == "MODE_DOWNGRADE_REJECTED"
    assert "Cannot downgrade" in plan["blocking_reasons"][0]


def test_explicit_release_triggers_full_qualification_gates(config):
    plan = resolve_plan(config, ["docs/contracts/reading-schedule.md"], requested_mode="RELEASE")
    assert "backend-full" in plan["gates"]
    assert "user-suite" in plan["gates"]
    assert "operations-suite" in plan["gates"]
    assert "bundle-separation" in plan["gates"]


def test_derived_release_does_not_auto_trigger_full_qualification(config):
    # Deployment path has minimum_mode: RELEASE
    plan = resolve_plan(config, ["Dockerfile"])
    assert plan["status"] == "READY"
    assert plan["effective_mode"] == "RELEASE"
    assert "bundle-separation" in plan["gates"]
    # Should NOT have backend-full unless user explicitly passed --mode RELEASE
    assert "backend-full" not in plan["gates"]


def test_primary_contexts_only_loaded(config):
    plan = resolve_plan(config, ["backend/app/user_tasks.py", "backend/scripts/create_reading_rounds.py"])
    # Primary compact contracts must be present
    assert "docs/contracts/user-task-projection.md" in plan["contexts"]
    assert "docs/contracts/reading-schedule.md" in plan["contexts"]
    # Historical handoffs must NOT be in primary contexts
    for ctx in plan["contexts"]:
        assert "THREAD_HANDOFF.md" not in ctx


def test_backend_focused_required_input(config):
    # Without test node
    plan_no_node = resolve_plan(config, ["backend/app/main.py"], explicit_impacts=["backend-core"])
    assert plan_no_node["status"] == "INPUT_REQUIRED"
    assert any("backend-focused" in r for r in plan_no_node["required_inputs"])

    # With test node
    plan_with_node = resolve_plan(
        config,
        ["backend/app/main.py"],
        explicit_impacts=["backend-core"],
        test_nodes=["tests/test_main.py::test_root"],
    )
    assert plan_with_node["status"] == "READY"
    assert plan_with_node["required_inputs"] == []


def test_no_local_changes_status(config):
    plan = resolve_plan(config, [])
    assert plan["status"] == "NO_LOCAL_CHANGES"


def test_admin_schedules_responsive_component_only(config):
    """Case A1: Component-only Admin schedule responsive fix resolves to FAST."""
    plan = resolve_plan(
        config,
        ["frontend/src/components/admin/AdminSchedules.tsx"],
        explicit_impacts=["admin-responsive"],
    )
    assert plan["status"] == "READY"
    assert plan["minimum_mode"] == "FAST"
    assert plan["effective_mode"] == "FAST"
    assert "operations-ui" in plan["derived_impacts"]
    assert "admin-responsive" in plan["explicit_impacts"]
    assert "saigon-port-admin-responsive" in plan["skills"]
    assert "ui-ux-pro-max" in plan["skills"]
    assert "admin-responsive-small" in plan["gates"]
    assert "operations-suite" in plan["gates"]
    # No backend or build gates
    assert "backend-focused" not in plan["gates"]
    assert "operations-build" not in plan["gates"]


def test_shared_index_css_narrowing(config):
    """Case A2: index.css blocks unreviewed, but narrows to FAST when scoped to admin-responsive."""
    # Unreviewed index.css blocks
    p_blocked = resolve_plan(config, ["frontend/src/index.css"])
    assert p_blocked["status"] == "BLOCKED_SEMANTIC_REVIEW"
    assert p_blocked["minimum_mode"] == "STANDARD"

    # Reviewed index.css scoped to admin-responsive narrows to FAST
    p_fast = resolve_plan(config, ["frontend/src/index.css"], explicit_impacts=["admin-responsive"])
    assert p_fast["status"] == "READY"
    assert p_fast["minimum_mode"] == "FAST"
    assert p_fast["effective_mode"] == "FAST"
    assert "admin-responsive-small" in p_fast["gates"]
    assert "operations-build" not in p_fast["gates"]

    # Reviewed index.css scoped to map-v2 stays STANDARD
    p_std = resolve_plan(config, ["frontend/src/index.css"], explicit_impacts=["map-v2"])
    assert p_std["status"] == "READY"
    assert p_std["minimum_mode"] == "STANDARD"
    assert "operations-build" in p_std["gates"]
