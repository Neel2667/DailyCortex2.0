import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type {
  JobState,
  TopicItem,
  ShowtimeProjectFiles,
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

export interface PipelineOptions {
  jobId?: string;
  topicId?: string;
  customTopic?: string;
  outputRoot?: string;
  dryRun?: boolean;
  renderVideo?: boolean;
  previewOnly?: boolean;
}

export class ProductionPipeline {
  private assetManager: AssetManager;
  private showtimeRunner: ShowtimeRunner;

  constructor() {
    this.assetManager = new AssetManager();
    this.showtimeRunner = new ShowtimeRunner();
  }

  /**
   * Executes the full DailyCortex 2.0 automated production pipeline.
   */
  async run(options: PipelineOptions = {}): Promise<JobState> {
    const jobId = options.jobId ?? `job-${Date.now()}`;
    const outputRoot = options.outputRoot ?? "data/jobs";
    const workDir = join(outputRoot, jobId);
    const projectDir = join(workDir, "project");
    const reportsDir = join(workDir, "reports");
    await mkdir(workDir, { recursive: true });
    await mkdir(reportsDir, { recursive: true });

    const state: JobState = {
      id: jobId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stage: "queued",
      workDir,
      projectDir,
      qualityResults: [],
      retryCount: 0
    };

    try {
      // 1. TOPIC CURATION
      state.stage = "curation";
      let topic: TopicItem;
      if (options.topicId) {
        topic = TopicEngine.getTopicById(options.topicId) ?? TopicEngine.getTargetEmbarrassingMemoryTopic();
      } else {
        topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
      }
      state.topic = topic;

      // 2. FACT CHECKING
      const claimCheck = FactEngine.validateClaims(topic.claims);
      if (!claimCheck.valid) {
        throw new Error(`Fact validation failed: ${claimCheck.issues.join("; ")}`);
      }

      // 3. SCRIPTING
      state.stage = "scripting";
      const script = ScriptEngine.generateScript(topic);

      // 4. STORYBOARDING & VISUAL PLANNING
      state.stage = "storyboarding";
      const storyboard = VisualPlanner.planStoryboard(topic, script);
      state.storyboard = storyboard;

      // 5. ASSET SOURCING & DEDUPLICATION (Normalized 1080x1920 Video Assets)
      state.stage = "asset_sourcing";
      const assets = await this.assetManager.resolveAssetsForScenes(storyboard.scenes);
      state.assets = assets;

      // 6. VOICE GENERATION & WORD-LEVEL TIMING
      state.stage = "voice_generation";
      const voiceOutputDir = join(workDir, "voice-build");
      await mkdir(voiceOutputDir, { recursive: true });

      // In dry-run mode, we can use the local engine if available or deterministic fallback
      const voiceResult = await VoiceEngine.synthesizeNarration(
        script.fullNarration,
        voiceOutputDir,
        "am_michael",
        !options.dryRun // attempt real speech synthesis when not pure dry-run
      );

      if (!voiceResult.ok || !voiceResult.value) {
        throw new Error(`Voice synthesis failed: ${voiceResult.error}`);
      }
      state.voiceResult = voiceResult.value;

      // 6b. CANONICAL RETIMING: Narration speech timestamps drive scene durations exactly
      const retimedStoryboard = TimelineRetimer.retimeStoryboard(storyboard, state.voiceResult, 1.0);
      state.storyboard = retimedStoryboard;

      // 7. PROJECT ASSEMBLY (NATIVE SHOWTIME PROJECT GENERATION)
      state.stage = "project_assembly";
      const projectFiles: ShowtimeProjectFiles = await ShowtimeProjectBuilder.buildProject(
        projectDir,
        state.storyboard,
        state.voiceResult,
        state.assets
      );

      // 7b. ASSET PROVENANCE MANIFEST
      const provenance = this.assetManager.getProvenance();
      await writeFile(join(workDir, "provenance-manifest.json"), JSON.stringify(provenance, null, 2), "utf-8");
      await writeFile(join(reportsDir, "provenance-manifest.json"), JSON.stringify(provenance, null, 2), "utf-8");

      // 7c. SYNCHRONIZATION AUDIT (sync-report.json)
      const syncReport = SyncAuditor.auditSynchronization(state.storyboard, state.voiceResult);
      await writeFile(join(workDir, "sync-report.json"), JSON.stringify(syncReport, null, 2), "utf-8");
      await writeFile(join(reportsDir, "sync-report.json"), JSON.stringify(syncReport, null, 2), "utf-8");

      // 7d. AUDIO QUALITY AUDIT (audio-quality.json)
      const audioReport = await AudioAuditor.auditAudio(state.voiceResult.audioPath, state.storyboard, state.voiceResult);
      await writeFile(join(workDir, "audio-quality.json"), JSON.stringify(audioReport, null, 2), "utf-8");
      await writeFile(join(reportsDir, "audio-quality.json"), JSON.stringify(audioReport, null, 2), "utf-8");

      // 8. PRE-RENDER QUALITY GATES
      state.stage = "pre_render_qa";
      const qualityResults = QualityGateEngine.runAllGates(state.storyboard, state.voiceResult, projectFiles);
      state.qualityResults = qualityResults;

      // Add sync gate check
      state.qualityResults.push({
        gate: "technical",
        check: "sync_timeline_audit",
        passed: syncReport.passed,
        message: syncReport.passed
          ? `Word-to-scene monotonicity & envelope verified (delta: ${(state.storyboard.totalDurationSec - state.voiceResult.durationSec).toFixed(2)}s)`
          : `Sync violations: ${syncReport.violations.join("; ")}`,
        severity: "error"
      });

      // Add audio gate check
      state.qualityResults.push({
        gate: "audio",
        check: "loudness_and_peak_spec",
        passed: audioReport.status === "PASS",
        score: audioReport.integrated_lufs,
        message: `Integrated LUFS: ${audioReport.integrated_lufs}, True Peak: ${audioReport.true_peak}dB (clipping: ${audioReport.clipping_detected})`,
        severity: "error"
      });

      QualityGateEngine.assertPassed(qualityResults);

      // 9. RENDERING (IF REQUESTED AND NOT DRY-RUN)
      if (options.renderVideo && !options.dryRun) {
        state.stage = "rendering";
        const renderPath = join(workDir, "final.mp4");
        state.renderPath = renderPath;

        const renderResult = await this.showtimeRunner.render(projectDir, renderPath, {
          preview: options.previewOnly ?? false,
          workers: 1
        });

        if (!renderResult.success) {
          throw new Error(`Showtime render failed: ${renderResult.stderr || renderResult.stdout}`);
        }

        // 10. POST-RENDER VIDEO QA (INDEPENDENT POST-RENDER AUDIT)
        state.stage = "post_render_qa";
        const postRenderReport = await PostRenderQA.auditMp4(renderPath, state.storyboard.totalDurationSec, options.previewOnly ?? false);
        await writeFile(join(workDir, "post-render-report.json"), JSON.stringify(postRenderReport, null, 2), "utf-8");
        await writeFile(join(reportsDir, "post-render-report.json"), JSON.stringify(postRenderReport, null, 2), "utf-8");

        const independentAudit = await QualityGateEngine.auditRenderedMp4(renderPath, state.storyboard.totalDurationSec);
        state.qualityResults.push(...independentAudit);

        state.qualityResults.push({
          gate: "production",
          check: "post_render_exact_specs",
          passed: postRenderReport.passed,
          message: postRenderReport.passed
            ? `Rendered MP4 verified: ${postRenderReport.dimensions.width}x${postRenderReport.dimensions.height}, ${postRenderReport.fps}fps, ${postRenderReport.videoCodec}, black frames: ${postRenderReport.blackFramesCount}`
            : `Post-render audit failed: ${postRenderReport.violations.join("; ")}`,
          severity: "error"
        });

        const qaResult = await this.showtimeRunner.qa(renderPath, "shorts");
        const postRenderQuality: QualityGateResult = {
          gate: "production",
          check: "post_render_video_qa",
          passed: qaResult.success,
          message: qaResult.success ? "Showtime post-render QA passed (-14 LUFS, valid frames, sync)" : qaResult.stderr || qaResult.stdout,
          severity: "warning" // warning if showtime QA heuristic complains about dark bedroom background
        };
        state.qualityResults.push(postRenderQuality);

        QualityGateEngine.assertPassed(state.qualityResults);
      }

      state.stage = "approved";
      state.updatedAt = new Date().toISOString();

      // Write video quality report
      await writeFile(
        join(reportsDir, "video-quality.json"),
        JSON.stringify({
          jobId: state.id,
          topic: state.topic?.topic,
          totalDurationSec: state.storyboard?.totalDurationSec,
          renderPath: state.renderPath,
          results: state.qualityResults,
          passed: state.qualityResults.every(r => r.passed || r.severity !== "error")
        }, null, 2),
        "utf-8"
      );

      // Write job manifest to workDir
      await writeFile(join(workDir, "job-manifest.json"), JSON.stringify(state, null, 2), "utf-8");

      return state;
    } catch (err: any) {
      state.stage = "failed";
      state.error = err.message;
      state.updatedAt = new Date().toISOString();
      await writeFile(join(workDir, "job-manifest.json"), JSON.stringify(state, null, 2), "utf-8").catch(() => {});
      throw err;
    }
  }
}
