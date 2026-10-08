# Phase 3A Forensic Audit of DailyCortex 2.0 (Phase 2 Claims Verification)

**Auditor:** Autonomous Execution Engineer  
**Date:** October 8, 2026  
**Repository:** [Neel2667/DailyCortex2.0](https://github.com/Neel2667/DailyCortex2.0)  
**Workspace:** `/Users/neel/Local Data/AI Apps/DailyCortex`

---

## 1. Executive Summary

This forensic audit investigates the claims, codebase, generated artifacts, and runtime behaviors produced during Phase 2. While Phase 2 established major architectural milestones—including Kokoro TTS integration, word-level timing, narration-canonical retiming, and headless Chrome rendering—a rigorous forensic examination reveals critical discrepancies that must be resolved for a true production-grade content factory.

---

## 2. Itemized Verification Matrix

| Claim / Component | Phase 2 Claim | Forensic Reality | Verification Status |
|---|---|---|---|
| **Render Output Dimensions** | Claimed target: 1080x1920 (9:16 vertical Short) | Rendered `final.mp4` was **1080x1832** (aspect 135:229). Root cause: Showtime’s CDP screenshot handler omitted `params.clip` when scale=1, capturing macOS Chrome window surface clamped to display height (1833px $\to$ 1832px). | **INCORRECT / OVERSTATED** (Fixed via CDP clip patch) |
| **Full Video Render** | 40.27s full Short rendered (`data/jobs/short-1791473955664/final.mp4`) | File exists, 49.0 MB, 1,208 frames @ 30 fps, H.264 High profile, AAC audio. Fully verified by ffprobe. | **VERIFIED** |
| **Canonical Audio Retiming** | Narration is canonical; scenes telescope to words.json; $\Delta < 1\text{ms}$ | Audio: 40.266000s, Video: 40.266667s ($\Delta = 0.000667\text{s}$). Storyboard telescoped from Kokoro spoken word boundaries with 1.0s payoff hold. | **VERIFIED** |
| **Zero-404 SVG Stage** | Replaced emojis with inline SVG icons; eliminated 8 missing asset 404 warnings | `showtime check` confirms 0 missing files, 0 broken references, 0 asset 404 errors. | **VERIFIED** |
| **Media Normalization** | WebM (VP9) background motion plates generated with deterministic SHA-256 caching | Resolved Chromium headless `<video>` decode errors (`MEDIA_ERR_SRC_NOT_SUPPORTED`). Cached in `data/cache/plates/`. | **VERIFIED** |
| **Loudness Compliance** | -14.0 LUFS master, true peak -1.7 dBTP | Measured via `showtime qa` and ffprobe ebur128. Perfect YouTube Shorts loudness spec. | **VERIFIED** |
| **Real Pexels Integration** | Described as "blocked because PEXELS_API_KEY is unavailable" | `PEXELS_API_KEY` was absent in `.env`. Offline fallback operated correctly, but live stock footage downloading was never exercised with real remote servers. | **PARTIALLY VERIFIED (Live Media Blocked)** |
| **Narrative Architectures** | Described as having extensible multi-narrative templates | Only 1 template (5-beat Paradox: Hook $\to$ Paradox $\to$ Mechanism $\to$ Neural $\to$ Payoff) was actually coded in `ScriptEngine`. Others were conceptual. | **INCORRECT / OVERSTATED** |
| **Visual Diversity** | Visual language was diversified beyond generic "glowing brain" | Clock UI, split bar chart, threat matrix, fMRI scan, and brand outro were implemented. However, this sequence was hardcoded for all runs, acting as a single visual template. | **PARTIALLY VERIFIED** |
| **Post-Render QA** | Dual-layer post-render QA | Manifest validated itself; independent validation was run as a CLI command rather than an enforced programmatic pipeline gate. | **PARTIALLY VERIFIED** |

---

## 3. Deep-Dive Root Cause Analysis: The 1080x1832 Dimension Defect

### Forensic Investigation
1. `project/showtime.json` explicitly defined `"width": 1080, "height": 1920`.
2. Showtime's `render.json` recorded `"width": 1080, "height": 1920`.
3. However, `ffprobe data/jobs/short-1791473955664/final.mp4` revealed `width: 1080, height: 1832`.
4. In `/Users/neel/showtime/skills/showtime/scripts/lib/stagehost.mjs`:
   ```javascript
   // Original buggy code:
   const cs = s !== undefined ? s : clipScale;
   if (cs && cs !== 1) params.clip = { x: 0, y: 0, width, height, scale: cs };
   const r = await cdp.send('Page.captureScreenshot', params);
   ```
5. When `scale = 1` (default full render), `clipScale` was `null`. Thus, `params.clip` was omitted entirely.
6. Under Chrome CDP, calling `Page.captureScreenshot` without `clip` on macOS captures the window surface. On a display with 900px vertical resolution (or 1800 HiDPI pixels), Chrome's window surface was constrained to 1833px.
7. FFmpeg's encode filter `-vf "crop=trunc(iw/2)*2:trunc(ih/2)*2"` truncated 1833 down to 1832!
8. When `--preview` ran, `scale` was 0.6666 (`!== 1`), triggering `params.clip` and producing an exact 720x1280 (9:16).
9. **The Solution**: Patching `stagehost.mjs` to unconditionally supply `params.clip = { x: 0, y: 0, width, height, scale: cs || 1 }` guarantees exact 1080x1920 frame capture across all platforms. Verified: rendered span test now measures **1080x1920** via `ffprobe`.

---

## 4. Required Immediate Upgrades for Phase 3
1. **Enforce Exact 1080x1920 Gate**: Disallow any tolerance that permits 1080x1832.
2. **Implement 3 Full Narrative Templates**:
   - Template A: Paradox / Mechanism
   - Template B: Mystery / Reveal
   - Template C: Scenario / Actionable Insight
3. **Build Machine-Readable Synchronization Auditor**:
   - Verify word-level timestamps, narrative beat boundaries, and caption monotonicity.
   - Output `sync-report.json`.
4. **Build Machine-Readable Audio Auditor**:
   - Output `audio-quality.json`.
5. **Build Independent Post-Render MP4 Validator**:
   - Verify container, streams, dimensions, black frames, silence, and write `post-render-report.json`.
6. **Execute 3-Video Production Benchmark**:
   - Render 3 distinct Shorts with different topics, templates, and visual strategies.
   - Verify anti-repetition across all 3 videos.
