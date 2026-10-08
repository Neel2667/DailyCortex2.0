import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { config } from "../config.js";
import type {
  FactoryStage,
  FactoryJobState,
  TopicItem,
  QualityGateResult
} from "../types.js";
import { TopicEngine } from "../content/topic-engine.js";
import { FactEngine } from "../content/fact-engine.js";
import { ScriptEngine } from "../content/script-engine.js";
import { VisualPlanner } from "../content/visual-planner.js";
import { AssetManager } from "../media/asset-manager.js";
import { VoiceEngine } from "../audio/voice-engine.js";
import { TimelineRetimer } from "../audio/timeline-retimer.js";
import { ShowtimeProjectBuilder } from "../showtime/project-builder.js";
import { ShowtimeRunner } from "../showtime/runner.js";
import { QualityGateEngine } from "../quality/quality-gates.js";
import { SyncAuditor } from "../quality/sync-auditor.js";
import { AudioAuditor } from "../quality/audio-auditor.js";
import { PostRenderQA } from "../quality/post-render-qa.js";
import { MetadataGenerator } from "../publishing/metadata-generator.js";
import { ThumbnailGenerator } from "../publishing/thumbnail-generator.js";
import { YouTubeClient } from "../publishing/youtube-client.js";
import { PublicationScheduler } from "../publishing/scheduler.js";

export interface FactoryRunOptions {
  jobId?: string;
  topicId?: string;
  outputRoot?: string;
  dryRun?: boolean;
  renderVideo?: boolean;
  autoApprove?: boolean;
  scheduleSlotIso?: string;
  maxRetries?: number;
  forceRerun?: boolean;
}

export class FactoryEngine {
  private assetManager: AssetManager;
  private showtimeRunner: ShowtimeRunner;
  private youtubeClient: YouTubeClient;
  private scheduler: PublicationScheduler;

  // Valid state transitions
  private static readonly VALID_TRANSITIONS: Record<FactoryStage, FactoryStage[]> = {
    QUEUED: ["RESEARCHING", "FAILED", "CANCELLED"],
    RESEARCHING: ["SCRIPTING", "QUEUED", "FAILED", "CANCELLED"],
    SCRIPTING: ["PLANNING", "QUEUED", "FAILED", "CANCELLED"],
    PLANNING: ["GENERATING_AUDIO", "QUEUED", "FAILED", "CANCELLED"],
    GENERATING_AUDIO: ["ACQUIRING_MEDIA", "QUEUED", "FAILED", "CANCELLED"],
    ACQUIRING_MEDIA: ["RENDERING", "QA_RUNNING", "QUEUED", "FAILED", "CANCELLED"],
    RENDERING: ["QA_RUNNING", "QUEUED", "FAILED", "CANCELLED"],
    QA_RUNNING: ["AWAITING_APPROVAL", "QA_FAILED", "QUEUED", "FAILED", "CANCELLED"],
    QA_FAILED: ["QUEUED", "SCRIPTING", "FAILED", "CANCELLED"],
    AWAITING_APPROVAL: ["READY_TO_PUBLISH", "QA_FAILED", "QUEUED", "CANCELLED"],
    READY_TO_PUBLISH: ["UPLOAD_PENDING", "SCHEDULED", "QUEUED", "CANCELLED"],
    UPLOAD_PENDING: ["UPLOADING", "UPLOADED_PRIVATE", "SCHEDULED", "QUEUED", "FAILED", "CANCELLED"],
    UPLOADING: ["UPLOADED_PRIVATE", "PUBLISHED", "FAILED", "CANCELLED"],
    UPLOADED_PRIVATE: ["SCHEDULED", "ANALYTICS_PENDING", "COMPLETED"],
    SCHEDULED: ["PUBLISHED", "ANALYTICS_PENDING", "COMPLETED", "FAILED"],
    PUBLISHED: ["ANALYTICS_PENDING", "COMPLETED"],
    ANALYTICS_PENDING: ["COMPLETED", "FAILED"],
    COMPLETED: ["QUEUED"],
    CANCELLED: ["QUEUED"],
    FAILED: ["QUEUED"]
  };

