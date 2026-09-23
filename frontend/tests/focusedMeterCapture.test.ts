import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// 1. FOCUSED CAPTURE MODE ENTRY & SHELL INTEGRATION
// ---------------------------------------------------------------------------

test('Focused Capture: Meter selection mounts Focused Capture Shell with minimal header', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Must mount MeterCamera with focused minimal props
  assert.ok(
    appContent.includes('meterCode={selectedMeter?.meter_code}'),
    'App.tsx must pass meterCode to MeterCamera'
  );
  assert.ok(
    appContent.includes('meterName={selectedMeter?.name}'),
    'App.tsx must pass meterName to MeterCamera'
  );
  assert.ok(
    appContent.includes('roundTime={selectedRound?.scheduled_time_only}'),
    'App.tsx must pass roundTime to MeterCamera'
  );
  assert.ok(
    appContent.includes('onBack={handleBackFromMeter}'),
    'App.tsx must pass onBack handler to MeterCamera'
  );

  // MeterCamera itself must render the focused minimal header
  const cameraPath = path.resolve(__dirname, '../src/components/MeterCamera.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');

  assert.ok(
    cameraContent.includes('focused-capture-shell'),
    'MeterCamera must render .focused-capture-shell container'
  );
  assert.ok(
    cameraContent.includes('focused-capture-header'),
    'MeterCamera must render .focused-capture-header'
  );
  assert.ok(
    cameraContent.includes('btn-focused-back'),
    'MeterCamera must render accessible back button'
  );
  assert.ok(
    cameraContent.includes('focused-meter-code'),
    'MeterCamera must render prominent meter code'
  );
  assert.ok(
    cameraContent.includes('focused-round-pill'),
    'MeterCamera must render round indicator pill'
  );
});

// ---------------------------------------------------------------------------
// 2. CAMERA LIFECYCLE & LOADING / READY STATES
// ---------------------------------------------------------------------------

test('Camera Lifecycle: Loading and Ready states transition cleanly without flicker', () => {
  const cameraPath = path.resolve(__dirname, '../src/components/MeterCamera.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');

  // Loading state indicator
  assert.ok(
    cameraContent.includes('focused-camera-opening-state'),
    'MeterCamera must render dedicated camera opening loading state'
  );
  assert.ok(
    cameraContent.includes('Đang kết nối camera...'),
    'MeterCamera must display clear Vietnamese camera opening text'
  );
  assert.ok(
    cameraContent.includes('maritime-spinner'),
    'MeterCamera must use maritime spinner for loading'
  );

  // Smooth video transition
  assert.ok(
    cameraContent.includes('focused-live-video'),
    'MeterCamera must render .focused-live-video'
  );
  assert.ok(
    cameraContent.includes('cameraReady ? \'is-ready\' : \'is-loading\''),
    'MeterCamera must toggle is-ready class upon metadata loaded'
  );
});

// ---------------------------------------------------------------------------
// 3. CAMERA ERROR HANDLING, RETRY & GALLERY FALLBACK
// ---------------------------------------------------------------------------

test('Camera Error: Accessible error banner provides retry and gallery fallback', () => {
  const cameraPath = path.resolve(__dirname, '../src/components/MeterCamera.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');

  assert.ok(
    cameraContent.includes('focused-camera-error-card'),
    'MeterCamera must render .focused-camera-error-card on failure'
  );
  assert.ok(
    cameraContent.includes('Thử lại camera'),
    'MeterCamera must provide retry camera CTA'
  );
  assert.ok(
    cameraContent.includes('Chọn từ thư viện'),
    'MeterCamera must provide gallery upload fallback CTA'
  );
  assert.ok(
    cameraContent.includes('type="file"'),
    'MeterCamera must include hidden native file picker'
  );
  assert.ok(
    cameraContent.includes('accept="image/*"'),
    'File picker must strictly accept image files'
  );
});

// ---------------------------------------------------------------------------
// 4. SHUTTER DEBOUNCE & DOUBLE-CLICK PROTECTION
// ---------------------------------------------------------------------------

