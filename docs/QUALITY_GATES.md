# DailyCortex 2.0 — The 20 Mandatory Quality & Safety Gates

Before any job can become eligible for YouTube publishing or scheduling, it must pass all 20 quality gates defined in `src/quality/quality-gates.ts`.

| Gate # | Name | Verification Method | Pass Criteria |
|---|---|---|---|
| **Gate 1** | Topic & Claim Integrity | `FactEngine.validateClaims` | Zero fabricated citations; verified facts present; anti-hallucination passed. |
| **Gate 2** | Script Completeness | `ScriptEngine` audit | Hook, core mechanism, demonstration, takeaway all present; word count between 60 and 150 words. |
| **Gate 3** | Narrative Structure Diversity | Pattern analysis | Structure matches recognized template (`EMBARRASSING_MEMORY`, `DOORWAY_EFFECT`, `SPOTLIGHT_EFFECT`, `ZEIGARNIK_EFFECT`). |
| **Gate 4** | Voice Generation Success | `VoiceEngine` audio check | Output WAV exists, valid size (>10KB), non-empty word timestamps. |
| **Gate 5** | Audio Quality & Loudness | `AudioAuditor` check | LUFS within $-16 \pm 2$ LUFS; true peak $< -1.0$ dBTP; zero clipping. |
| **Gate 6** | Asset Provenance | `AssetManager` provenance | Every scene plate has documented source type (`pexels` or `motion_graphic`) and SHA-256 hash. |
| **Gate 7** | Visual Relevance | Strategy classifier | Visual strategy corresponds to scene content; no repetitive generic brain loops. |
| **Gate 8** | Full Render Completion | Showtime runner output | Render exit code 0; `final.mp4` created and readable. |
| **Gate 9** | Exact Output Dimensions & FPS | `ffprobe` stream metadata | Exact width 1080px, height 1920px (9:16 portrait), frame rate 30.0 fps. |
| **Gate 10** | Valid Codecs & Audio Stream | `ffprobe` stream inspection | Video codec `h264`, audio codec `aac`, sample rate 48000 Hz, stereo channels. |
| **Gate 11** | Video / Audio Duration Agreement | Duration comparison | Difference between video duration and audio duration $< 0.5$ seconds. |
| **Gate 12** | Word & Caption Synchronization | `SyncAuditor` audit | Caption timestamps monotonically increase; drift $< 150$ms. |
| **Gate 13** | Caption Safe-Zone & Clipping | Visual stage bounds | Caption font size $\ge 48$px; positioned above bottom 360px platform UI safe zone. |
| **Gate 14** | Black Frame & Corruption Audit | `ffprobe blackdetect` | Zero frozen frames; zero black frame intervals detected in post-render audit. |
| **Gate 15** | Opening Hook & Ending Payoff | Script & audio timeline | Hook completes in first 3 seconds; ending contains clear cognitive resolution. |
| **Gate 16** | Metadata Validation | `MetadataGenerator` check | Title $\le 60$ chars; valid description with academic citations; 3–5 relevant hashtags. |
| **Gate 17** | Thumbnail Validation | `ThumbnailGenerator` check | 1080×1920 JPG exists, high-contrast headline text, safe zone margins respected. |
| **Gate 18** | Duplicate Content Detection | SHA-256 fingerprinting | Content fingerprint does not match any previously published job. |
| **Gate 19** | Independent Post-Render QA | `PostRenderQA.auditVideo` | Comprehensive independent ffprobe audit verifies duration, resolution, audio stream, and passes. |
| **Gate 20** | Release Authorization | Operator approval flag | Explicit human editorial approval granted (`approvedForPublishing === true`). |

---

## Blocking Behavior
- If **any** of Gates 1–19 fail, the job transitions immediately to `QA_FAILED`.
- If Gates 1–19 pass but Gate 20 has not yet been approved by an operator, the job transitions to `AWAITING_APPROVAL`.
- Only when all 20 gates are satisfied does the job transition to `READY_TO_PUBLISH`.
