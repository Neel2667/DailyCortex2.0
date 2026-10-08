# DailyCortex 2.0 Engineering Audit & Architecture Plan

**Date:** 2026-10-08  
**Author:** Autonomous Principal Engineer (DailyCortex 2.0)  
**Target Repository:** [Neel2667/DailyCortex2.0](https://github.com/Neel2667/DailyCortex2.0)  
**Execution Environment:** macOS 15.7.9 (Darwin x86_64), Node v24.20.0, Showtime 0.4.0, FFmpeg 4.4.1 (with libass, loudnorm, ebur128), Headless Chrome 154

---

## 1. Executive Summary

DailyCortex 2.0 is designed to operate as an automated, high-retention YouTube content production factory focusing on psychology, human behavior, brain science, and surprising cognitive phenomena. 

The initial commit (`0b48d54`) established a minimal TypeScript scaffold. However, an exhaustive audit reveals that nearly the entire functional production pipeline was either a stub, a simulated placeholder, or missing entirely:
- The Showtime adapter did not generate Showtime projects, timelines, DOM scenes, or audio mixes; it merely outputted a markdown brief.
- Audio and caption generation were not integrated with the video engine.
- Visual planning had no scene variety, scoring, or asset deduplication.
- Quality gates only checked 5 basic properties on a TypeScript object with no technical, audio, visual, or render verification.
- Content intelligence lacked structured fact classification (verifying factual claims vs interpretations, examples, and speculations).

Showtime 0.4.0 is fully installed and verified on this machine (passing 21 doctor checks). It possesses native headless Chrome DOM rendering, Kokoro ONNX neural speech with exact word-level timestamping (`words.json`), procedural audio mixing with loudness normalization (`audio/mix.json`), and comprehensive pre/post-render QA verification.

This audit details the gap between the initial scaffold and production readiness, and establishes the modular DailyCortex 2.0 architecture.

---

## 2. Audit of Existing Repository State

### 2.1 What Already Works
1. **TypeScript Project Scaffold:** `package.json`, `tsconfig.json`, `vitest` configuration, and build pipeline.
2. **Provider Interfaces (Abstract):** Basic contracts defined in `src/types.ts` (`AssetProvider`, `VoiceProvider`).
3. **Showtime Binary Discovery:** Binary is detected and executable at `/Users/neel/.local/bin/showtime`.
4. **Basic Job Directory Creation:** `createJob()` creates `data/jobs/<id>` directory and writes `content.json`.

### 2.2 What Is Only a Stub
1. **Showtime Adapter (`src/showtime-adapter.ts`):** Only converts `ContentSpec` to a markdown string (`showtime-brief.md`). It generates **zero** Showtime project files (`showtime.json`, `index.html`, `audio/mix.json`, `words.json`).
2. **Groq Provider (`src/providers/groq.ts`):** Basic raw fetch to `llama-3.3-70b-versatile` returning untyped strings; lacks structured JSON schema enforcement, fact grounding, or retry/fallback handling.
3. **Pexels Provider (`src/providers/pexels.ts`):** Naive search taking the first video file without orientation scoring, duration matching, deduplication penalty, or local caching.
4. **Edge TTS Provider (`src/providers/edge-tts.ts`):** Relies on an external `edge-tts` CLI subprocess; does not output word timestamps required for synced karaoke captions.

### 2.3 What Is Simulated
1. **Dry-Run Mode (`src/cli.ts`):** Prints a JSON object representing job metadata. It simulates video production without actually assembling a valid, inspectable project timeline or preview.
2. **Quality Gates (`src/quality.ts`):** Evaluates 5 naive boolean expressions on memory objects without checking actual audio stems, video frames, render artifacts, or factual assertions.

### 2.4 What Is Production-Ready
- **Local Showtime 0.4.0 Engine:** Capable of high-speed deterministic rendering via Headless Chrome, Kokoro ONNX speech synthesis with word-level timestamps, procedural sound design, and EBU R128 loudness normalization.

### 2.5 What Is Not Production-Ready
- Content intelligence pipeline (topic curation, claim extraction, angle scoring).
- Visual planning engine (scene choreography, asset selection, motion typography).
- Media caching and scoring.
- Audio synchronization and caption alignment.
- Multi-stage job lifecycle management (queued, researching, scripted, planned, assets, audio, production, rendering, qa, approved).
- Full automated QA gates (Content, Visual, Audio, Caption, Technical, Production).

---

## 3. Showtime Architecture & Capabilities

Following direct inspection of `/Users/neel/showtime` and the Showtime 0.4.0 CLI:

### 3.1 Capabilities
- **Project Structure:** A Showtime project is a directory containing:
  - `showtime.json`: Viewport resolution (1080x1920 for 9:16 Shorts), fps (30), duration, background color, audio mix link (`audio/mix.json`), and platform expectations (`"platform": "shorts"`).
  - `index.html`: DOM-based stage (`<div class="stage">`) with `<section class="scene" data-start="..." data-dur="..." data-transition="...">`. Leverages built-in components (`data-st="kinetic-type"`, `data-st="caption-karaoke"`, `data-st="steps"`, `data-st="chat-thread"`, `data-st="grain"`).
  - `audio/mix.json`: Declarative multi-track mix containing music beds (`kind: "music"`, `duck: {"under": "voice"}`), synthesized sound effects (`kind: "sfx"`, types like `whoosh`, `pop`, `thock`, `ding`, `chime`), and voice clips (`kind: "voice"`, `file: "voice/vo.wav"`), normalized to `-14 LUFS` and `-1 dBTP`.
  - `voice/` & `words.json`: Native Kokoro ONNX engine (`showtime voice say`) produces both speech WAV and millisecond-accurate `words.json` word timestamps.
- **Rendering Engine:** Headless Google Chrome with WebGL Metal/SwiftShader, capturing frame-by-frame (`ST.seek(t)`), encoded via FFmpeg (`libx264`, BT.709 color matrix, faststart).
- **QA Verification:**
  - `showtime check`: Inspects WCAG contrast (4.5:1), off-canvas text, safe zones (essential for YouTube Shorts 9:16 UI overlays), reading speed, dead air / frozen frames, and determinism.
  - `showtime qa`: Validates audio loudness (-14 LUFS for YouTube Shorts), silent stretches, black frames, platform resolution, and caption synchronization.

### 3.2 Limitations & Constraints
- **GPU Acceleration:** Requires stable headless Chrome flags (`--use-angle=metal --enable-gpu-rasterization --ignore-gpu-blocklist`).
- **Resource Intensity:** Concurrent browser renders can strain low-powered MacBooks; concurrency must be strictly limited (default 1 worker, max 2).
- **Asset Sizing:** High-resolution videos embedded in HTML can cause frame drops during seek if not properly sized and pre-cached locally.

---

## 4. Blockers & Improvements

### P0 Blockers (Must Fix Immediately)
1. **Showtime Project Generator Missing:** The pipeline must generate real, valid `showtime.json`, `index.html`, `mix.json`, and caption data rather than just markdown text.
2. **Audio & Caption Timing Disconnect:** Narration voice audio and word timings must be generated and linked directly into `mix.json` and `caption-karaoke`.
3. **Lack of Structured Content Intelligence:** Topic discovery and script generation must use explicit schemas distinguishing verified facts, interpretations, examples, and speculations.
4. **No Deterministic Dry-Run Production:** Pipeline must be runnable locally without external API keys (Groq/Pexels) by utilizing high-quality mock/offline providers and Showtime's local voice capabilities.

### P1 Blockers (High Priority for Production Quality)
1. **Visual Monotony & Generic AI Aesthetics:** Script-to-visual planner must orchestrate diverse scene types (real footage, human reactions, motion typography, diagrams, kinetic cards, mixed scenes) with custom motion treatments and transitions.
2. **Asset Scoring & Deduplication:** Assets must be scored based on semantic fit, orientation (9:16 priority), resolution, and penalize repeated usage.
3. **Comprehensive Quality Gates:** Multi-layer QA checking script readability, scene durations, audio loudness, visual variety, and caption timing.

### P2 Improvements (Production Scaling)
1. Topic fatigue prevention and similarity clustering.
2. Pexels / Openverse multi-provider asset resolution.
3. YouTube upload automation and thumbnail extraction.
4. Retention feedback loop into future topic selection.

---

## 5. DailyCortex 2.0 Target Architecture

```
┌────────────────────────────────────────────────────────┐
│                   DAILYCORTEX 2.0                      │
└────────────────────────────────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  CONTENT INTELLIGENCE   │         │   MEDIA INTELLIGENCE    │
│  - Topic Engine         │         │  - Asset Providers      │
│  - Fact Engine          │         │    (Pexels, Mock/Local) │
│    (Fact/Interp/Spec)   │         │  - Asset Scoring & Dedup│
│  - Script Engine        │         │  - Media Cache          │
│  - Visual Storyboard    │         └─────────────────────────┘
└───────────┬─────────────┘                      │
            │                                    │
            ▼                                    │
┌─────────────────────────┐                      │
│      AUDIO ENGINE       │                      │
│  - Voice (Kokoro/Showtime│                     │
│    + Edge-TTS fallback) │                      │
│  - Exact Word Timings   │                      │
│  - Sound FX & Music Bed │                      │
│  - Ducking (-14 LUFS)   │                      │
└───────────┬─────────────┘                      │
            │                                    │
            └───────────────────┬────────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │    SHOWTIME ADAPTER     │
                    │  - showtime.json        │
                    │  - index.html (9:16)    │
                    │  - audio/mix.json       │
                    │  - words.json           │
                    └───────────┬─────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │      QUALITY GATES      │
                    │  - Content & Fact QA    │
                    │  - Visual Variety QA    │
                    │  - Audio & Loudness QA  │
                    │  - Caption Timing QA    │
                    │  - Showtime Check / QA  │
                    └───────────┬─────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │      ORCHESTRATOR       │
                    │  - Job Stages & State   │
                    │  - Recovery & Logging   │
                    │  - Preview / Final Render│
                    └─────────────────────────┘
```

---

## 6. Recommended Implementation Order

1. **Core Type System & Schemas:** Extend `src/types.ts` with strict schemas for Topics, Claims/Facts, Scripts, Storyboards, Scenes, Audio Tracks, and Quality Results.
2. **Content Intelligence Engine (`src/content/`):**
   - Topic engine with novelty, curiosity, and psychological angle scoring.
   - Fact engine categorizing VERIFIED FACT, INTERPRETATION, EXAMPLE, SPECULATION.
   - Script engine with varied narrative hooks and payoff structures.
   - Visual planner assigning scene types (footage, typography, diagram, reaction, mixed).
3. **Media Intelligence Engine (`src/media/`):**
   - Asset provider abstraction with multi-factor scoring (relevance, orientation, freshness, duration).
   - Deduplication tracker preventing clip repetition.
   - Local asset generator/cache for mock & dry-run operations.
4. **Audio & Caption Engine (`src/audio/`):**
   - Showtime native Kokoro TTS integration (`showtime voice say`) for zero-dependency local speech with exact word-level timing.
   - Procedural SFX & music bed generator with dynamic ducking.
5. **Production Showtime Generator (`src/showtime/`):**
   - Full HTML stage generator respecting 9:16 mobile safe zones and Showtime kinetic components.
   - `showtime.json` and `audio/mix.json` configuration builders.
   - Subprocess runner executing `showtime check` and `showtime render`.
6. **Unified Quality Gate System (`src/quality/`):**
   - Content QA, Visual QA, Audio QA, Caption QA, Technical QA, and Production QA.
7. **End-to-End Orchestrator & CLI:**
   - Job lifecycle runner with stage tracking and recovery.
   - Executable target Short: *"Why embarrassing memories stay with us"*.
8. **Automated Test Suite:**
   - Unit and integration tests covering all schemas, planners, audio timing, project generation, and quality gates.