test('Interaction Safety: Shutter button protects against duplicate captures', () => {
  const cameraPath = path.resolve(__dirname, '../src/components/MeterCamera.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');

  // isCapturing guard
  assert.ok(
    cameraContent.includes('const [isCapturing, setIsCapturing] = useState<boolean>(false)'),
    'MeterCamera must maintain isCapturing state'
  );
  assert.ok(
    cameraContent.includes('if (isCapturing || !cameraReady || !videoRef.current) return;'),
    'handleCapturePhoto must abort immediately if already capturing'
  );
  assert.ok(
    cameraContent.includes('setIsCapturing(true)'),
    'handleCapturePhoto must lock isCapturing immediately upon trigger'
  );
  assert.ok(
    cameraContent.includes('disabled={!cameraReady || isCapturing}'),
    'Shutter button must be disabled when capturing or not ready'
  );
});

// ---------------------------------------------------------------------------
// 5. FULL-FRAME CAPTURE INVARIANT
// ---------------------------------------------------------------------------

test('Pipeline Invariant: Full uncropped frame is captured for OCR inference', () => {
  const cameraPath = path.resolve(__dirname, '../src/components/MeterCamera.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');

  // Full sensor frame drawn to canvas
  assert.ok(
    cameraContent.includes('const width = video.videoWidth || 1920'),
    'Canvas width must match native video width'
  );
  assert.ok(
    cameraContent.includes('const height = video.videoHeight || 1080'),
    'Canvas height must match native video height'
  );
  assert.ok(
    cameraContent.includes('ctx.drawImage(video, 0, 0, width, height)'),
    'Capture must draw full uncropped video frame into canvas'
  );

  // Reticle must be purely visual overlay
  assert.ok(
    cameraContent.includes('focused-reticle-overlay'),
    'MeterCamera must render visual reticle overlay'
  );
  assert.ok(
    cameraContent.includes('focused-reticle-box'),
    'MeterCamera must render focused reticle box'
  );
  assert.ok(
    cameraContent.includes('reticle-corner'),
    'Reticle must render 4 corner brackets'
  );
  assert.ok(
    cameraContent.includes('ĐẶT MẶT CÔNG TƠ VÀO KHUNG'),
    'Reticle must display alignment guidance label'
  );
  assert.ok(
    cameraContent.includes('Giữ máy vuông góc • Ảnh chụp toàn khung'),
    'Reticle must remind operator that uncropped frame is sent to AI'
  );
});

// ---------------------------------------------------------------------------
// 6. CONTINUOUS PREVIEW TRANSITION
// ---------------------------------------------------------------------------

test('Seamless Transition: Captured image remains in place during Preview and OCR processing', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert.ok(
    appContent.includes('focused-preview-shell'),
    'App.tsx must render .focused-capture-shell for preview state'
  );
  assert.ok(
    appContent.includes('focused-preview-viewport'),
    'App.tsx must render .focused-preview-viewport'
  );
  assert.ok(
    appContent.includes('focused-preview-image'),
    'App.tsx must render .focused-preview-image inside viewport'
  );
  assert.ok(
    appContent.includes('focused-processing-overlay'),
    'App.tsx must render .focused-processing-overlay on top of preview when loading'
  );
  assert.ok(
    appContent.includes('focused-processing-title'),
    'Processing overlay must render clear loading title'
  );
});

// ---------------------------------------------------------------------------
// 7. RETAKE STATE RETENTION
// ---------------------------------------------------------------------------

test('Retake Safety: Chụp lại preserves selected meter and round while resetting capture state', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Verify handleReset clears transient photo/ocr state but does NOT touch selectedMeter/selectedRound
  const handleResetSection = appContent.slice(
    appContent.indexOf('const handleReset = () => {'),
    appContent.indexOf('const handleReadMeter = async () => {')
  );

  assert.ok(handleResetSection.includes('setImageFile(null)'), 'Must clear imageFile');
  assert.ok(handleResetSection.includes('setPreviewUrl(null)'), 'Must clear previewUrl');
  assert.ok(handleResetSection.includes('setResult(null)'), 'Must clear result');
  assert.ok(handleResetSection.includes('setError(null)'), 'Must clear error');
  assert.ok(!handleResetSection.includes('setSelectedMeter(null)'), 'Must NOT clear selectedMeter');
  assert.ok(!handleResetSection.includes('setSelectedRound(null)'), 'Must NOT clear selectedRound');
  assert.ok(!handleResetSection.includes('setSelectedBatch(null)'), 'Must NOT clear selectedBatch');
});

