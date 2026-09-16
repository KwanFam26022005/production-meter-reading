# V16D — Asset & Meter Data Verification Model

## 1. Executive Summary
The V16D verification architecture establishes a strict, evidence-backed human review process to populate authoritative asset and relationship data within the Saigon Port operational infrastructure.

The core guiding principle is:
> **Physical infrastructure truth cannot be synthesized or inferred by algorithms.**
> Automated discovery outputs are strictly treated as **unverified candidate hypotheses** until verified by authorized human port engineers with concrete evidence.

---

## 2. The Verification Progression Pipeline

```
┌─────────────────────────┐
│   DISCOVERY ARTIFACT    │ (Heuristic analysis, text mining, name parsing)
└───────────┬─────────────┘
            │ Ingestion (`POST /api/v1/admin/assets/import-candidates`)
            ▼
┌─────────────────────────┐
│  UNVERIFIED CANDIDATE   │ (source = 'DISCOVERY_PROPOSAL', verification_status = 'UNVERIFIED',
└───────────┬─────────────┘  coordinates = NULL, confidence = LOW | MEDIUM | HIGH)
            │
            ▼
┌─────────────────────────┐
│      HUMAN REVIEW       │ (Admin Verification Workspace: review metadata, drawings, field notes)
└───────────┬─────────────┘
            │
      ┌─────┴───────────────────────────────────────────────────────┐
      │ Reject                                                     │ Verify with Evidence
      ▼                                                            ▼
┌───────────┐                                            ┌───────────────────┐
│ REJECTED  │                                            │  VERIFIED ASSET   │ (Evidence logged)
└─────┬─────┘                                            └─────────┬─────────┘
      │ Reopen                                                     │
      └────────────────────────┐                                   ▼
                               │                         ┌───────────────────┐
                               │                         │  VERIFIED METER   │ (INSTALLED_AT / MEASURES)
                               │                         │   RELATIONSHIP    │ (Single active primary)
                               │                         └─────────┬─────────┘
                               │                                   │
                               ▼                                   ▼
                        ┌─────────────┐                  ┌───────────────────┐
                        │ UNVERIFIED  │                  │ VERIFIED TOPOLOGY │ (Optional downstream/
                        │  CANDIDATE  │                  │    CONNECTION     │  upstream tracing)
                        └─────────────┘                  └───────────────────┘
```

---

## 3. Strict Separation: Confidence vs Verification Status

A critical architectural distinction in V16D is separating heuristic confidence from operational verification:

| Dimension | Values | Meaning |
| :--- | :--- | :--- |
| **`confidence`** | `LOW`, `MEDIUM`, `HIGH` | Statistical or heuristic assessment of hypothesis plausibility based on text analysis or naming patterns. |
| **`verification_status`** | `UNVERIFIED`, `VERIFIED`, `REJECTED` | Authoritative operational state. Only authorized personnel can transition an entity to `VERIFIED` by attaching verifiable evidence. |

Even a candidate with `HIGH` confidence remains strictly `UNVERIFIED` until an authorized engineer conducts physical or documented review.

---

## 4. Evidence-Backed Verification Architecture

To eliminate arbitrary or bulk "rubber-stamp" approvals, every state transition to `VERIFIED` requires an audit record in the `VerificationEvidence` table:

```sql
CREATE TABLE verification_evidences (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,    -- 'ASSET', 'METER_ASSET_RELATION', 'ASSET_CONNECTION', 'ASSET_POSITION'
    entity_id VARCHAR(36) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,  -- 'FIELD_INSPECTION', 'PORT_DOCUMENT', 'ELECTRICAL_DRAWING', etc.
    evidence_reference VARCHAR(255) NOT NULL, -- Document code, inspection report number, or nameplate ID
    notes TEXT,
    verified_by VARCHAR(36) REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Supported Evidence Types
1. `FIELD_INSPECTION`: On-site visual inspection by electrical or maintenance staff.
2. `PHYSICAL_INSPECTION`: Formal inspection session with physical inspection record.
3. `PORT_DOCUMENT`: Port infrastructure register, maintenance contract, or handover docket.
4. `EQUIPMENT_NAMEPLATE`: Physical stamped serial/model tag on the transformer, pump, crane, or switchboard.
5. `ELECTRICAL_DRAWING` / `ELECTRICAL_DIAGRAM`: Authoritative electrical schematic or single-line diagram.
6. `WATER_DRAWING`: As-built plumbing or hydraulic network drawing.
7. `SINGLE_LINE_DIAGRAM`: High/medium voltage single-line diagram.
8. `SCADA_CONFIG`: Validated telemetry address / SCADA terminal configuration.
9. `OTHER`: Specific reference noted in the `notes` field.

---

## 5. Backward Compatibility & System Integrity

1. **Zero Verified Assets in Production**:
   The system remains 100% operational when no assets are verified. Routine meter readings, mobile reading rounds, telemetry, inspection logs, and spatial calibration operate without depending on asset records.
2. **Spatial Baseline Invariant**:
   The canonical spatial baseline (`ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3`) remains completely untouched.
3. **No Automatic Coordinate Derivation**:
   Asset candidates are ingested with `map_x = NULL, map_y = NULL`. They do NOT automatically adopt meter coordinates. Positioning requires deliberate spatial verification.
