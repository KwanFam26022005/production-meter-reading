import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_ASPECT_RATIO,
  MAP_CANVAS_DIAGNOSTICS,
} from '../src/features/map-operations/geometry/canonicalScene';
import { derivePresentationZoneAnalytics } from '../src/features/map-operations/analytics/presentationAnalytics';
import type { MapMeterItem } from '../src/features/map-operations/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================================
// SUITE 1: ANALYTICS CONTENT COMPRESSION (Section 1-6)
// ===========================================================================

test('V13.4 Analytics: Redundant headings, subtitles, and duplicate zone labels are strictly absent', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const code = fs.readFileSync(surfacePath, 'utf-8');

  // Redundant texts that must be removed per Section 1
  assert.equal(code.includes('Chất lượng & Tiến độ'), false, '"Chất lượng & Tiến độ" must be absent');
  assert.equal(
    code.includes('Độ chính xác OCR & tiến độ theo phân khu'),
    false,
    '"Độ chính xác OCR & tiến độ theo phân khu" must be absent'
  );
  assert.equal(
    code.includes('title="Tiến độ phân khu" eyebrow="TIẾN ĐỘ PHÂN KHU"'),
    false,
    'Duplicate "TIẾN ĐỘ PHÂN KHU" + "Tiến độ phân khu" must be absent'
  );

  // Clean final header per Section 1
  assert.ok(code.includes('PHÂN TÍCH VẬN HÀNH'), 'Header must contain clean PHÂN TÍCH VẬN HÀNH title');
  assert.ok(code.includes('analytics-icon'), 'Header must contain analytics icon');
  assert.ok(code.includes('sgp-rail-close-btn'), 'Header must contain close button');
});

test('V13.4 Analytics: Exactly two MiniDonuts with "OCR" and "Hoàn tất" captions (size 68-72px, stroke 6px)', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const code = fs.readFileSync(surfacePath, 'utf-8');

  // Exactly two MiniDonuts
  const donutMatches = code.match(/<MiniDonut\b/g);
  assert.equal(donutMatches?.length, 2, 'UnifiedContextSurface must render exactly 2 MiniDonut components');

  // Caption and sizing verification (Section 2)
  assert.ok(code.includes('caption="OCR"'), 'Must render MiniDonut with caption "OCR"');
  assert.ok(code.includes('caption="Hoàn tất"'), 'Must render MiniDonut with caption "Hoàn tất"');
  assert.ok(code.includes('size={70}') || code.includes('size={72}'), 'MiniDonut size must be 68-72px');
  assert.ok(code.includes('strokeWidth={6}'), 'MiniDonut strokeWidth must be 6px');
});

test('V13.4 Analytics: Secondary metrics is compact single row and does NOT repeat issue count', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const code = fs.readFileSync(surfacePath, 'utf-8');

  // Find the inline metrics container
  const metricsRowMatch = code.match(/className="sgp-analytics-inline-metrics"[\s\S]*?<\/div>/);
  assert.ok(metricsRowMatch, 'Must render sgp-analytics-inline-metrics container');

  const metricsRow = metricsRowMatch[0];
  assert.ok(metricsRow.includes('chỉnh sửa'), 'Inline metrics row must include "chỉnh sửa"');
  assert.ok(metricsRow.includes('xác nhận'), 'Inline metrics row must include "xác nhận"');
  assert.ok(metricsRow.includes('thủ công'), 'Inline metrics row must include "thủ công"');

  // Issue count must NOT be repeated in secondary metrics row (Section 3)
  assert.equal(
    metricsRow.includes('vấn đề'),
    false,
    'Issue count must NOT appear in the secondary metrics row'
  );
});

test('V13.4 Analytics: Zone section has single heading "THEO PHÂN KHU" and exactly six PresentationZone rows', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const code = fs.readFileSync(surfacePath, 'utf-8');

  // Single heading without subtitle (Section 4)
  assert.ok(code.includes('THEO PHÂN KHU'), 'Zone section must declare single heading "THEO PHÂN KHU"');
  assert.ok(
    code.includes("gridTemplateColumns: 'minmax(0, 1fr) auto'"),
    'Zone rows must use grid-template-columns: minmax(0, 1fr) auto'
  );

  // Exactly six presentation zones derived
  const report = derivePresentationZoneAnalytics([]);
  assert.equal(report.zones.length, 6, 'Must generate exactly 6 presentation zones');
});

test('V13.4 Analytics: Issue count appears only in issue accordion (collapsed by default)', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const code = fs.readFileSync(surfacePath, 'utf-8');

  assert.ok(
    code.includes('const [isIssueQueueExpanded, setIsIssueQueueExpanded] = useState(false);'),
    'Issue queue must be collapsed by default (useState(false))'
  );
  assert.ok(
    code.includes('⚠ {canonicalIssueCount} vấn đề cần xử lý') || code.includes('{canonicalIssueCount} vấn đề cần xử lý'),
    'Accordion button must display count with format ⚠ N vấn đề cần xử lý'
  );
  assert.ok(
    code.includes('{isIssueQueueExpanded && ('),
    'Issue rows must only be rendered when expanded'
  );
});

