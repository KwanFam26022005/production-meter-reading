# V8 Camera Engine & Safe Viewport Contract — Cảng Tân Thuận

## Programmatic Camera Architecture

Per Gate 12, manual +/- zoom controls are completely eliminated from the map canvas. Viewport framing is driven exclusively by programmatic camera intents:

```typescript
export type CameraIntent =
  | 'PORT_OVERVIEW'
  | 'ZONE_FOCUS'
  | 'OPERATOR_FOCUS'
  | 'METER_FOCUS'
  | 'PLACEMENT_FOCUS';
```

## Intent Behavior Matrix

| Intent | Target Entity | Zoom Level | Camera Action |
| :--- | :--- | :---: | :--- |
| `PORT_OVERVIEW` | Full Port | `1.00` | Centers scene, pan reset to (0, 0) |
| `ZONE_FOCUS` | Presentation Zone | `1.15`–`1.85` | Fits zone bounding box into safe canvas |
| `OPERATOR_FOCUS` | Operator Responsibility | `1.35` | Centers operator anchor and assigned points |
| `METER_FOCUS` | Physical Meter | `1.45` | Centers meter point with local context |
| `PLACEMENT_FOCUS` | Candidate / Zone | `1.20`–`1.50` | Centers target placement polygon |

## Safe Viewport Offsets

To prevent floating inspectors and docked context rails from occluding spatial assets, the camera engine offsets target centering:
- `top`: 96px (clears MapHeader and temporal control)
- `left`: 32px (canvas margin)
- `bottom`: 64px (navigation HUD)
- `right`:
  - Mode `browse`: 32px
  - Mode `inspect`: 352px (SpatialInspector 312px + 40px margin)
  - Mode `details` / `placement`: 392px (MapContextRail 360px + 32px margin)
