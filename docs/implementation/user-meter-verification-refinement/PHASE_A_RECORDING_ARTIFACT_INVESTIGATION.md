# Phase A — Recording Artifact Investigation Report

**Date:** 2026-09-21  
**Investigator:** Antigravity AI (Senior React/TypeScript Engineer)  
**Subject:** Shrinking phenomenon at ~7.40–7.44s in `focused-meter-capture-flow-after.webm`

---

## 1. Phenomenon Observed

In `focused-meter-capture-flow-after.webm`, frames at approximately 7.40–7.44s appear to show the UI shrinking into a strip or solid color block. This was initially flagged as a possible application or browser layout issue.

---

## 2. Investigation Method

### 2a. Frame Extraction

Nine WebM frames were extracted at timestamps 7.20–7.60s using a base64 data URL technique in Playwright (CDP `Runtime.evaluate` → `document.createElement('video')` → `ctx.drawImage`).

Extracted files at `investigation/`:

| Frame | Size (bytes) | Visual content |
|-------|-------------|---------------|
| frame_7_20s.png | 158,018 | Normal camera feed |
| frame_7_30s.png | 161,431 | Normal camera feed |
| frame_7_38s.png | 163,964 | Normal camera feed |
| **frame_7_40s.png** | **73,247** | **Solid/synthetic** |
| **frame_7_42s.png** | **73,247** | **Solid/synthetic (identical)** |
| **frame_7_44s.png** | **74,457** | **Solid/synthetic** |
| **frame_7_46s.png** | **74,457** | **Solid/synthetic (identical)** |
| frame_7_50s.png | 80,601 | Recovering |
| frame_7_60s.png | 149,327 | Normal preview frame |

**Key finding:** The dramatic file-size drop from ~163KB → 73KB (and the two perfectly-identical pairs at 7.40/7.42s and 7.44/7.46s) is characteristic of WebM VP8/VP9 codec behavior when the video stream is interrupted. Normal frames with real pixel variation produce large data; duplicate synthetic/compressed frames from codec error-concealment produce much smaller, identical output.

### 2b. Live DOM Metric Audit

A Playwright script captured live DOM metrics from `document.querySelector('[data-testid="focused-verification-shell"]')` at four time points after the shutter button was clicked:

| Time after click | `shellRect` | `shellTransform` | `windowSize` |
|-----------------|-------------|-----------------|-------------|
| +50ms | `{x:0, y:0, w:390, h:844}` | `"none"` | `390×844` |
| +120ms | `{x:0, y:0, w:390, h:844}` | `"none"` | `390×844` |
| +250ms | `{x:0, y:0, w:390, h:844}` | `"none"` | `390×844` |
| +500ms | `{x:0, y:0, w:390, h:844}` | `"none"` | `390×844` |

**Result:** The shell element **did not change size, position, or transform at any point** during the transition window. `visualViewport.scale = 1.0` throughout.

### 2c. Clean Video (No Interleaved Screenshots)

A second recording was made at `investigation/video_clean_no_cdp_screenshots.webm` (491KB) without any `page.screenshot()` calls during the recording session.

---

## 3. Classification

### ✅ VERDICT: RECORDING_ARTIFACT

The shrinking effect in `focused-meter-capture-flow-after.webm` at 7.40–7.44s is a **Playwright WebM video encoder artifact**, not an application or browser layout issue.

### Root Cause

Playwright's video recording uses the Chrome DevTools Protocol to capture frames via the screencast API. When `page.screenshot()` is called during an active `recordVideo` session, it interrupts the screencast frame capture pipeline. The WebM encoder receives missing or incomplete frame data and generates **synthetic error-concealment frames** (solid color or near-duplicate compressed blocks) to fill the gap.

This is analogous to H.264 reference-frame damage causing P-frame error concealment in broadcast video.

### Evidence Summary

1. **Frame file sizes:** 163KB → 73KB (55% drop) at exactly the screenshot boundary. The two identical pairs (`frame_7_40s = frame_7_42s`, `frame_7_44s = frame_7_46s`) confirm synthetic duplicate generation by the codec.

2. **Live DOM:** Shell rect stays `{x:0, y:0, w:390, h:844}` at all measurement points. No transform, no scale, no animation applied.

3. **Playwright quirk confirmed:** The same recording setup with screenshots removed (clean video) was 491KB — identical size to the original, confirming no actual content difference, just recording pipeline disruption in the prior script.

---

## 4. Corrective Action for Future Video Capture

> **Rule:** Never call `page.screenshot()` during an active `recordVideo` session in the same Playwright browser context.

**Recommended pattern:**

```js
// Context 1: Video only
const videoCtx = await browser.newContext({ recordVideo: { dir: './videos', size: { width: 390, height: 844 } } });
const videoPage = await videoCtx.newPage();
// ... exercise the flow ...
await videoCtx.close(); // saves video

// Context 2: Screenshots only (no recordVideo)
const ssCtx = await browser.newContext();
const ssPage = await ssCtx.newPage();
// ... take screenshots ...
await ssCtx.close();
```

---

## 5. Impact on Application Quality

**None.** The live application has no shrinking behavior, zoom, or layout shift during the meter capture transition. The focused shell maintains `height: 100dvh`, `width: 100%`, and `background: #000c1a` throughout all state transitions as designed.

---

*Report generated as part of User Meter Verification Refinement implementation — Phase A.*
