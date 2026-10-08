# DailyCortex 2.0

Automated YouTube Short production factory built around [Showtime](https://github.com/FavioVazquez/showtime) and local neural speech intelligence.

## Product Vision

DailyCortex produces high-retention, psychology and neuroscience vertical videos (9:16 Shorts) designed to captivate viewers and eliminate generic AI video cliches:
- **No static slides or PowerPoint templates**
- **No repetitive stock clips or glowing-brain cliches**
- **No disconnected narration and imagery**
- **Dynamic visual grammar:** Interweaving kinetic typography, human reactions, biological diagrams, and punchy payoffs.
- **Accurate science:** Distinct separation of verified scientific facts, interpretations, and speculations.
- **Synchronized audio & captions:** Native millisecond-precision word timings driving animated karaoke captions and ducked sound design.

---

## Architecture

```
TOPIC DISCOVERY & SELECTION
            ↓
FACT ENGINE (Verified Facts / Claims)
            ↓
SCRIPT ENGINE (Fast Pacing, 130-165 WPM, High-Curiosity Hooks)
            ↓
VISUAL STORYBOARD PLANNER (Multimodal beats & transitions)
            ↓
MEDIA INTELLIGENCE (Scoring, 9:16 prioritization, deduplication)
            ↓
AUDIO ENGINE (Kokoro ONNX Neural Voice + Ducked Procedural Music & SFX)
            ↓
SHOWTIME PRODUCTION (showtime.json + 9:16 HTML Stage + audio/mix.json + words.json)
            ↓
QUALITY GATES (Content, Factual, Visual, Audio, Caption, Technical QA)
            ↓
HEADLESS CHROME RENDER & POST-RENDER QA (-14 LUFS, frame verification)
```

---

## Project Structure

```
├── docs/
│   ├── PHASE_3A_FORENSIC_AUDIT.md # Independent verification of Phase 2 claims & root causes
│   ├── THREE_VIDEO_BENCHMARK.md   # Cross-video anti-repetition audit across 3 distinct Shorts
│   ├── VIDEO_PRODUCTION_REVIEW.md # Frame-by-frame visual inspection of rendered Short
│   └── ENGINEERING_AUDIT.md       # Architectural audit and historical findings
├── src/
│   ├── content/                   # Content Intelligence
│   │   ├── fact-engine.ts         # Claim validation and scientific truth checks
│   │   ├── topic-engine.ts        # Psychology/brain topics with deterministic template selection
│   │   ├── narrative-templates.ts # 3 distinct 5-beat architectures (Paradox, Mystery, Scenario)
│   │   ├── script-engine.ts       # Template-driven script generation & pacing
│   │   └── visual-planner.ts      # 10-category visual strategy & semantic relevance scoring
│   ├── media/                     # Media Intelligence & Normalization
│   │   ├── media-normalizer.ts    # FFmpeg 1080x1920 cropping, WebM VP9 plates, SHA256 cache
│   │   ├── asset-scorer.ts        # Multi-factor scoring & duplicate penalty
│   │   ├── asset-manager.ts       # Multi-provider resolution, provenance manifest & local caching
│   │   └── mock-provider.ts       # Deterministic offline asset provider
│   ├── audio/                     # Audio & Sound Design
│   │   ├── voice-engine.ts        # Showtime Kokoro ONNX speech & word timing
│   │   ├── sound-design.ts        # Procedural music ducking & transition SFX
│   │   └── timeline-retimer.ts    # Canonical speech synchronization & scene retiming
│   ├── showtime/                  # Native Showtime Production
│   │   ├── html-builder.ts        # Mobile safe zone 9:16 HTML5 stage with WebM video plates
│   │   ├── project-builder.ts     # Complete Showtime project disk assembler
│   │   └── runner.ts              # Headless Chrome render & QA runner
│   ├── quality/                   # Multi-Layer Quality Gates & Independent Auditing
│   │   ├── quality-gates.ts       # 17-point pre-render and post-render validation gates
│   │   ├── sync-auditor.ts        # Word-level monotonicity & scene envelope audit (sync-report.json)
│   │   ├── audio-auditor.ts       # Integrated LUFS, true peak & silence audit (audio-quality.json)
│   │   └── post-render-qa.ts      # Independent ffprobe/ffmpeg MP4 validator (post-render-report.json)
│   ├── orchestration/             # Factory Pipeline
│   │   └── pipeline.ts            # End-to-end multi-stage pipeline coordinator
│   ├── cli.ts                     # CLI commands (dry-run, generate, render)
│   ├── types.ts                   # Core domain type contracts
│   └── config.ts                  # Environment configuration
└── tests/                         # Full automated test suite (29 tests passing)
```

---

## Output Format Contract

Every production video strictly adheres to the mobile-first vertical Short specification:
- **Width:** 1080 px
- **Height:** 1920 px (Exact 9:16 aspect ratio)
- **Framerate:** 30 CFR
- **Pixel Format:** `yuv420p`
- **Video Codec:** H.264 High Profile (BT.709 color matrix)
- **Audio Codec:** AAC-LC @ 192 kbps, 48 kHz stereo
- **Loudness:** -14.0 LUFS target, -1.0 dBTP ceiling, voice ducking enabled

---

## Getting Started

### Prerequisites
- Node.js v20+
- [Showtime](https://github.com/FavioVazquez/showtime) CLI installed and available in PATH (or configured via `SHOWTIME_BIN`)
- FFmpeg (for video encoding, WebM VP9 motion plates, and loudness normalization)

### Installation
```bash
npm install
```

### Running Tests & Typecheck
```bash
npm run typecheck
npm test
```

### Dry-Run Mode (100% Offline, Deterministic, 0 API Keys Needed)
Generates the full project for the target video *"Why Embarrassing Memories Never Fade"*, validates all quality gates with canonical timeline alignment, and creates inspectable native Showtime project files:
```bash
npm run dry-run
```


### Generate Native Showtime Project with Real Local Voice
Synthesizes real Kokoro neural speech (`vo.wav`), extracts millisecond-accurate word timestamps (`words.json`), canonically retimes all scenes, generates local 1080x1920 WebM motion plates, and assembles the full Showtime project:
```bash
npx tsx src/cli.ts generate
```

### Full Render & Video QA
Renders the assembled project via Headless Chrome to a finished 9:16 MP4 with -14 LUFS audio normalization and independent ffprobe validation:
```bash
npx tsx src/cli.ts render
```
