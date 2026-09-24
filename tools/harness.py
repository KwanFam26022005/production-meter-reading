#!/usr/bin/env python3
"""
Lean SE Harness — Executable Impact-Based Planner and Verifier.
Consumes declarative repository policy in harness/ and docs/contracts/.
"""

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import yaml

# Exit code contract
EXIT_OK = 0  # Plan ready / verification qualified
EXIT_REGRESSION = 1  # Verification failure / regression / assertion error
EXIT_INCOMPLETE = 2  # Incomplete: manual required, semantic review blocked, input required
EXIT_CONFIG_ERROR = 3  # Configuration integrity error / usage error / mode downgrade


class ConfigIntegrityError(Exception):
    """Raised when repository harness configuration fails integrity invariants."""
    pass


def find_repo_root() -> Path:
    """Find repository root containing harness/."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / "harness" / "commands.yml").exists():
            return current
        current = current.parent
    return Path.cwd()


class HarnessConfig:
    """Loads and validates declarative harness policies."""

    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.harness_dir = repo_root / "harness"

        self.commands_data = self._load_yaml("commands.yml")
        self.gates_data = self._load_yaml("gates.yml")
        self.impact_data = self._load_yaml("impact-map.yml")
        self.context_data = self._load_yaml("context-index.yml")
        self.known_failures_data = self._load_json("known-failures.json")

        self.commands: Dict[str, Dict[str, Any]] = {c["id"]: c for c in self.commands_data.get("commands", [])}
        self.gates: Dict[str, Dict[str, Any]] = self.gates_data.get("gates", {})
        self.domains: Dict[str, Dict[str, Any]] = self.impact_data.get("domains", {})
        self.shared_files: List[Dict[str, Any]] = self.impact_data.get("shared_files", [])
        self.path_rules: List[Dict[str, Any]] = self.impact_data.get("path_rules", [])
        self.contexts: Dict[str, Dict[str, Any]] = self.context_data.get("contexts", {})
        self.skills: Dict[str, Dict[str, Any]] = self.context_data.get("skills", {})

        self.validate_integrity()

    def _load_yaml(self, filename: str) -> Dict[str, Any]:
        path = self.harness_dir / filename
        if not path.exists():
            raise ConfigIntegrityError(f"Missing required harness file: {path}")
        try:
            with open(path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            raise ConfigIntegrityError(f"Failed to parse YAML {filename}: {e}")

    def _load_json(self, filename: str) -> Dict[str, Any]:
        path = self.harness_dir / filename
        if not path.exists():
            raise ConfigIntegrityError(f"Missing required harness file: {path}")
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f) or {}
        except Exception as e:
            raise ConfigIntegrityError(f"Failed to parse JSON {filename}: {e}")

    def validate_integrity(self) -> None:
        """Validate integrity constraints across all declarative policy files."""
        # 1. Schema version
        for name, data in [("commands", self.commands_data), ("gates", self.gates_data), ("impact-map", self.impact_data)]:
            if data.get("schema_version") != 1:
                raise ConfigIntegrityError(f"{name}.yml has unsupported schema_version: {data.get('schema_version')}")

        # 2. Command IDs unique and gate commands exist
        commands_list = self.commands_data.get("commands", [])
        cmd_ids = [c["id"] for c in commands_list]
        if len(cmd_ids) != len(set(cmd_ids)):
            raise ConfigIntegrityError("Duplicate command ID found in commands.yml")

        for gate_id, gate in self.gates.items():
            for cmd_id in gate.get("commands", []):
                if cmd_id not in self.commands:
                    raise ConfigIntegrityError(f"Gate '{gate_id}' references unknown command '{cmd_id}'")

        # 3. Gate dependencies exist and acyclic
        for gate_id, gate in self.gates.items():
            for req_id in gate.get("requires_gates", []):
                if req_id not in self.gates:
                    raise ConfigIntegrityError(f"Gate '{gate_id}' requires unknown gate '{req_id}'")

        self._check_gate_dependency_cycles()

        # 4. Contexts in domains exist
        for dom_id, dom in self.domains.items():
            for ctx_id in dom.get("contexts", []):
                if ctx_id not in self.contexts:
                    raise ConfigIntegrityError(f"Domain '{dom_id}' references unknown context '{ctx_id}'")

        # 5. Tracked skills exist on disk
        for skill_id, skill in self.skills.items():
            if skill.get("status") == "TRACKED_CURRENT":
                skill_path = self.repo_root / skill.get("path", "")
                if not skill_path.exists():
                    raise ConfigIntegrityError(f"TRACKED_CURRENT skill '{skill_id}' missing at {skill_path}")

        # 6. Known failures integrity
        failures = self.known_failures_data.get("failures", [])
        node_ids = [f.get("test_node_id") for f in failures]
        if len(node_ids) != len(set(node_ids)):
            raise ConfigIntegrityError("Duplicate test_node_id in known-failures.json")
        if len(failures) != 10:
            raise ConfigIntegrityError(f"Expected exactly 10 known failures, found {len(failures)}")

        # 7. B2 expected hash format
        b2_gate = self.gates.get("map-b2-freeze", {})
        expected_hash = b2_gate.get("expected_hash")
        if not expected_hash or not re.fullmatch(r"[0-9a-f]{64}", expected_hash):
            raise ConfigIntegrityError(f"Invalid map-b2-freeze expected_hash: {expected_hash}")

    def _check_gate_dependency_cycles(self) -> None:
        """Topological sort cycle check for gates."""
        visited: Dict[str, int] = {}  # 0: visiting, 1: visited

        def visit(node: str, stack: List[str]) -> None:
            if visited.get(node) == 0:
                cycle_str = " -> ".join(stack + [node])
                raise ConfigIntegrityError(f"Gate dependency cycle detected: {cycle_str}")
            if visited.get(node) == 1:
                return
            visited[node] = 0
            for dep in self.gates.get(node, {}).get("requires_gates", []):
                visit(dep, stack + [node])
            visited[node] = 1

        for g in self.gates:
            if g not in visited:
                visit(g, [])


def glob_to_regex(pattern: str) -> re.Pattern:
    """Convert glob pattern with ** support to regex."""
    res = []
    i = 0
    n = len(pattern)
    while i < n:
        c = pattern[i]
        if c == "*":
            if i + 1 < n and pattern[i + 1] == "*":
                i += 2
                if i < n and pattern[i] == "/":
                    i += 1
                    res.append("(?:.*/)?")
                else:
                    res.append(".*")
            else:
                res.append("[^/]*")
                i += 1
        elif c == "?":
            res.append("[^/]")
            i += 1
        else:
            res.append(re.escape(c))
            i += 1
    return re.compile(f"^{''.join(res)}$")


def matches_pattern(path: str, pattern: str) -> bool:
    """Check if normalized path matches a glob pattern."""
    regex = glob_to_regex(pattern)
    return bool(regex.match(path))


def resolve_executable(cmd_token: str, _os_name: Optional[str] = None) -> Optional[str]:
    """
    Resolve command executable portably across operating systems.

    Rules:
    - 'python': sys.executable
    - Explicit path (contains path separators or is absolute): preserved as-is
    - Windows: resolves through OS search path and PATHEXT (preferring launchable
      binaries/shims such as .cmd, .exe, .bat, .com over .ps1)
    - POSIX: standard executable lookup via shutil.which
    - Resolution failure: returns None
    """
    if not cmd_token:
        return None

    if cmd_token == "python":
        return sys.executable

    # Explicit path: preserve as-is (e.g. ./scripts/run.sh, C:\bin\tool.exe)
    if "/" in cmd_token or "\\" in cmd_token or Path(cmd_token).is_absolute():
        return cmd_token

    target_os = _os_name or os.name

    if target_os == "nt":
        # Windows launchable extensions directly supported by CreateProcess / subprocess
        win_launchable_exts = (".cmd", ".bat", ".exe", ".com")

        resolved = shutil.which(cmd_token)
        if resolved:
            ext = Path(resolved).suffix.lower()
            if ext in win_launchable_exts:
                return resolved
            # If resolved was .ps1 or extensionless, do NOT prefer it; fall through to probe launchable exts

        # Fallback: probe launchable extensions explicitly in priority order
        for ext in win_launchable_exts:
            candidate = shutil.which(f"{cmd_token}{ext}")
            if candidate and Path(candidate).suffix.lower() in win_launchable_exts:
                return candidate

        return None

    # POSIX: preserve standard lookup
    return shutil.which(cmd_token)


def run_git_cmd(repo_root: Path, args: List[str]) -> Tuple[int, str, str]:
    """Execute a git command in repository root."""
    git_bin = resolve_executable("git") or "git"
    cmd = [git_bin] + args
    try:
        res = subprocess.run(
            cmd,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return 1, "", str(e)


def discover_changed_files(repo_root: Path, base: Optional[str] = None) -> List[str]:
    """
    Discover changed files relative to base or local changes against HEAD.
    Normalizes path separators to '/'.
    """
    changed: Set[str] = set()

    if base:
        code, out, err = run_git_cmd(repo_root, ["diff", "--name-only", f"{base}...HEAD"])
        if code != 0:
            # Fall back to 2-dot diff if 3-dot fails
            code, out, err = run_git_cmd(repo_root, ["diff", "--name-only", base, "HEAD"])
            if code != 0:
                raise ValueError(f"Git diff against base '{base}' failed: {err}")
        for line in out.splitlines():
            line = line.strip().replace("\\", "/")
            if line:
                changed.add(line)

    # Local working tree changes (staged, unstaged, untracked)
    _, staged, _ = run_git_cmd(repo_root, ["diff", "--name-only", "--cached"])
    for line in staged.splitlines():
        line = line.strip().replace("\\", "/")
        if line:
            changed.add(line)

    _, unstaged, _ = run_git_cmd(repo_root, ["diff", "--name-only"])
    for line in unstaged.splitlines():
        line = line.strip().replace("\\", "/")
        if line:
            changed.add(line)

    _, untracked, _ = run_git_cmd(repo_root, ["ls-files", "--others", "--exclude-standard"])
    for line in untracked.splitlines():
        line = line.strip().replace("\\", "/")
        if line:
            changed.add(line)

    return sorted(list(changed))


def resolve_plan(
    config: HarnessConfig,
    changed_files: List[str],
    requested_mode: Optional[str] = None,
    explicit_impacts: Optional[List[str]] = None,
    include_gates: Optional[List[str]] = None,
    test_nodes: Optional[List[str]] = None,
    base: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Produce an impact-based plan from changed files and declarative policies.
    """
    explicit_impacts_set = set(explicit_impacts or [])
    include_gates_set = set(include_gates or [])
    test_nodes_list = test_nodes or []

    # Validate explicit impacts
    for imp in explicit_impacts_set:
        if imp not in config.domains:
            raise ConfigIntegrityError(f"Explicit impact '{imp}' is not a declared domain in impact-map.yml")

    # Validate include gates
    for g in include_gates_set:
        if g not in config.gates:
            raise ConfigIntegrityError(f"Include gate '{g}' is not a declared gate in gates.yml")

    mode_hierarchy = {"FAST": 1, "STANDARD": 2, "RELEASE": 3}
    if requested_mode and requested_mode not in mode_hierarchy:
        raise ConfigIntegrityError(f"Invalid mode '{requested_mode}'. Must be FAST, STANDARD, or RELEASE.")

    if not changed_files and not base:
        return {
            "status": "NO_LOCAL_CHANGES",
            "base": base,
            "changed_files": [],
            "derived_impacts": [],
            "explicit_impacts": sorted(list(explicit_impacts_set)),
            "minimum_mode": "FAST",
            "requested_mode": requested_mode,
            "effective_mode": requested_mode or "FAST",
            "semantic_review": {"required": False, "resolved": True, "unresolved_files": [], "candidate_impacts": []},
            "contexts": [],
            "skills": [],
            "gates": [],
            "conditional_gate_candidates": [],
            "required_inputs": [],
            "blocking_reasons": ["No local changes detected. Provide --base <ref> to plan a committed range."],
        }

    derived_impacts: Set[str] = set()
    unresolved_semantic_files: List[str] = []
    semantic_review_candidate_impacts: Set[str] = set()
    path_additional_gates: Set[str] = set()
    derived_min_modes: List[str] = []

    # Shared file index
    shared_lookup = {item["path"]: item for item in config.shared_files}

    # Match each changed file
    for path in changed_files:
        # 1. Preempt with shared files
        if path in shared_lookup:
            sf = shared_lookup[path]
            min_mode = sf.get("minimum_mode", "STANDARD")
            cands = sf.get("candidate_impacts", [])
            semantic_review_candidate_impacts.update(cands)
            path_additional_gates.update(sf.get("always_gates", []))

            # Has user explicitly provided any impact for this shared file or globally?
            if not explicit_impacts_set:
                unresolved_semantic_files.append(path)
                derived_min_modes.append(min_mode)
            else:
                if not sf.get("review_can_narrow_mode"):
                    derived_min_modes.append(min_mode)
            continue

        # 2. Path rules (first_match)
        matched = False
        for rule in config.path_rules:
            rule_matched = False
            for pat in rule.get("paths", []):
                if matches_pattern(path, pat):
                    rule_matched = True
                    break
            if rule_matched:
                matched = True
                derived_impacts.update(rule.get("impacts", []))
                path_additional_gates.update(rule.get("additional_gates", []))
                break

        if matched:
            continue

        # 3. Unmatched documentation vs unmatched source
        if path.startswith("docs/") or path.endswith((".md", ".txt", ".rst")):
            derived_impacts.add("documentation")
            derived_min_modes.append("FAST")
            path_additional_gates.add("docs-integrity")
        else:
            # Unmatched source requires semantic review and explicit impact
            derived_min_modes.append("STANDARD")
            if not explicit_impacts_set:
                unresolved_semantic_files.append(path)

    # Combine derived impacts with explicit impacts
    all_impacts = set(derived_impacts) | explicit_impacts_set

    # Compute derived minimum mode
    for imp in all_impacts:
        dom_min = config.domains.get(imp, {}).get("minimum_mode", "FAST")
        derived_min_modes.append(dom_min)

    derived_mode_val = max([mode_hierarchy.get(m, 1) for m in derived_min_modes], default=1)
    rev_mode_map = {1: "FAST", 2: "STANDARD", 3: "RELEASE"}
    derived_minimum_mode = rev_mode_map[derived_mode_val]

    # Effective mode computation & downgrade check
    effective_mode = derived_minimum_mode
    mode_downgrade = False
    if requested_mode:
        req_val = mode_hierarchy[requested_mode]
        if req_val < derived_mode_val:
            mode_downgrade = True
            effective_mode = requested_mode
        else:
            effective_mode = requested_mode

    # Contexts resolution (PRIMARY ONLY)
    primary_contexts: List[str] = []
    for imp in sorted(all_impacts):
        dom = config.domains.get(imp, {})
        for ctx_id in dom.get("contexts", []):
            ctx_def = config.contexts.get(ctx_id, {})
            for prim in ctx_def.get("primary", []):
                if prim not in primary_contexts:
                    # Verify primary path exists
                    if not (config.repo_root / prim).exists():
                        raise ConfigIntegrityError(f"Context '{ctx_id}' primary path '{prim}' not found on disk")
                    primary_contexts.append(prim)

    # Skills resolution
    required_skills: List[str] = []
    for imp in sorted(all_impacts):
        dom = config.domains.get(imp, {})
        for sk in dom.get("skills", {}).get("required", []):
            if sk not in required_skills:
                required_skills.append(sk)

    # Gate resolution
    selected_gates: Set[str] = set()
    # 1. Mode always_gates
    mode_policy = config.gates_data.get("modes", {}).get(effective_mode, {})
    selected_gates.update(mode_policy.get("always_gates", []))

    # 2. Domain gates for effective_mode
    for imp in all_impacts:
        dom = config.domains.get(imp, {})
        selected_gates.update(dom.get("gates", []))
        if effective_mode in ("STANDARD", "RELEASE"):
            selected_gates.update(dom.get("standard_additions", []))
        if effective_mode == "RELEASE":
            selected_gates.update(dom.get("release_additions", []))

    # 3. Path & shared file additional gates
    selected_gates.update(path_additional_gates)

    # 4. Explicit include gates
    selected_gates.update(include_gates_set)

    # 5. Explicit user RELEASE full qualification gates
    if requested_mode == "RELEASE":
        full_qual = config.gates_data.get("modes", {}).get("RELEASE", {}).get("full_qualification_gates", [])
        selected_gates.update(full_qual)

    # Conditional gate candidates inspection
    conditional_gate_candidates: List[Dict[str, str]] = []
    for imp in sorted(all_impacts):
        dom = config.domains.get(imp, {})
        for cond in dom.get("conditional_gates", []):
            for g in cond.get("gates", []):
                conditional_gate_candidates.append({
                    "gate": g,
                    "when": cond.get("when", ""),
                    "domain": imp,
                    "active": g in selected_gates,
                })

    # Dependency resolution & Topological sorting
    ordered_gates = _topological_sort_gates(config, selected_gates)

    # Check required inputs
    required_inputs: List[str] = []
    if "backend-focused" in ordered_gates and not test_nodes_list:
        required_inputs.append("backend-focused: --test-node <pytest-node-id> required")

    # Determine status & blocking reasons
    blocking_reasons: List[str] = []
    status = "READY"

    if mode_downgrade:
        status = "MODE_DOWNGRADE_REJECTED"
        blocking_reasons.append(
            f"Cannot downgrade mode to '{requested_mode}'. Derived minimum is '{derived_minimum_mode}'."
        )
    elif unresolved_semantic_files:
        status = "BLOCKED_SEMANTIC_REVIEW"
        blocking_reasons.append(
            f"Semantic review required for shared/unmatched files: {', '.join(unresolved_semantic_files)}. "
            f"Provide --impact <domain> (candidate impacts: {', '.join(sorted(semantic_review_candidate_impacts))})"
        )
    elif required_inputs:
        status = "INPUT_REQUIRED"
        blocking_reasons.extend(required_inputs)

    return {
        "status": status,
        "base": base,
        "changed_files": changed_files,
        "derived_impacts": sorted(list(derived_impacts)),
        "explicit_impacts": sorted(list(explicit_impacts_set)),
        "minimum_mode": derived_minimum_mode,
        "requested_mode": requested_mode,
        "effective_mode": effective_mode,
        "semantic_review": {
            "required": bool(unresolved_semantic_files or semantic_review_candidate_impacts),
            "resolved": len(unresolved_semantic_files) == 0,
            "unresolved_files": unresolved_semantic_files,
            "candidate_impacts": sorted(list(semantic_review_candidate_impacts)),
        },
        "contexts": primary_contexts,
        "skills": required_skills,
        "gates": ordered_gates,
        "conditional_gate_candidates": conditional_gate_candidates,
        "required_inputs": required_inputs,
        "blocking_reasons": blocking_reasons,
    }


