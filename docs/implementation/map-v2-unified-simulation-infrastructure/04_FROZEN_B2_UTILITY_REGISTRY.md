# 04 — Frozen B2 Utility Registry

## 1. Cryptographic Invariant & Layout Key

The utility infrastructure topology is pinned to the frozen `B2` layout configuration:
- **Recommended Layout Key**: `B2`
- **Frozen Layout SHA256 Checksum**: `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`
- **Total Nodes**: 17
- **Total Edges**: 15
- **Canonical Unique Crossing Coordinate**: `(740, 520)`

## 2. Electricity Network (`SIM-ELECTRICITY-B2`)

- **Root Source Node**: `SIM-EXT-GRID` (Grid Substation at `(180, 220)`)
- **Distribution Nodes**:
  - `SIM-EM-SUB-1`: Main Switchgear 1 at `(320, 220)`
  - `SIM-EM-SUB-2`: Main Switchgear 2 at `(740, 360)`
- **Branch Nodes**:
  - `SIM-EM-BR-1`: Berth Distribution Branch at `(520, 220)`
  - `SIM-EM-BR-2`: Container Distribution Branch at `(740, 580)`
- **Host Nodes & Meter Bindings**:
  - `SIM-EM-HOST-1` at `(480, 160)` ↔ `SIM-EM-001`
  - `SIM-EM-HOST-2` at `(640, 160)` ↔ `SIM-EM-002`
  - `SIM-EM-HOST-3` at `(820, 160)` ↔ `SIM-EM-003`
  - `SIM-EM-HOST-4` at `(520, 320)` ↔ `SIM-EM-004`
  - `SIM-EM-HOST-5` at `(880, 580)` ↔ `SIM-EM-005`
  - `SIM-EM-HOST-6` at `(960, 720)` ↔ `SIM-EM-006`

## 3. Water Network (`SIM-WATER-B2`)

- **Root Source Node**: `SIM-CITY-WATER` (Municipal Inflow at `(740, 880)`)
- **Distribution Node**:
  - `SIM-WM-PUMP-1`: Primary Booster Pump at `(740, 720)`
- **Host Nodes & Meter Bindings**:
  - `SIM-WM-HOST-1` at `(740, 440)` ↔ `SIM-WM-001`
  - `SIM-WM-HOST-2` at `(920, 440)` ↔ `SIM-WM-002`
  - `SIM-WM-HOST-3` at `(600, 720)` ↔ `SIM-WM-003`
  - `SIM-WM-HOST-4` at `(600, 880)` ↔ `SIM-WM-004`

## 4. Visual Semantics

Following `DESIGN_DNA.md` and `saigon-port-ui`:
- **Electricity Line**: Amber `#FFB703` (Technical) / `#FFC107` (Stroke width: 2.5px)
- **Water Line**: Digital Blue `#0068FF` (Technical) / `#0080FF` (Stroke width: 2.5px)
- **Host Highlight**: Outer pulsing ring `#FFB703` (4.5px stroke, radius 14px)
- **Upstream Trace Path**: High-visibility stroke with accent glow tracing node-by-node to the source root.
