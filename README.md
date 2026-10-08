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
│   ├── ENGINEERING_AUDIT.md       # Comprehensive system audit & findings (Phase 1 & 2)
│   └── VIDEO_PRODUCTION_REVIEW.md # Frame-by-frame visual inspection of rendered Short
├── src/
│   ├── content/                   # Content Intelligence
│   │   ├── fact-engine.ts         # Claim validation and scientific truth checks
│   │   ├── topic-engine.ts        # Curated psychology/brain topics library
│   │   ├── script-engine.ts       # Multi-structure script generation & pacing
│   │   └── visual-planner.ts      # Multimodal storyboard & transition planner
│   ├── media/                     # Media Intelligence & Normalization
│   │   ├── media-normalizer.ts    # FFmpeg 1080x1920 cropping, WebM VP9 plates, SHA256 cache
│   │   ├── asset-scorer.ts        # Multi-factor scoring & duplicate penalty
│   │   ├── asset-manager.ts       # Multi-provider resolution & local caching
│   │   └── mock-provider.ts       # Deterministic offline asset provider
│   ├── audio/                     # Audio & Sound Design
│   │   ├── voice-engine.ts        # Showtime Kokoro ONNX speech & word timing
│   │   ├── sound-design.ts        # Procedural music ducking & transition SFX
│   │   └── timeline-retimer.ts    # Canonical speech synchronization & scene retiming
│   ├── showtime/                  # Native Showtime Production
│   │   ├── html-builder.ts        # Mobile safe zone 9:16 HTML5 stage with WebM video plates
│   │   ├── project-builder.ts     # Complete Showtime project disk assembler
│   │   └── runner.ts              # Headless Chrome render & QA runner
│   ├── quality/                   # Multi-Layer Quality Gates
│   │   └── quality-gates.ts       # Content, visual, audio, caption, technical QA + independent ffprobe
│   ├── orchestration/             # Factory Pipeline
│   │   └── pipeline.ts            # End-to-end multi-stage pipeline coordinator
│   ├── cli.ts                     # CLI commands (dry-run, generate, render)
│   ├── types.ts                   # Core domain type contracts
│   └── config.ts                  # Environment configuration
└── tests/                         # Full automated test suite (20 tests passing)
```

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