// ===========================================================================
// SUITE 2: METER MARKER VISUAL HIERARCHY & HALO (Section 7-11, 15-16)
// ===========================================================================

test('V13.4 Meters: Hexagonal silhouette differs distinctively from operator circle', () => {
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');

  // Meter uses hexagonal path silhouette
  assert.ok(
    meterCode.includes('d="M 0 -10 L 8.66 -5 L 8.66 5 L 0 10 L -8.66 5 L -8.66 -5 Z"') ||
    meterCode.includes('M 0 -11 L 9.5 -5.5 L 9.5 5.5 L 0 11'),
    'Meter marker must render hexagonal silhouette path'
  );

  // Operator uses circular circle element
  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');
  assert.ok(
    opCode.includes('r={15.5}') && opCode.includes('<circle'),
    'Operator marker must render circular silhouette'
  );
});

test('V13.4 Meters: White separation halo and dark navy body with restrained shadow', () => {
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');

  // Outer stroke rgba(255,255,255,0.85-0.92), width 1.5-2px, dark maritime/navy body
  assert.ok(meterCode.includes('rgba(255, 255, 255, 0.90)'), 'Must declare white separation halo stroke');
  assert.ok(meterCode.includes('strokeWidth={1.8}'), 'Outer stroke width must be 1.8px (within 1.5-2px)');
  assert.ok(meterCode.includes('fill="#0B192C"'), 'Marker body must be dark maritime/navy (#0B192C)');
  assert.ok(meterCode.includes('drop-shadow(0 2px 4px rgba(0, 15, 25, 0.40))'), 'Must declare restrained drop shadow');
});

test('V13.4 Meters: LOD scales exist for Overview, Zone Focus, and Selected', () => {
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');

  assert.ok(meterCode.includes("'OVERVIEW'"), 'Overview LOD must exist');
  assert.ok(meterCode.includes("'ZONE_FOCUS'"), 'Zone Focus LOD must exist');
  assert.ok(meterCode.includes("'ENTITY_FOCUS'"), 'Selected/Entity Focus LOD must exist');

  // Overview 15-17px (0.80), Zone focus 18-20px (0.95), Selected 22-24px (1.15)
  assert.ok(meterCode.includes('0.80'), 'Overview lodScale must target ~16px (0.80)');
  assert.ok(meterCode.includes('0.95'), 'Zone Focus lodScale must target ~19px (0.95)');
  assert.ok(meterCode.includes('1.15'), 'Selected lodScale must target ~23px (1.15)');
});

test('V13.4 Meters: Screen touch target is >= 44px across all LOD scales and zooms', () => {
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');

  // Radius 22 / lodScale inside scale(lodScale / cameraZoom) * cameraZoom = radius 22px -> diameter 44px
  assert.ok(
    meterCode.includes('r={22 / lodScale}'),
    'Must declare invisible hit target with r={22 / lodScale} guaranteeing >= 44px screen hit target'
  );
});

test('V13.4 Meters: Issue badge renders only for overdue/review states', () => {
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');

  assert.ok(
    meterCode.includes('{isException && ('),
    'Issue badge must only be mounted when isException is true'
  );
  assert.ok(
    meterCode.includes('sgp-meter-issue-badge'),
    'Issue badge must have sgp-meter-issue-badge class'
  );
});

// ===========================================================================
// SUITE 3: OPERATOR MARKER REDESIGN & PROGRESS RING (Section 12-14)
// ===========================================================================

test('V13.4 Operators: Structure has white separation ring, progress ring, dark body, and initials', () => {
  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');

  assert.ok(opCode.includes('rgba(255, 255, 255, 0.90)'), 'Must declare white separation ring');
  assert.ok(opCode.includes('rgba(255, 255, 255, 0.22)'), 'Progress ring track must be rgba(255,255,255,.18-.24)');
  assert.ok(opCode.includes('#06B6D4') || opCode.includes('#38BDF8'), 'Progress color must be operational teal/cyan');
  assert.ok(opCode.includes('strokeWidth={2.8}'), 'Progress ring stroke width must be 2.8px (within 2.5-3px)');
  assert.ok(opCode.includes('#0B192C'), 'Inner avatar body must be dark disc');
  assert.ok(opCode.includes('{initial}'), 'Must display operator initials');
});

test('V13.4 Operators: Issue badge condition and obstruction prevention', () => {
  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');

  // Render ONLY when issueCount > 0
  assert.ok(
    opCode.includes('{issueCount > 0 && ('),
    'Issue badge must be conditioned on issueCount > 0'
  );

  // Positioned outside avatar disc so initials remain clear
  assert.ok(
    opCode.includes('transform="translate(11, -11)"'),
    'Badge must be positioned at top-right (11, -11), clear of initials disc'
  );
});

