/**
 * DailyCortex 2.0 Core Type Definitions
 * Structured for autonomous YouTube Short production factory.
 */

export type VideoFormat = "short" | "long";

export interface ContentSpec {
  id: string;
  title: string;
  topic: string;
  format: VideoFormat;
  durationSec: number;
  hook: string;
  script: string;
  voice: { provider: "edge-tts" | "showtime" | "external"; voiceId: string };
  scenes: Array<{
    id: string;
    type: SceneType;
    durationSec: number;
    narration?: string;
    visualPrompt?: string;
    assetQuery?: string;
    caption?: string;
    notes?: string;
  }>;
  metadata: { description: string; hashtags: string[] };
}

export type ClaimCategory = "VERIFIED_FACT" | "INTERPRETATION" | "EXAMPLE" | "SPECULATION";

export interface FactualClaim {
  id: string;
  claim: string;
  category: ClaimCategory;
  source?: string;
  url?: string;
  confidence: number; // 0.0 - 1.0
  notes?: string;
}

export interface TopicItem {
  id: string;
  topic: string;
  category: "psychology" | "human_behavior" | "brain_science" | "memory" | "perception" | "social_dynamics" | "everyday_science";
  angle: string;
  noveltyScore: number; // 1 - 10
  curiosityScore: number; // 1 - 10
  visualPotential: number; // 1 - 10
  targetDurationSec: number;
  claims: FactualClaim[];
  tags: string[];
}

export type SceneType =
  | "hook"
  | "reaction"
  | "footage"
  | "typography"
  | "diagram"
  | "chart"
  | "mixed"
  | "payoff"
  | "graphic"
  | "text"
  | "outro";

export type MotionTreatment =
  | "kinetic-pop"
  | "rise"
  | "punch"
  | "glide"
  | "focus-zoom"
  | "split-reveal";

export type SceneMood =
  | "dark_night_bedroom"
  | "ambient_cafe"
  | "neural_threat_matrix"
  | "fmri_scan_clinical"
  | "sunset_relief_peace";

export type VisualStrategy =
  | "real_world_footage"
  | "kinetic_typography"
  | "data_visualization"
  | "ui_metaphor"
  | "diagram_animation"
  | "cinematic_ambient"
  | "human_behavior"
  | "scientific_visualization"
  | "payoff_card";

export type NarrativeStructure =
  | "HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF"
  | "MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY"
  | "SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT"
  | "OBSERVATION_SURPRISE"
  | "MYSTERY_REVEAL"
  | "CONTRADICTION_IMPLICATION"
  | "QUESTION_MECHANISM";

export interface ScenePlan {
  id: string;
  sceneNumber: number;
  type: SceneType;
  visualStrategy?: VisualStrategy;
  durationSec: number;
  narrationText: string;
  visualPrompt: string;
  assetQuery?: string;
  assetPath?: string;
  mood?: SceneMood;
  onScreenText?: string;
  motion: MotionTreatment;
  transition: string; // e.g. "push up 0.4", "sdf-iris 0.5", "crossfade 0.3"
  soundCues?: string[]; // e.g. ["whoosh", "pop", "thock"]
  cardLayout?: {
    headline: string;
    subtext?: string;
    badge?: string;
    accentColor?: string;
    dataComparison?: {
      itemA: { label: string; value: string; percentage: number; highlight?: boolean };
      itemB: { label: string; value: string; percentage: number; highlight?: boolean };
    };
    diagramSteps?: Array<{ title: string; subtitle?: string; icon?: string }>;
    metricsList?: Array<{ label: string; value: string; alert?: boolean }>;
  };
}

export interface ScriptBeat {
  beatNumber: number;
  name: "hook" | "tension" | "mechanism" | "example" | "insight" | "payoff";
  narration: string;
  estimatedSec: number;
  spokenSec?: number;
  targetVisual: SceneType;
}

export interface ScriptSpec {
  title: string;
  hook: string;
  coreInsight: string;
  narrativeStructure: NarrativeStructure;
  beats: ScriptBeat[];
  fullNarration: string;
  estimatedTotalSec: number;
  wordCount: number;
  wordsPerMinute: number;
}

export interface TimedWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface VoiceSynthesisResult {
  audioPath: string;
  durationSec: number;
  words: TimedWord[];
  voiceId: string;
  provider: "showtime" | "edge-tts" | "mock";
}

export interface MediaAsset {
  id: string;
  provider: "pexels" | "openverse" | "local" | "mock";
  url: string;
  localPath?: string;
  mediaType: "video" | "image";
  width: number;
  height: number;
  durationSec?: number;
  orientation: "portrait" | "landscape" | "square";
  query: string;
  score: number;
  attribution?: string;
}