// ---------------------------------------------------------------------------
// 8. STALE OCR RESPONSE RACE CONDITION PROTECTION
// ---------------------------------------------------------------------------

test('Race Condition Protection: Outdated OCR response cannot overwrite new capture session', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert.ok(
    appContent.includes('ocrRequestIdRef = useRef<number>(0)'),
    'App.tsx must maintain ocrRequestIdRef counter'
  );
  assert.ok(
    appContent.includes('ocrRequestIdRef.current++'),
    'handleReset must increment ocrRequestIdRef to invalidate active responses'
  );
  assert.ok(
    appContent.includes('const requestId = ++ocrRequestIdRef.current;'),
    'handleReadMeter must assign monotonically increasing request ID'
  );
  assert.ok(
    appContent.includes('if (requestId !== ocrRequestIdRef.current) return;'),
    'handleReadMeter must discard response if request ID is no longer current'
  );
});

// ---------------------------------------------------------------------------
// 9. OCR FAILURE & RECOVERY
// ---------------------------------------------------------------------------

test('Recovery: OCR error state provides retry on same image and retake camera', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // State 6 Error block verification
  assert.ok(
    appContent.includes('Không thể kết nối đến hệ thống'),
    'Error state must display descriptive Vietnamese title'
  );
  assert.ok(
    appContent.includes('onClick={handleReadMeter}'),
    'Error state must provide retry button to re-run OCR'
  );
  assert.ok(
    appContent.includes('onClick={handleReset}'),
    'Error state must provide retake button to return to camera'
  );
});

// ---------------------------------------------------------------------------
// 10. NO AUTO-CONFIRM / NO AUTO-SAVE & 409 PROTECTION
// ---------------------------------------------------------------------------

test('Operator Sovereignty: Reading confirmation requires explicit manual confirmation with double-submit guard', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Must have explicit confirmation button
  assert.ok(
    appContent.includes('onClick={handleConfirmReading}'),
    'State 4A must have explicit user trigger for handleConfirmReading'
  );
  assert.ok(
    appContent.includes('disabled={confirming || isEditingReading}'),
    'Confirm button must be locked while confirming to prevent duplicate clicks'
  );
  assert.ok(
    appContent.includes('if (!selectedMeter || !selectedRound || !result || !confirmedReadingValue || confirming) return;'),
    'handleConfirmReading must strictly abort if confirming is already true'
  );

  // Reconcile 409 gracefully
  assert.ok(
    appContent.includes('Công tơ này đã được ghi nhận trong lượt hiện tại'),
    'Must provide informative Vietnamese message if conflict 409 occurs'
  );
});

// ---------------------------------------------------------------------------
// 11. NO BOTTOM RADIAL NAV IN FOCUSED FLOW
// ---------------------------------------------------------------------------

test('Ergonomics: Bottom radial navigation is completely absent during focused capture', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Check that when activeScreen === 'meter', BottomRadialNav is never rendered
  const meterFlowStartIndex = appContent.indexOf('// 7. FOCUSED METER READING WORKFLOW');
  assert.ok(meterFlowStartIndex > 0, 'Focused meter workflow section must exist in App.tsx');

  const meterFlowContent = appContent.slice(meterFlowStartIndex);
  assert.ok(
    !meterFlowContent.includes('BottomRadialNav'),
    'BottomRadialNav must never be rendered inside focused capture flow'
  );
  assert.ok(
    !meterFlowContent.includes('sgp-bottom-radial-bar'),
    'Radial navigation bar must not be rendered in meter flow'
  );
});

// ---------------------------------------------------------------------------
// 12. REDUCED MOTION PREFERENCE IN CSS
// ---------------------------------------------------------------------------

