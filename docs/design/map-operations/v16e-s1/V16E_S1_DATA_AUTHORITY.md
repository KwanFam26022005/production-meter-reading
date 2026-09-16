# V16E-S1: Data Authority & Empty Network State Resolution (Item 29)

## 1. Problem Description (Item 29)

In earlier iterations of Phase V16E, the Utility Network View (`UtilityNetworkView.tsx`) exhibited an empty state when viewing the network topology:
```
"Mạng lưới không có dữ liệu đã xác minh"
```
The root cause was a strict data authority filter:
- Backend: `conn_query.filter(AssetConnection.verification_status == "VERIFIED")`
- Frontend: `node.verification_status === 'VERIFIED'`

Because unverified mock assets could not be legitimately marked `VERIFIED` without official field documents, the entire utility graph collapsed into an empty state.

---

## 2. Technical Architecture Resolution

To decouple enterprise legal compliance from simulation engineering, Phase V16E-S1 introduced a first-class status:

### `SIMULATION_APPROVED`

1. **Schema Enum Extension**:
   - Backend `schemas.py`: `AssetVerificationStatus = Literal["UNVERIFIED", "PENDING_REVIEW", "VERIFIED", "REJECTED", "SIMULATION_APPROVED"]`
   - Frontend `types.ts`: `export type AssetVerificationStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SIMULATION_APPROVED';`

2. **Backend Network Scoping**:
   ```python
   # backend/app/asset_operations.py
   allowed_statuses = ["VERIFIED", "SIMULATION_APPROVED"]
   conn_query = conn_query.filter(AssetConnection.verification_status.in_(allowed_statuses))
   ```

3. **Frontend Topology Rendering**:
   ```typescript
   // frontend/src/features/map-operations/network/UtilityNetworkView.tsx
   const isStatusVerifiedOrSimApproved = (status?: string) =>
     status === 'VERIFIED' || status === 'SIMULATION_APPROVED';
   ```

4. **Results**:
   - **Electricity Network**: 24 edges, 21 nodes rendered immediately with hierarchical tree layout.
   - **Water Network**: 7 edges, 6 nodes rendered with distribution layout.
   - **Zero Empty State Bug**: Graphs display reliably on first load.
   - **Enterprise Honesty Preserved**: Official `VERIFIED` status remains reserved for real surveyed equipment.