  constructor() {
    this.assetManager = new AssetManager();
    this.showtimeRunner = new ShowtimeRunner();
    this.youtubeClient = new YouTubeClient();
    this.scheduler = new PublicationScheduler();
  }

  /**
   * Transition state machine stage with validation and atomic file persistence
   */
  async transition(state: FactoryJobState, target: FactoryStage, note?: string): Promise<void> {
    const allowed = FactoryEngine.VALID_TRANSITIONS[state.factoryStage];
    if (!allowed || !allowed.includes(target)) {
      throw new Error(`Invalid state transition: ${state.factoryStage} -> ${target}`);
    }

    state.factoryStage = target;
    state.updatedAt = new Date().toISOString();
    state.history.push({
      stage: target,
      timestamp: state.updatedAt,
      note
    });

    await this.persistState(state);
  }

  /**
   * Persists job state atomically
   */
  async persistState(state: FactoryJobState): Promise<void> {
    await mkdir(state.workDir, { recursive: true });
    const targetPath = join(state.workDir, "job-state.json");
    const tmpPath = join(state.workDir, `job-state.json.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf-8");
    await rename(tmpPath, targetPath);
  }

  /**
   * Loads persisted state from job work directory
   */
  async loadState(workDir: string): Promise<FactoryJobState | null> {
    try {
      const data = await readFile(join(workDir, "job-state.json"), "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Verifies that approved video and metadata have not been tampered with or changed
   */
  async verifyApprovalIntegrity(state: FactoryJobState): Promise<{ valid: boolean; reason?: string }> {
    if (!state.approvedForPublishing) {
      return { valid: false, reason: "Job has not received editorial release authorization" };
    }

    if (state.approvedVideoSha256) {
      if (!state.renderPath || !existsSync(state.renderPath)) {
        return { valid: false, reason: "Approved video artifact is missing" };
      }
      const buf = await readFile(state.renderPath);
      const currentSha = createHash("sha256").update(buf).digest("hex");
      if (currentSha !== state.approvedVideoSha256) {
        return { valid: false, reason: "Rendered MP4 checksum mismatch: video artifact altered after approval" };
      }
    }

    if (state.approvedMetadataFingerprint) {
      if (!state.metadata || state.metadata.contentFingerprint !== state.approvedMetadataFingerprint) {
        return { valid: false, reason: "Metadata content fingerprint mismatch: metadata altered after approval" };
      }
    }

    return { valid: true };
  }

  /**
   * Explicit human editorial approval method
   */
  async approveJob(jobId: string, approverName: string, outputRoot = "data/jobs"): Promise<FactoryJobState> {
    const workDir = join(outputRoot, jobId);
    const state = await this.loadState(workDir);
    if (!state) {
      throw new Error(`Job ${jobId} not found in ${outputRoot}`);
    }
    if (state.factoryStage !== "AWAITING_APPROVAL") {
      throw new Error(`Cannot approve job ${jobId} in stage ${state.factoryStage}; must be in AWAITING_APPROVAL`);
    }

    // Check technical gates from twenty-gates-audit.json
    const reportsDir = join(workDir, "reports");
    let gateAudit: any;
    try {
      gateAudit = JSON.parse(await readFile(join(reportsDir, "twenty-gates-audit.json"), "utf-8"));
    } catch {
      throw new Error(`Missing twenty-gates-audit.json for ${jobId}; quality gates must be audited before approval`);
    }

    const techGates = gateAudit.gates.filter((g: any) => g.id !== 20);
    const techPassed = techGates.every((g: any) => g.passed);
    if (!techPassed) {
      const failed = techGates.filter((g: any) => !g.passed).map((g: any) => g.name);
      throw new Error(`Cannot approve job ${jobId}: technical quality gates failed (${failed.join(", ")})`);
    }

    // Record checksums of approved artifacts
    if (state.renderPath && existsSync(state.renderPath)) {
      const buf = await readFile(state.renderPath);
      state.approvedVideoSha256 = createHash("sha256").update(buf).digest("hex");
    }
    if (state.metadata) {
      state.approvedMetadataFingerprint = state.metadata.contentFingerprint;
    }

    state.approvedForPublishing = true;
    state.approvedBy = approverName;
    state.approvalTimestamp = new Date().toISOString();

    await this.transition(state, "READY_TO_PUBLISH", `Editorial release authorization granted by ${approverName}`);
    return state;
  }

  /**
   * Explicit rejection method
   */
  async rejectJob(jobId: string, reason: string, outputRoot = "data/jobs"): Promise<FactoryJobState> {
    const workDir = join(outputRoot, jobId);
    const state = await this.loadState(workDir);
    if (!state) {
      throw new Error(`Job ${jobId} not found in ${outputRoot}`);
    }

    state.approvedForPublishing = false;
    state.approvedBy = undefined;
    state.approvalTimestamp = undefined;
    await this.transition(state, "QA_FAILED", `Editorial release rejected: ${reason}`);
    return state;
  }

  /**
   * Executes an end-to-end factory production job
   */
  async runJob(options: FactoryRunOptions = {}): Promise<FactoryJobState> {
    const jobId = options.jobId ?? `short-${options.topicId || Date.now()}`;
    const outputRoot = options.outputRoot ?? "data/jobs";
    const workDir = join(outputRoot, jobId);
    const projectDir = join(workDir, "project");
    const reportsDir = join(workDir, "reports");
    await mkdir(workDir, { recursive: true });
    await mkdir(reportsDir, { recursive: true });

    // Try recovering existing state or initialize new
    let state = await this.loadState(workDir);
    if (!state) {
      state = {
        id: jobId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: "queued",
        factoryStage: "QUEUED",
        workDir,
        projectDir,
        qualityResults: [],
        retryCount: 0,
        history: [{ stage: "QUEUED", timestamp: new Date().toISOString() }]
      };
      await this.persistState(state);
    } else if (state.factoryStage === "COMPLETED") {
      const renderMissing = options.renderVideo && (!state.renderPath || !existsSync(state.renderPath));
      if (renderMissing || options.forceRerun) {
        await this.transition(state, "QUEUED", renderMissing ? "Rerunning job to render missing video artifact" : "Forced rerun initiated by operator");
      } else {
        return state;
      }
    } else if (state.factoryStage !== "QUEUED") {
      await this.transition(state, "QUEUED", `Resuming/retrying job from stage ${state.factoryStage}`);
    }

    try {
      // 1. RESEARCHING
      await this.transition(state, "RESEARCHING", "Validating topic claims and sources");
      let topic: TopicItem;
      if (options.topicId) {
        topic = TopicEngine.getTopicById(options.topicId) ?? TopicEngine.getTargetEmbarrassingMemoryTopic();
      } else {
        topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
      }
      state.topic = topic;

      const claimCheck = FactEngine.validateClaims(topic.claims);
      if (!claimCheck.valid) {
        throw new Error(`Research validation rejected: ${claimCheck.issues.join("; ")}`);
      }

      // 2. SCRIPTING
      await this.transition(state, "SCRIPTING", "Generating deterministic narrative script");
      const script = ScriptEngine.generateScript(topic);
      const factAudit = FactEngine.auditScriptAgainstClaims(script.fullNarration, topic.claims);
      if (!factAudit.passed) {
        throw new Error(`Script factual audit rejected: ${factAudit.notes.join("; ")}`);
      }

      // 3. PLANNING
      await this.transition(state, "PLANNING", "Planning storyboard and visual strategies");
      const storyboard = VisualPlanner.planStoryboard(topic, script);
      state.storyboard = storyboard;

      // 4. GENERATING AUDIO
      await this.transition(state, "GENERATING_AUDIO", "Synthesizing voice & computing word timestamps");
      const voiceOutputDir = join(workDir, "voice-build");
      await mkdir(voiceOutputDir, { recursive: true });

      const voiceResult = await VoiceEngine.synthesizeNarration(
        script.fullNarration,
        voiceOutputDir,
        "am_michael",
        !options.dryRun
      );

      if (!voiceResult.ok || !voiceResult.value) {
        throw new Error(`Voice synthesis failed: ${voiceResult.error}`);
      }
      state.voiceResult = voiceResult.value;

      // Canonical retiming: narration timestamps drive scene cuts exactly
      const retimedStoryboard = TimelineRetimer.retimeStoryboard(storyboard, state.voiceResult, 1.0);
      state.storyboard = retimedStoryboard;

      // 5. ACQUIRING MEDIA
      await this.transition(state, "ACQUIRING_MEDIA", "Sourcing visual assets & motion plates");
      const assets = await this.assetManager.resolveAssetsForScenes(retimedStoryboard.scenes);
      state.assets = assets;

      // Build native Showtime project files
      const projectFiles = await ShowtimeProjectBuilder.buildProject(
        projectDir,
        state.storyboard,
        state.voiceResult,
        state.assets
      );

      // Provenance, Sync, Audio Audits
      const provenance = this.assetManager.getProvenance();
      await writeFile(join(reportsDir, "provenance-manifest.json"), JSON.stringify(provenance, null, 2), "utf-8");

      const syncReport = SyncAuditor.auditSynchronization(state.storyboard, state.voiceResult);
      await writeFile(join(reportsDir, "sync-report.json"), JSON.stringify(syncReport, null, 2), "utf-8");

      const audioReport = await AudioAuditor.auditAudio(state.voiceResult.audioPath, state.storyboard, state.voiceResult);
      await writeFile(join(reportsDir, "audio-quality.json"), JSON.stringify(audioReport, null, 2), "utf-8");

      // Pre-render QA checks
      const preRenderResults = QualityGateEngine.runAllGates(state.storyboard, state.voiceResult, projectFiles);
      state.qualityResults = preRenderResults;

      // 6. RENDERING (if requested and not dry run)
      if (options.renderVideo && !options.dryRun) {
        await this.transition(state, "RENDERING", "Rendering 1080x1920 MP4 via Showtime engine");
        const renderPath = join(workDir, "final.mp4");
        state.renderPath = renderPath;

        const renderRes = await this.showtimeRunner.render(projectDir, renderPath, { preview: false, workers: 1 });
        if (!renderRes.success) {
          throw new Error(`Showtime render failed: ${renderRes.stderr || renderRes.stdout}`);
        }
      }

      // 7. QA RUNNING
      await this.transition(state, "QA_RUNNING", "Executing independent post-render audits & metadata generation");
      let postRenderReport: import("../types.js").PostRenderReport | undefined;

      if (state.renderPath) {
        postRenderReport = await PostRenderQA.auditMp4(state.renderPath, state.storyboard.totalDurationSec, false);
        await writeFile(join(reportsDir, "post-render-report.json"), JSON.stringify(postRenderReport, null, 2), "utf-8");
      }

      // Generate Metadata & Thumbnail
      const metadata = MetadataGenerator.generateMetadata(topic, script, retimedStoryboard.scenes);
      state.metadata = metadata;
      await writeFile(join(reportsDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

      const thumbnail = await ThumbnailGenerator.generateThumbnail(workDir, topic, script, {
        videoPath: state.renderPath
      });
      state.thumbnail = thumbnail;
      await writeFile(join(reportsDir, "thumbnail-spec.json"), JSON.stringify(thumbnail, null, 2), "utf-8");

      // Audit all 20 Publishing Gates
      const duplicate = await this.youtubeClient.isDuplicateUpload(metadata.contentFingerprint);
      const gateAudit = await QualityGateEngine.audit20PublishingGates({
        storyboard: state.storyboard,
        voiceResult: state.voiceResult,
        renderPath: state.renderPath,
        postRenderReport,
        metadata: state.metadata,
        thumbnail: state.thumbnail,
        provenanceCount: provenance.length,
        syncReportPassed: syncReport.passed,
        audioReportPassed: audioReport.status === "PASS",
        isDuplicate: duplicate,
        approvedForPublishing: options.autoApprove ?? false,
        isDryRun: options.dryRun ?? false
      });

      await writeFile(join(reportsDir, "twenty-gates-audit.json"), JSON.stringify(gateAudit, null, 2), "utf-8");

      if (gateAudit.failedCount > 1 || (gateAudit.failedCount === 1 && gateAudit.gates.find(g => g.id === 20)?.passed)) {
        await this.transition(state, "QA_FAILED", `Failed quality gates: ${gateAudit.gates.filter(g => !g.passed).map(g => g.name).join(", ")}`);
        return state;
      }

      // 8. APPROVAL & PUBLISHING GATES
      if (options.autoApprove) {
        if (config.youtubePublishingEnabled) {
          throw new Error("autoApprove cannot bypass required human authorization when YouTube publishing is enabled.");
        }
        state.approvedForPublishing = true;
        state.approvedBy = "operator-auto-approved";
        state.approvalTimestamp = new Date().toISOString();
        if (state.renderPath && existsSync(state.renderPath)) {
          const buf = await readFile(state.renderPath);
          state.approvedVideoSha256 = createHash("sha256").update(buf).digest("hex");
        }
        if (state.metadata) {
          state.approvedMetadataFingerprint = state.metadata.contentFingerprint;
        }
        await this.transition(state, "AWAITING_APPROVAL", "Quality gates satisfied. Awaiting release approval.");
        await this.transition(state, "READY_TO_PUBLISH", "Editorial release approval granted (simulation mode).");
      } else {
        await this.transition(state, "AWAITING_APPROVAL", "Quality gates passed. Waiting for explicit human editorial approval.");
        return state;
      }

      // 9. SCHEDULING / UPLOAD GATES
      const integrity = await this.verifyApprovalIntegrity(state);
      if (!integrity.valid) {
        state.approvedForPublishing = false;
        state.approvedBy = undefined;
        await this.transition(state, "QA_FAILED", `Approval invalidated: ${integrity.reason}`);
        throw new Error(`Publication blocked: ${integrity.reason}`);
      }

      if (options.dryRun || !config.youtubePublishingEnabled) {
        await this.transition(state, "UPLOAD_PENDING", "Dry-run publishing initiated");
        const uploadResult = await this.youtubeClient.uploadVideo(
          {
            filePath: state.renderPath ?? join(workDir, "mock.mp4"),
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags,
            privacyStatus: config.defaultPrivacyStatus,
            publishAt: options.scheduleSlotIso
          },
          {
            contentFingerprint: metadata.contentFingerprint,
            jobId: state.id,
            dryRun: true
          }
        );

        state.remoteVideoId = uploadResult.videoId;
        state.remoteVideoUrl = uploadResult.url;

        // Schedule in durable publication queue
        const schedItem = await this.scheduler.scheduleJob(state.id, metadata.title, options.scheduleSlotIso);
        state.scheduledFor = schedItem.scheduledFor;

        await this.transition(state, "SCHEDULED", `Dry-run video successfully scheduled for ${state.scheduledFor}`);
        await this.transition(state, "COMPLETED", "Factory pipeline complete (dry-run).");
      }

      return state;
    } catch (err: any) {
      state.error = err.message;
      state.stage = "failed";
      await this.transition(state, "FAILED", `Execution error: ${err.message}`).catch(() => {});
      throw err;
    }
  }

  /**
   * Executes a bounded batch of jobs across the curated topic queue
   */
  async runBatch(batchSize = 3, options: Partial<FactoryRunOptions> = {}): Promise<FactoryJobState[]> {
    const topics = TopicEngine.rankTopics().slice(0, batchSize);
    const results: FactoryJobState[] = [];

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const jobId = `short-${topic.id}`;
      const jobState = await this.runJob({
        ...options,
        jobId,
        topicId: topic.id
      });
      results.push(jobState);
    }

    return results;
  }
}
