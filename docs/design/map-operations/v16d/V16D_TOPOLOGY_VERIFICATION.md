# V16D — Utility Topology Review & Verification

## 1. Scope & Objective
This document defines the topology verification rules for utility network connections (Power and Water) between port infrastructure assets.

---

## 2. Verified-Only Graph Traversal Policy

To prevent simulated or unverified assumptions from contaminating mission-critical operational decisions, graph traversal enforces a strict verified-only policy:

| Traversal Flag | Policy | Description |
| :--- | :--- | :--- |
| `verified_only = True` *(default)* | **Strict Operational Safety** | Only traverses edges with `verification_status = 'VERIFIED'` and `valid_to IS NULL`. Unverified hypotheses are ignored. |
| `verified_only = False` (`include_unverified = True`) | **Planning & Review Mode** | Traverses both verified and unverified candidate edges for engineers reviewing hypothetical grid extensions or network models. |

---

## 3. Connection Verification Endpoint

```http
POST /api/v1/admin/asset-connections/{connection_id}/verify
Content-Type: application/json
X-CSRF-Token: <token>

{
  "evidence_type": "SINGLE_LINE_DIAGRAM",
  "evidence_reference": "SLD-2026-PORT-ELEC-01",
  "notes": "Bản vẽ hoàn công hệ thống cáp điện ngầm"
}
```

### Response
- `verification_status`: Transitions from `UNVERIFIED` to `VERIFIED`.
- `VerificationEvidence` record created in DB.
- `admin_audit_logs` event emitted.

---

## 4. Directional Semantics
- **`SUPPLIES`**: Directional power/water feed (Source asset supplies Target asset).
- **`CONNECTED_TO`**: Bidirectional auxiliary interconnection (e.g. tie-breaker, bypass bus).

Downstream tracing follows `SUPPLIES` forward and `CONNECTED_TO` in both directions.
Upstream tracing follows `SUPPLIES` in reverse to find feeder transformers or main water intake points.
Cycle prevention is strictly enforced using depth-first search (DFS) with visited sets to guarantee termination.