export type Asset = MediaAsset;

export interface StoryboardPlan {
  topic: TopicItem;
  script: ScriptSpec;
  scenes: ScenePlan[];
  totalDurationSec: number;
  soundtrack: {
    style: "minimal-pulse" | "synthwave" | "lofi-beat" | "cinematic-ambient";
    bpm: number;
    duckingDb: number;
  };
  canonicalTimeline?: {
    narrationDurationSec: number;
    endHoldSec: number;
    totalDurationSec: number;
    retimed: boolean;
  };
}

export interface ShowtimeProjectFiles {
  projectDir: string;
  showtimeJsonPath: string;
  indexPath: string;
  mixJsonPath: string;
  wordsJsonPath: string;
  narrationMdPath: string;
}

export type JobStage =
  | "queued"
  | "curation"
  | "scripting"
  | "storyboarding"
  | "asset_sourcing"
  | "voice_generation"
  | "project_assembly"
  | "pre_render_qa"
  | "rendering"
  | "post_render_qa"
  | "approved"
  | "failed";

export interface QualityGateResult {
  gate: "content" | "factual" | "visual" | "audio" | "caption" | "technical" | "production";
  check: string;
  passed: boolean;
  score?: number;
  message: string;
  severity: "error" | "warning";
}

export interface JobState {
  id: string;
  createdAt: string;
  updatedAt: string;
  stage: JobStage;
  topic?: TopicItem;
  storyboard?: StoryboardPlan;
  voiceResult?: VoiceSynthesisResult;
  assets?: MediaAsset[];
  workDir: string;
  projectDir?: string;
  renderPath?: string;
  qualityResults: QualityGateResult[];
  error?: string;
  retryCount: number;
}

export interface ProviderResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export interface AssetProvider {
  search(query: string, options?: { limit?: number; orientation?: "portrait" | "landscape" | "square" }): Promise<ProviderResult<MediaAsset[]>>;
}

export interface VoiceProvider {
  synthesize(text: string, voiceId: string, outputDir: string): Promise<ProviderResult<VoiceSynthesisResult>>;
}

export interface AssetProvenance {
  provider: "pexels" | "openverse" | "local" | "mock";
  providerAssetId: string;
  sourceUrl?: string;
  downloadUrl?: string;
  searchQuery: string;
  orientation: "portrait" | "landscape" | "square";
  originalDimensions: { width: number; height: number };
  normalizedDimensions: { width: number; height: number };
  durationSec?: number;
  checksum: string;
  localPath: string;
  normalizationSettings?: {
    codec: string;
    fps: number;
    bitrate: string;
  };
  sceneAssignment: string | number;
  timestamp: string;
}

export interface SyncReport {
  audioDuration: number;
  videoDuration: number;
  holdDuration: number;
  durationDelta: number;
  sceneChecks: Array<{
    sceneNumber: number;
    sceneType: string;
    plannedStart: number;
    plannedEnd: number;
    duration: number;
    firstWord?: { word: string; start: number };
    lastWord?: { word: string; end: number };
    aligned: boolean;
    discrepancySec: number;
  }>;
  captionChecks: Array<{
    index: number;
    text: string;
    start: number;
    end: number;
    inSpeechRange: boolean;
  }>;
  monotonicityChecks: {
    passed: boolean;
    invertedPairsCount: number;
  };
  violations: string[];
  passed: boolean;
  status: "PASS" | "FAIL";
}

export interface AudioQualityReport {
  integrated_lufs: number;
  true_peak: number;
  duration: number;
  narration_duration: number;
  music_duration: number;
  sfx_count: number;
  peak_events: number;
  clipping_detected: boolean;
  silence_ranges: Array<{ start: number; end: number; duration: number }>;
  status: "PASS" | "FAIL";
}

export interface PostRenderReport {
  videoPath: string;
  fileSizeBytes: number;
  duration: number;
  dimensions: { width: number; height: number };
  aspectRatio: number;
  aspectRatioStr: string;
  fps: number;
  videoCodec: string;
  pixelFormat: string;
  audioCodec: string;
  audioSampleRate: number;
  audioChannels: number;
  audioDuration: number;
  faststart: boolean;
  blackFramesCount: number;
  frozenSectionsCount: number;
  checks: {
    exactDimensionsPass: boolean; // MUST be 1080x1920
    exactAspectPass: boolean;     // MUST be 9:16
    fpsPass: boolean;             // MUST be 30
    videoCodecPass: boolean;      // H.264
    audioCodecPass: boolean;      // AAC
    audioDurationSyncPass: boolean; // delta < 0.5s
    fileIntegrityPass: boolean;
  };
  passed: boolean;
  violations: string[];
  status: "PASS" | "FAIL";
}