def _topological_sort_gates(config: HarnessConfig, initial_gates: Set[str]) -> List[str]:
    """Ensure all required dependency gates are included and ordered before dependents."""
    all_gates: Set[str] = set(initial_gates)

    def add_deps(g: str) -> None:
        gate_def = config.gates.get(g, {})
        for req in gate_def.get("requires_gates", []):
            if req not in all_gates:
                all_gates.add(req)
                add_deps(req)

    for g in list(initial_gates):
        add_deps(g)

    # Post-order DFS for topological sort
    visited: Set[str] = set()
    ordered: List[str] = []

    def visit(g: str) -> None:
        if g not in visited:
            visited.add(g)
            gate_def = config.gates.get(g, {})
            for req in gate_def.get("requires_gates", []):
                visit(req)
            ordered.append(g)

    for g in sorted(all_gates):
        visit(g)

    return ordered


def execute_verify(
    config: HarnessConfig,
    plan: Dict[str, Any],
    dry_run: bool = False,
    test_nodes: Optional[List[str]] = None,
    base: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute verification gates based on plan.
    """
    if plan["status"] != "READY":
        return {
            "plan": plan,
            "overall_status": plan["status"],
            "gate_results": [],
            "command_results": [],
            "error": f"Cannot verify. Plan status is {plan['status']}: {'; '.join(plan.get('blocking_reasons', []))}",
        }

    gates = plan["gates"]
    successful_gates: Set[str] = set()
    executed_commands: Dict[str, Dict[str, Any]] = {}
    gate_results: List[Dict[str, Any]] = []

    for gate_id in gates:
        gate_def = config.gates.get(gate_id, {})
        req_gates = gate_def.get("requires_gates", [])

        # Check dependency freshness (must have succeeded in this invocation)
        missing_dep = [req for req in req_gates if req not in successful_gates]
        if missing_dep:
            gate_results.append({
                "gate_id": gate_id,
                "status": "SKIPPED_DEPENDENCY_FAILURE",
                "missing_dependencies": missing_dep,
                "commands": gate_def.get("commands", []),
            })
            continue

        # Check manual gates
        if gate_def.get("automation_status") == "manual":
            gate_results.append({
                "gate_id": gate_id,
                "status": "MANUAL_REQUIRED",
                "viewport_matrix": gate_def.get("viewport_matrix", []),
                "zoom_percent": gate_def.get("zoom_percent", []),
                "assertions": gate_def.get("assertions", []),
                "commands": [],
            })
            continue

        cmd_ids = gate_def.get("commands", [])
        if dry_run:
            gate_results.append({
                "gate_id": gate_id,
                "status": "PASS",
                "dry_run": True,
                "commands": cmd_ids,
            })
            successful_gates.add(gate_id)
            continue

        # Execute commands for this gate
        gate_pass = True
        gate_details: Dict[str, Any] = {}

        for cmd_id in cmd_ids:
            if cmd_id not in executed_commands:
                cmd_def = config.commands[cmd_id]
                cwd = config.repo_root / cmd_def.get("cwd", ".")
                cmd_str = cmd_def["command"]

                # Append test nodes for backend-focused
                if cmd_id == "backend-focused":
                    if not test_nodes:
                        gate_results.append({
                            "gate_id": gate_id,
                            "status": "INPUT_REQUIRED",
                            "message": "backend-focused requires --test-node arguments",
                        })
                        gate_pass = False
                        break
                    cmd_str = f"{cmd_str} {' '.join(test_nodes)}"

                # Append diff range for docs-diff-check if base_aware
                if cmd_def.get("base_aware") and base:
                    cmd_str = f"{cmd_str} {base}"

                cmd_parts = shlex.split(cmd_str)
                if not cmd_parts:
                    continue

                exe_token = cmd_parts[0]
                resolved_exe = resolve_executable(exe_token)
                if not resolved_exe:
                    error_msg = (
                        f"Executable resolution failed for command '{cmd_id}': "
                        f"executable token '{exe_token}' could not be resolved in PATH (cwd: {cwd})"
                    )
                    cmd_result = {
                        "command_id": cmd_id,
                        "cmd": cmd_str,
                        "exit_code": 1,
                        "duration_ms": 0,
                        "stdout": "",
                        "stderr": error_msg,
                    }
                    executed_commands[cmd_id] = cmd_result
                    gate_pass = False
                    gate_details["failure_reason"] = error_msg
                    break

                cmd_parts[0] = resolved_exe

                t0 = time.time()
                try:
                    res = subprocess.run(
                        cmd_parts,
                        cwd=str(cwd),
                        capture_output=True,
                        text=True,
                        encoding="utf-8",
                        errors="replace",
                        check=False,
                    )
                    duration_ms = round((time.time() - t0) * 1000, 1)
                    cmd_result = {
                        "command_id": cmd_id,
                        "cmd": cmd_str,
                        "exit_code": res.returncode,
                        "duration_ms": duration_ms,
                        "stdout": res.stdout,
                        "stderr": res.stderr,
                    }
                except Exception as e:
                    cmd_result = {
                        "command_id": cmd_id,
                        "cmd": cmd_str,
                        "exit_code": 1,
                        "duration_ms": 0,
                        "stdout": "",
                        "stderr": f"Command execution failed for '{cmd_id}' (executable '{resolved_exe}', cwd: {cwd}): {e}",
                    }
                executed_commands[cmd_id] = cmd_result
            else:
                cmd_result = executed_commands[cmd_id]

            # Gate-specific assertions
            if gate_id == "map-b2-freeze":
                expected_hash = gate_def.get("expected_hash")
                stdout = cmd_result["stdout"]
                match = re.search(r"FROZEN B2 CONFIG SHA256:\s*([0-9a-fA-F]{64})", stdout)
                if cmd_result["exit_code"] != 0:
                    gate_pass = False
                    gate_details["failure_reason"] = "map-b2-hash command failed"
                elif not match:
                    gate_pass = False
                    gate_details["failure_reason"] = "Could not parse B2 SHA-256 from stdout"
                else:
                    actual_hash = match.group(1).lower()
                    gate_details["expected_hash"] = expected_hash
                    gate_details["actual_hash"] = actual_hash
                    if actual_hash != expected_hash:
                        gate_pass = False
                        gate_details["status"] = "B2_HASH_MISMATCH"
                        gate_details["failure_reason"] = f"B2 Hash mismatch: expected {expected_hash}, got {actual_hash}"

            elif gate_id == "backend-full":
                # Known failure set comparison
                stdout = cmd_result["stdout"]
                stderr = cmd_result["stderr"]
                output = stdout + "\n" + stderr

                failed_nodes = set(re.findall(r"^FAILED\s+([^\s]+)", output, re.MULTILINE))
                known_nodes = {f["test_node_id"] for f in config.known_failures_data.get("failures", [])}

                new_failures = failed_nodes - known_nodes
                baseline_improvements = known_nodes - failed_nodes

                gate_details["failed_node_count"] = len(failed_nodes)
                gate_details["known_node_count"] = len(known_nodes)
                gate_details["new_failures"] = sorted(list(new_failures))
                gate_details["baseline_improvements"] = sorted(list(baseline_improvements))
                gate_details["reason_check"] = "UNVERIFIED_REASON"

                if new_failures:
                    gate_pass = False
                    gate_details["status"] = "FAIL"
                    gate_details["failure_reason"] = f"{len(new_failures)} new failure(s) detected: {', '.join(sorted(new_failures))}"
                elif failed_nodes:
                    gate_pass = True
                    gate_details["status"] = "QUALIFIED_WITH_KNOWN_FAILURES"
                else:
                    gate_pass = True
                    gate_details["status"] = "PASS"

            else:
                if cmd_result["exit_code"] != 0:
                    gate_pass = False
                    gate_details["failure_reason"] = f"Command '{cmd_id}' failed with exit code {cmd_result['exit_code']}"

        # Record gate result
        if gate_pass:
            status = gate_details.get("status", "PASS")
            successful_gates.add(gate_id)
        else:
            status = gate_details.get("status", "FAIL")

        gate_results.append({
            "gate_id": gate_id,
            "status": status,
            "commands": cmd_ids,
            "details": gate_details,
        })

    # Overall verify status determination
    has_fail = any(r["status"] in ("FAIL", "B2_HASH_MISMATCH") for r in gate_results)
    has_manual = any(r["status"] == "MANUAL_REQUIRED" for r in gate_results)
    has_input = any(r["status"] == "INPUT_REQUIRED" for r in gate_results)
    has_skip = any(r["status"] == "SKIPPED_DEPENDENCY_FAILURE" for r in gate_results)

    if has_fail:
        overall_status = "FAILED"
    elif has_manual or has_input or has_skip:
        overall_status = "INCOMPLETE"
    else:
        overall_status = "PASSED"

    # Sanitize command results for reporting
    cmd_summaries = []
    for c in executed_commands.values():
        cmd_summaries.append({
            "command_id": c["command_id"],
            "cmd": c["cmd"],
            "exit_code": c["exit_code"],
            "duration_ms": c["duration_ms"],
            "stdout_preview": c["stdout"][:200] if c["stdout"] else "",
            "stderr_preview": c["stderr"][:200] if c["stderr"] else "",
            "stderr": c["stderr"],
        })

    return {
        "plan": plan,
        "overall_status": overall_status,
        "gate_results": gate_results,
        "command_results": cmd_summaries,
    }


def format_plan_text(plan: Dict[str, Any]) -> str:
    """Format plan output as concise readable text."""
    lines = [
        "==================================================",
        f"HARNESS PLAN: {plan['status']}",
        "==================================================",
    ]
    if plan.get("base"):
        lines.append(f"Base ref:        {plan['base']}")
    lines.append(f"Changed files:   {len(plan['changed_files'])}")
    for f in plan["changed_files"][:10]:
        lines.append(f"  - {f}")
    if len(plan["changed_files"]) > 10:
        lines.append(f"  ... and {len(plan['changed_files']) - 10} more")

    lines.append(f"Derived impacts: {', '.join(plan['derived_impacts']) or 'none'}")
    if plan.get("explicit_impacts"):
        lines.append(f"Explicit impacts:{', '.join(plan['explicit_impacts'])}")

    lines.append(f"Minimum mode:    {plan['minimum_mode']}")
    if plan.get("requested_mode"):
        lines.append(f"Requested mode:  {plan['requested_mode']}")
    lines.append(f"Effective mode:  {plan['effective_mode']}")

    lines.append("Primary contexts:")
    for ctx in plan["contexts"]:
        lines.append(f"  - {ctx}")

    lines.append(f"Required skills: {', '.join(plan['skills']) or 'none'}")
    lines.append(f"Selected gates:  {', '.join(plan['gates'])}")

    if plan["conditional_gate_candidates"]:
        lines.append("Conditional gate candidates:")
        for cand in plan["conditional_gate_candidates"]:
            act = "[ACTIVE]" if cand.get("active") else "[inactive]"
            lines.append(f"  {act} {cand['gate']} (when: {cand['when']})")

    if plan["blocking_reasons"]:
        lines.append("\nBLOCKING REASONS:")
        for r in plan["blocking_reasons"]:
            lines.append(f"  ! {r}")

    return "\n".join(lines)


def format_verify_text(result: Dict[str, Any]) -> str:
    """Format verification result as readable text."""
    plan = result["plan"]
    lines = [
        format_plan_text(plan),
        "",
        "==================================================",
        f"VERIFICATION RESULTS: {result['overall_status']}",
        "==================================================",
    ]

    for g in result.get("gate_results", []):
        gid = g["gate_id"]
        st = g["status"]
        lines.append(f"[{st:^28}] Gate: {gid}")
        if st == "MANUAL_REQUIRED":
            lines.append(f"   Viewports: {g.get('viewport_matrix', [])}")
            lines.append(f"   Assertions: {g.get('assertions', [])}")
        elif st == "QUALIFIED_WITH_KNOWN_FAILURES":
            det = g.get("details", {})
            lines.append(f"   Known failures accounted: {det.get('failed_node_count', 0)} / {det.get('known_node_count', 0)}")
            lines.append("   Material reason check: UNVERIFIED_REASON")
        elif st == "SKIPPED_DEPENDENCY_FAILURE":
            lines.append(f"   Missing fresh dependencies: {g.get('missing_dependencies', [])}")
        elif st in ("FAIL", "B2_HASH_MISMATCH"):
            lines.append(f"   Failure: {g.get('details', {}).get('failure_reason', 'Unspecified error')}")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Saigon Port Lean SE Harness")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    def add_common_args(p: argparse.ArgumentParser) -> None:
        p.add_argument("--base", type=str, default=None, help="Base git ref for committed range (e.g. HEAD~1)")
        p.add_argument("--mode", type=str, choices=["FAST", "STANDARD", "RELEASE"], default=None, help="Requested mode")
        p.add_argument("--impact", type=str, action="append", default=[], help="Explicit affected domain impact")
        p.add_argument("--include-gate", type=str, action="append", default=[], help="Explicitly activate a conditional gate")
        p.add_argument("--test-node", type=str, action="append", default=[], help="Pytest test node ID for backend-focused")
        p.add_argument("--json", action="store_true", help="Output machine-readable JSON")

    plan_parser = subparsers.add_parser("plan", help="Plan impact, mode, contexts, skills, and gates")
    add_common_args(plan_parser)

    verify_parser = subparsers.add_parser("verify", help="Execute gates and verify results")
    add_common_args(verify_parser)
    verify_parser.add_argument("--dry-run", action="store_true", help="Simulate execution without running commands")

    args = parser.parse_args()
    repo_root = find_repo_root()

    try:
        config = HarnessConfig(repo_root)
        changed_files = discover_changed_files(repo_root, base=args.base)
        plan = resolve_plan(
            config=config,
            changed_files=changed_files,
            requested_mode=args.mode,
            explicit_impacts=args.impact,
            include_gates=args.include_gate,
            test_nodes=args.test_node,
            base=args.base,
        )

        if args.subcommand == "plan":
            if args.json:
                print(json.dumps(plan, indent=2))
            else:
                print(format_plan_text(plan))

            if plan["status"] == "READY":
                return EXIT_OK
            elif plan["status"] in ("BLOCKED_SEMANTIC_REVIEW", "INPUT_REQUIRED", "NO_LOCAL_CHANGES"):
                return EXIT_INCOMPLETE
            elif plan["status"] in ("MODE_DOWNGRADE_REJECTED", "CONFIG_INTEGRITY_ERROR"):
                return EXIT_CONFIG_ERROR
            return EXIT_INCOMPLETE

        elif args.subcommand == "verify":
            verify_res = execute_verify(
                config=config,
                plan=plan,
                dry_run=args.dry_run,
                test_nodes=args.test_node,
                base=args.base,
            )

            if args.json:
                print(json.dumps(verify_res, indent=2))
            else:
                print(format_verify_text(verify_res))

            overall = verify_res["overall_status"]
            if overall == "PASSED":
                return EXIT_OK
            elif overall == "FAILED":
                return EXIT_REGRESSION
            elif overall in ("INCOMPLETE", "BLOCKED_SEMANTIC_REVIEW", "INPUT_REQUIRED", "NO_LOCAL_CHANGES"):
                return EXIT_INCOMPLETE
            return EXIT_CONFIG_ERROR

    except ConfigIntegrityError as e:
        err_dict = {"status": "CONFIG_INTEGRITY_ERROR", "error": str(e)}
        if args.json:
            print(json.dumps(err_dict, indent=2))
        else:
            print(f"CONFIG_INTEGRITY_ERROR: {e}", file=sys.stderr)
        return EXIT_CONFIG_ERROR
    except Exception as e:
        err_dict = {"status": "UNEXPECTED_ERROR", "error": str(e)}
        if args.json:
            print(json.dumps(err_dict, indent=2))
        else:
            print(f"ERROR: {e}", file=sys.stderr)
        return EXIT_CONFIG_ERROR

    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
