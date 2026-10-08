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

export type NarrativeStructure =
  | "OBSERVATION_SURPRISE"
  | "MYSTERY_REVEAL"
  | "CONTRADICTION_IMPLICATION"
  | "QUESTION_MECHANISM";

export interface ScenePlan {
  id: string;
  sceneNumber: number;
  type: SceneType;
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