test('Accessibility: prefers-reduced-motion media query disables motion for focused capture', () => {
  const cssPath = path.resolve(__dirname, '../src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(
    cssContent.includes('@media (prefers-reduced-motion: reduce)'),
    'index.css must contain prefers-reduced-motion media query'
  );
  assert.ok(
    cssContent.includes('.focused-capture-shell'),
    'Reduced motion must target .focused-capture-shell'
  );
  assert.ok(
    cssContent.includes('.focused-reticle-overlay'),
    'Reduced motion must target .focused-reticle-overlay'
  );
  assert.ok(
    cssContent.includes('.focused-processing-overlay'),
    'Reduced motion must target .focused-processing-overlay'
  );
  assert.ok(
    cssContent.includes('.focused-verification-scroll'),
    'Reduced motion must target .focused-verification-scroll'
  );
});

// ---------------------------------------------------------------------------
// 13. CAMERA STREAM RESOURCE CLEANUP
// ---------------------------------------------------------------------------

test('Resource Safety: Camera tracks are terminated cleanly on capture, gallery select, and unmount', () => {
  const cameraPath = path.resolve(__dirname, '../src/components/MeterCamera.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');

  // stopCamera implementation
  assert.ok(
    cameraContent.includes('mediaStreamRef.current.getTracks().forEach((track) => {'),
    'stopCamera must iterate and stop all media stream tracks'
  );
  assert.ok(
    cameraContent.includes('mediaStreamRef.current = null;'),
    'stopCamera must nullify stream reference'
  );
  assert.ok(
    cameraContent.includes('videoRef.current.srcObject = null;'),
    'stopCamera must detach stream from video element'
  );

  // Unmount effect
  assert.ok(
    cameraContent.includes('mountedRef.current = false;'),
    'Unmount cleanup must flag mountedRef as false'
  );
  assert.ok(
    cameraContent.includes('return () => {'),
    'useEffect must return cleanup callback'
  );
});

// ---------------------------------------------------------------------------
// 14. READING HERO DIGIT WRAPPING INTEGRITY
// ---------------------------------------------------------------------------

test('Display Integrity: Long reading values never split or wrap across multiple lines', () => {
  const cssPath = path.resolve(__dirname, '../src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // .reading-hero-number rules
  assert.ok(
    cssContent.includes('white-space: nowrap'),
    '.reading-hero-number must enforce white-space: nowrap'
  );
  assert.ok(
    cssContent.includes('font-variant-numeric: tabular-nums lining-nums'),
    '.reading-hero-number must enforce tabular figures'
  );
  assert.ok(
    cssContent.includes('overflow: hidden'),
    '.reading-hero-number must have overflow: hidden'
  );
  assert.ok(
    cssContent.includes('text-overflow: ellipsis'),
    '.reading-hero-number must handle overflow with ellipsis'
  );
});

// ---------------------------------------------------------------------------
// 15. GUIDANCE MODAL & CAPTURE CONTROLS ERGONOMICS
// ---------------------------------------------------------------------------

test('Field Ergonomics: Guidance modal and thumb controls meet Saigon Port standards', () => {
  const cameraPath = path.resolve(__dirname, '../src/components/MeterCamera.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');

  // Guidance modal
  assert.ok(
    cameraContent.includes('focused-modal-backdrop'),
    'Must render guidance modal backdrop'
  );
  assert.ok(
    cameraContent.includes('Hướng dẫn chụp công tơ'),
    'Guidance modal must have clear title'
  );
  assert.ok(
    cameraContent.includes('Đã hiểu'),
    'Guidance modal must have accessible dismiss CTA'
  );

  // Thumb controls
  assert.ok(
    cameraContent.includes('btn-shutter-outer'),
    'Must render tactile large shutter button'
  );
  assert.ok(
    cameraContent.includes('data-testid="shutter-button"'),
    'Shutter button must have accessible testid'
  );
  assert.ok(
    cameraContent.includes('btn-capture-utility'),
    'Must render utility buttons for Gallery and Guidance'
  );
});
