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
  sourceTitle?: string;
  url?: string;
  sourceUrl?: string;
  excerpt?: string;
  publicationDate?: string;
  retrievedAt?: string;
  confidence: number; // 0.0 - 1.0
  qualification?: string;
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

// ============================================================================
// PHASE 4: PRODUCTION FACTORY, PUBLISHING, SCHEDULING & ANALYTICS TYPES
// ============================================================================

export type FactoryStage =
  | "QUEUED"
  | "RESEARCHING"
  | "SCRIPTING"
  | "PLANNING"
  | "GENERATING_AUDIO"
  | "ACQUIRING_MEDIA"
  | "RENDERING"
  | "QA_RUNNING"
  | "QA_FAILED"
  | "AWAITING_APPROVAL"
  | "READY_TO_PUBLISH"
  | "UPLOAD_PENDING"
  | "UPLOADING"
  | "UPLOADED_PRIVATE"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ANALYTICS_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export interface VideoMetadata {
  title: string;
  description: string;
  hashtags: string[];
  tags: string[];
  hookDescription: string;
  contentFingerprint: string;
  provenanceRecord: {
    generatedAt: string;
    topicId: string;
    scriptWordCount: number;
    version: string;
  };
}

export interface ThumbnailSpec {
  path: string;
  width: number;
  height: number;
  format: "png" | "jpg";
  headline: string;
  subtext?: string;
  accentColor?: string;
  safeZonePass: boolean;
}

export interface YouTubeCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: number;
}

export interface YouTubeUploadRequest {
  filePath: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "private" | "unlisted" | "public";
  publishAt?: string;
  thumbnailPath?: string;
}

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
  status: "uploaded" | "scheduled" | "failed";
  privacyStatus: string;
  scheduledTime?: string;
  uploadedAt: string;
  verified: boolean;
  remoteTitle?: string;
  remoteDescription?: string;
}

export interface ScheduleSlot {
  slotIndex: number;
  timeStr: string; // e.g. "09:00", "12:00", "15:00", "17:00", "19:00", "21:00"
  timezone: string;
}

export interface ScheduleConfig {
  timezone: string;
  slotsPerDay: number;
  slotTimes: string[]; // 6 slots: ["09:00", "12:00", "15:00", "17:00", "19:00", "21:00"]
  enabled: boolean;
}

export interface PublicationQueueItem {
  id: string;
  jobId: string;
  title: string;
  scheduledFor: string; // ISO 8601
  status: "pending" | "approved" | "uploaded_private" | "scheduled" | "published" | "missed" | "cancelled";
  retryCount: number;
  remoteVideoId?: string;
  updatedAt: string;
  error?: string;
}

export interface VideoAnalyticsRecord {
  jobId: string;
  videoId: string;
  capturedAt: string;
  videoAgeHours: number;
  views: number;
  watchTimeMinutes: number;
  avgViewDurationSec: number;
  avgPercentageViewed: number;
  likes: number;
  comments: number;
  subscribersGained: number;
  subscribersLost: number;
  topic: string;
  narrativeStructure: string;
  visualStrategy: string;
  durationSec: number;
}

export interface ExperimentRecommendation {
  id: string;
  type: "hook" | "pacing" | "narrative" | "visual" | "topic";
  hypothesis: string;
  evidence: string;
  suggestedAction: string;
  confidence: number; // 0.0 - 1.0
  createdAt: string;
}

export interface FactoryJobState extends JobState {
  factoryStage: FactoryStage;
  approvedForPublishing?: boolean;
  approvalTimestamp?: string;
  approvedBy?: string;
  metadata?: VideoMetadata;
  thumbnail?: ThumbnailSpec;
  remoteVideoId?: string;
  remoteVideoUrl?: string;
  publishedAt?: string;
  scheduledFor?: string;
  publicationStatus?: "unapproved" | "ready" | "scheduled" | "published";
  history: Array<{
    stage: FactoryStage;
    timestamp: string;
    note?: string;
  }>;
}
