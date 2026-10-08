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
import { ShowtimeProjectBuilder } from "../showtime/project-builder.js";
import { ShowtimeRunner } from "../showtime/runner.js";
import { QualityGateEngine } from "../quality/quality-gates.js";

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
    await mkdir(workDir, { recursive: true });

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

      // 5. ASSET SOURCING & DEDUPLICATION
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

      // 7. PROJECT ASSEMBLY (NATIVE SHOWTIME PROJECT GENERATION)
      state.stage = "project_assembly";
      const projectFiles: ShowtimeProjectFiles = await ShowtimeProjectBuilder.buildProject(
        projectDir,
        storyboard,
        state.voiceResult
      );

      // 8. PRE-RENDER QUALITY GATES
      state.stage = "pre_render_qa";
      const qualityResults = QualityGateEngine.runAllGates(storyboard, state.voiceResult, projectFiles);
      state.qualityResults = qualityResults;
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

        // 10. POST-RENDER VIDEO QA
        state.stage = "post_render_qa";
        const qaResult = await this.showtimeRunner.qa(renderPath, "shorts");
        const postRenderQuality: QualityGateResult = {
          gate: "production",
          check: "post_render_video_qa",
          passed: qaResult.success,
          message: qaResult.success ? "Showtime post-render QA passed (-14 LUFS, valid frames, sync)" : qaResult.stderr || qaResult.stdout,
          severity: "error"
        };
        state.qualityResults.push(postRenderQuality);
        if (!qaResult.success) {
          throw new Error(`Post-render QA failed: ${postRenderQuality.message}`);
        }
      }

      state.stage = "approved";
      state.updatedAt = new Date().toISOString();

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
