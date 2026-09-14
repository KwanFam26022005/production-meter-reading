# V16A — Degraded Fallback Policy & Resilience Specification

## 1. Objective & Resilience Principles

The primary objective of the V16A Fallback Policy is to maintain uninterrupted operational reading capabilities in maritime port operations even in the event of database unavailability, network loss, or backend configuration failure.

Operational readings cannot be halted by transient API timeouts. However, the system must never falsely present static or cached data as authoritative.

---

## 2. Trigger Conditions

The fallback mechanism is automatically activated under any of the following failure modes:
1. **Network Disconnection / Offline Mode**: The client browser cannot reach `/api/v1/map-config/active`.
2. **HTTP Server Error (5xx)**: Database lock, uncaught exception, or server restart.
3. **Empty or Corrupt Map Configuration**: The active map configuration endpoint returns HTTP 200 but contains fewer than 6 zones, non-numeric bounds, or invalid JSON.
4. **Client Initialization Timeout**: If the initial config query fails to resolve.

---

## 3. Fallback Operational Characteristics

When fallback activates, `createDegradedFallbackConfiguration()` constructs a fallback configuration:

| Attribute | Normal Authoritative State | Degraded Fallback State |
| :--- | :--- | :--- |
| **Data Source** | Backend SQLite (`app.db`) | Bundled static fallback (`operationalGeometry.ts`) |
| **`authoritative` Flag** | `true` | `false` |
| **`source` Flag** | `'db'` | `'fallback'` |
| **Console Warning** | None | `[DEGRADED_MAP_CONFIGURATION] ...` emitted |
| **Zone Count** | 6 active calibrated zones | 6 canonical fallback zones |
| **Meter Interaction** | Fully enabled | Fully enabled (readings recorded locally/synced) |
| **Map Calibration** | Active editing & publishing permitted | Disabled / Warning displayed |

---

## 4. Degraded Mode Contract

```typescript
export function createDegradedFallbackConfiguration(): ActiveMapConfiguration {
  console.warn(
    '[DEGRADED_MAP_CONFIGURATION] Failed to fetch authoritative map configuration from server. ' +
    'Falling back to bundled static geometry with non-authoritative status.'
  );

  return {
    mapId: 'tan-thuan',
    versionId: 'static-fallback-v10',
    versionNumber: 'tan-thuan-v10-fallback',
    coordinateSystem: 'tan-thuan-canonical-image-pixel-space-v1',
    canonicalWidth: 1915,
    canonicalHeight: 821,
    sourceAsset: 'tan-thuan-canonical-base.png',
    sourceChecksum: null,
    geometrySchemaVersion: '1.0',
    status: 'PUBLISHED',
    revision: 1,
    publishedAt: null,
    zones: fallbackZones,
    landmarks: [],
    source: 'fallback',
    authoritative: false,
  };
}
```

---

## 5. Recovery & Cache Invalidation

1. **Manual Refetch**:
   - `MapConfigurationProvider` exposes `refetch(): Promise<void>`.
   - The Top Bar or Admin Console refresh action triggers `refetch()`.
2. **Post-Publish Invalidation**:
   - When an administrator publishes a new map version in the Map Calibration Workspace, the `onPublishSuccess` callback triggers `refetch()`.
   - The provider updates its state to `authoritative: true` and `source: 'db'`, immediately reflecting the updated zone boundaries without requiring a full browser reload or frontend rebuild.