test('V13.4 Operators: Screen-size normalization and >= 44px hit target', () => {
  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');

  assert.ok(
    opCode.includes('presentationScale = lodScale / safeZoom'),
    'Must normalize presentation scale by zoom'
  );
  assert.ok(
    opCode.includes('r={22 / lodScale}'),
    'Must declare >= 44px invisible touch target'
  );
});

// ===========================================================================
// SUITE 4: Z-ORDER RENDER PRIORITY (Section 17)
// ===========================================================================

test('V13.4 Z-Order: Render priority base -> zone fill -> zone stroke -> zone label -> normal meter -> operator -> issue entity -> selected entity -> interaction overlay', () => {
  const scenePath = path.resolve(__dirname, '../src/features/map-operations/scene/OperationalScene.tsx');
  const sceneCode = fs.readFileSync(scenePath, 'utf-8');

  // Verify render sequence inside worldGroupRef
  const basePos = sceneCode.indexOf('<CanonicalBaseMap');
  const zonePos = sceneCode.indexOf('<ZoneLayer');
  const labelPos = sceneCode.indexOf('<LabelsLayer');
  const normalMeterPos = sceneCode.indexOf('filterTier="normal"');
  const overlayPos = sceneCode.indexOf('{placementSvgLayer}');

  assert.ok(basePos !== -1, 'CanonicalBaseMap must be rendered');
  assert.ok(zonePos > basePos, 'ZoneLayer must follow CanonicalBaseMap');
  assert.ok(labelPos > zonePos, 'LabelsLayer must follow ZoneLayer');
  assert.ok(normalMeterPos > labelPos, 'MeterLayer filterTier="normal" must follow LabelsLayer');
  assert.ok(overlayPos > normalMeterPos, 'Placement interaction overlay must be on top of entities');
});

// ===========================================================================
// SUITE 5: MOTION CONTRACT & REDUCED MOTION (Section 20)
// ===========================================================================

test('V13.4 Motion: Functional motion contract with hover (120-150ms), selection (180-220ms), and reduced-motion branch', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Hover 120-150ms (140ms ease-out)
  assert.ok(css.includes('transition: transform 140ms ease-out;'), 'Hover transition must be 140ms');
  assert.ok(css.includes('transform: scale(1.09);'), 'Meter hover scale must be ~1.09');
  assert.ok(css.includes('transform: scale(1.08);'), 'Operator hover scale must be ~1.08');

  // Selection one-shot (200ms cubic-bezier)
  assert.ok(css.includes('@keyframes sgpMeterSelectedOneShot'), 'Must define sgpMeterSelectedOneShot keyframe');
  assert.ok(css.includes('200ms cubic-bezier(0.2, 0.8, 0.2, 1)'), 'Selection animation must be ~200ms');

  // Reduced motion overrides
  const reducedMotionMatch = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\}/);
  assert.ok(reducedMotionMatch, 'prefers-reduced-motion block must be present');
  assert.ok(css.includes('.sgp-meter-visual-content'), 'Must override .sgp-meter-visual-content in reduced motion');
  assert.ok(css.includes('.sgp-op-visual-content'), 'Must override .sgp-op-visual-content in reduced motion');
  assert.ok(css.includes('.sgp-meter-issue-badge'), 'Must override .sgp-meter-issue-badge in reduced motion');
});

// ===========================================================================
// SUITE 6: MAP CANVAS DIAGNOSTICS & GEOMETRY FREEZE (Section 21-22)
// ===========================================================================

test('V13.4 Geometry & Map Source: Coordinates and dimensions strictly frozen at 1915 x 821, aspect 2.332521', () => {
  assert.equal(CANONICAL_SCENE_WIDTH, 1915, 'Canonical width must remain 1915');
  assert.equal(CANONICAL_SCENE_HEIGHT, 821, 'Canonical height must remain 821');
  assert.ok(
    Math.abs(CANONICAL_ASPECT_RATIO - 1915 / 821) < 1e-6,
    'Aspect ratio must remain 2.332521'
  );

  // Diagnostic specifications
  assert.equal(MAP_CANVAS_DIAGNOSTICS.currentSource.width, 1915);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.currentSource.height, 821);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.logicalWidth, 1915);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.logicalHeight, 932);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.extendDownwardPx, 111);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.doNotStretchVertically, true);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.resolutionVsAspectRatioNote.doesNotSolveLetterbox, true);

  // V10 JSON file must exist and be unchanged
  const v10Path = path.resolve(
    __dirname,
    '../src/features/map-operations/geometry/tanThuanPresentationGeometry.v10.json'
  );
  const v10Content = JSON.parse(fs.readFileSync(v10Path, 'utf-8'));
  assert.equal(v10Content.canonicalWidth, 1915);
  assert.equal(v10Content.canonicalHeight, 821);
  assert.equal(v10Content.zones.length, 6);
});
