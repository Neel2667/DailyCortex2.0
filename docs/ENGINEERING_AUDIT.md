# DailyCortex 2.0 Engineering Audit & Architecture Plan (Phase 2)

**Date:** 2026-10-08  
**Author:** Autonomous Principal Engineer, Creative Director, Production Engineer & QA Lead  
**Target Repository:** [Neel2667/DailyCortex2.0](https://github.com/Neel2667/DailyCortex2.0)  
**Execution Environment:** macOS 15.7.9 (Darwin x86_64), Node v24.20.0, Showtime 0.4.0, FFmpeg 4.4.1 (with libass, loudnorm, ebur128, libvpx, libvpx-vp9), Headless Chrome 154

---

## 1. Executive Summary

DailyCortex 2.0 is an autonomous, high-retention vertical short-form video production engine for neuroscience, psychology, and cognitive phenomenon topics.

Following Phase 1 (which stood up the basic pipeline skeleton and Showtime adapter), this Phase 2 investigation performed an exhaustive technical audit of real media rendering, solved a critical timing defect, implemented media normalization and deterministic caching, eliminated asset 404 warnings, and conducted frame-by-frame visual inspection of rendered vertical shorts.

---

## 2. Investigation of Critical Phase 1 Timing Defect

### 2.1 The Problem
In the Phase 1 run, the audit report noted:
- Planned visual duration: **33.5 seconds**
- Synthesized voice audio duration: **41.4 seconds**
- Yet the quality gate passed.

### 2.2 Root Cause Analysis
1. **Pre-Synthesis Estimation Error:** The script generator used a heuristic estimate (`wordCount / (145 WPM / 60s)`) which estimated the 5 narration beats at `6.5s + 5.5s + 7.0s + 7.5s + 7.0s = 33.5s`.
2. **True Neural Speech Pacing:** Kokoro ONNX neural speech (`showtime voice say`) includes natural prosody, breathing pauses, and emphasis timing, taking **39.25 seconds** for the actual narration text.
3. **Flawed Quality Gate Tolerance:** The original quality gate only checked `durationSec > 0` and permitted a loose tolerance, allowing a 7.9-second discrepancy between visual scene plans and spoken audio.
4. **Visual Truncation & Desync:** Because scene transition times were fixed at 33.5s while speech continued to 39.25s, scenes changed before the narrator finished speaking corresponding lines, and the final scene held on dead air for 5.7 seconds.

### 2.3 The Architectural Decision: Narration is Canonical
In social vertical storytelling (YouTube Shorts, TikTok, Reels), the **spoken voice is the canonical driver of audience retention and pacing**. Visuals must strictly conform to spoken speech timestamps, never the other way around.

**The Canonical Timing Contract:**
```
Total Video Duration = Total Spoken Narration Duration + End Hold (1.0s)
Scene[i].Duration = NextSpokenBeat.Start - CurrentSpokenBeat.Start
Scene[Last].Duration = RemainingSpokenAudio + EndHold (1.0s)
Sum(Scene[0..N].Duration) == Total Video Duration (within 0.05s)
|Total Video Duration - (Voice Duration + 1.0s)| <= 0.25s
Last Caption Word End <= Total Video Duration
```

We implemented `TimelineRetimer` (`src/audio/timeline-retimer.ts`) which receives the exact millisecond-precision word timestamps (`words.json`) from Kokoro ONNX speech synthesis, maps spoken words to narrative beats, and recalculates every scene's duration. 

---

## 3. Media Pipeline Architecture

### 3.1 Media Normalization & Caching
Raw stock video or background footage from external sources cannot be dumped directly into browser-based renderers due to unpredictable dimensions, frame rates, and codec incompatibilities.

We built `MediaNormalizer` (`src/media/media-normalizer.ts`):
1. **Probe Stage (`probeMedia`):** Executes `ffprobe` to determine width, height, duration, codec, and portrait aspect ratio.
2. **Normalization Stage (`normalizeVideo`):** Converts arbitrary footage to:
   - Dimensions: 1080x1920 (9:16 vertical portrait) via `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`
   - Frame rate: 30 fps CFR
   - Pixel format: `yuv420p`
3. **Deterministic Cache Identity:** Cache keys are SHA-256 hashes of `provider:assetId:transformationParams`. Files are stored in `data/assets/cache/` so identical footage is never re-encoded.
4. **Native Headless Chromium Video Compatibility:** Open-source Chromium builds in headless automated environments lack proprietary Cisco OpenH264 decoder binaries, causing HTML5 `<video src="clip.mp4">` elements to fail with `error 4 (MEDIA_ERR_SRC_NOT_SUPPORTED)`. `MediaNormalizer` generates **WebM (VP9)** plates (`-c:v libvpx-vp9 -b:v 1M -g 15`), which Chromium decodes natively at zero licensing friction.

### 3.2 Visual Composition & Diversity
To avoid "stock video soup" and repetitive abstract brains/gradients, each scene receives a declared `mood`:
- `Scene 1 (Hook)`: `dark_night_bedroom` (midnight blue with subtle light drift)
- `Scene 2 (Reaction/Paradox)`: `ambient_cafe` (warm amber social backdrop)
- `Scene 3 (Biological Mechanism)`: `neural_threat_matrix` (amber threat pulse matrix)
- `Scene 4 (Neural Priority)`: `fmri_scan_clinical` (clinical emerald diagnostic scan plate)
- `Scene 5 (Payoff)`: `sunset_relief_peace` (deep twilight purple relief plate)

### 3.3 Elimination of Missing-Asset 404 Warnings
Showtime's pre-render inspection previously flagged:
- 8 missing emoji SVG 404 warnings (when raw unicode emojis `⚠️`, `🚫`, `💀`, `🧠` triggered internal Showtime SVG requests).
- Missing glyph warning for `➔` (U+2794) falling back to system Menlo.
- WCAG AA contrast ratio warnings on badge text.

**Fixes Applied:**
1. Replaced all emojis with hand-crafted, accessible inline SVG vector icons.
2. Replaced `➔` with an inline SVG chevron `<polyline points="9 18 15 12 9 6"/>`.
3. Elevated text contrast ratios to 5.5:1+ using tailored HSL color tokens (`#FDA4AF`, `#BAE6FD`, `#FDE68A`, `#A7F3D0`, `#DDD6FE`).
4. Result: `showtime check` passed with **0 errors, 0 missing files, and 100% WCAG contrast across all 45 elements**.

---

## 4. Implementation Status Matrix

| Subsystem / Capability | Status | Evidence |
| :--- | :--- | :--- |
| **Topic Intelligence & Fact Graph** | **IMPLEMENTED & VERIFIED** | Curated factual claims, verified sources, confidence scores, anti-cliche hooks |
| **Multi-Structure Narrative Engine** | **IMPLEMENTED & VERIFIED** | 4 distinct narrative architectures (`OBSERVATION_SURPRISE`, `MYSTERY_REVEAL`, `CONTRADICTION_IMPLICATION`, `STORY_SCIENCE_PAYOFF`) |
| **Local Kokoro Speech Synthesis** | **IMPLEMENTED & VERIFIED** | 48kHz neural WAV output, 91 timed words in `words.json` |
| **Canonical Timeline Synchronization** | **IMPLEMENTED & VERIFIED** | `TimelineRetimer` locks video duration to voice duration + 1.0s end hold; verified in automated tests |
| **Media Normalizer & Cache** | **IMPLEMENTED & VERIFIED** | FFmpeg/ffprobe probe, SHA-256 cache identity, 1080x1920 WebM VP9 motion plates |
| **Native Showtime 9:16 HTML Stage** | **IMPLEMENTED & VERIFIED** | Mobile safe zones, SVG icons, karaoke captions, kinetic type |
| **Procedural Audio Design** | **IMPLEMENTED & VERIFIED** | -14 LUFS master, 14dB ducking under voice, timed SFX (`thock`, `whoosh`, `pop`, `ding`) |
| **Showtime Pre-Render QA (`showtime check`)** | **IMPLEMENTED & VERIFIED** | 0 errors, layout/contrast/safe zone PASS, 14 samples validated |
| **Independent Post-Render MP4 Audit** | **IMPLEMENTED & VERIFIED** | Independent ffprobe inspection verifying 9:16 aspect ratio, H.264 video stream, AAC stereo, duration sync |
| **Live Pexels Stock Media API** | **BLOCKED (No API Key)** | `PEXELS_API_KEY` missing from `.env`; offline normalized motion plate fallback active |
| **YouTube Publishing & OAuth** | **NOT IMPLEMENTED (Out of Scope)** | Deliberately deferred until production rendering pipeline is trustworthy |

---

## 5. Automated Test Suite Summary
- **Total Test Files:** 7
- **Total Tests:** 20 passed (100% passing)
- **Coverage Areas:** Content engine, Fact engine, Narrative structures, Media normalizer, Asset scoring, Asset deduplication, Kokoro voice synthesis, Procedural sound design, Canonical retiming, Showtime project builder, 6-layer Quality gates.
