import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { QualityGateEngine } from "../src/quality/quality-gates.js";
import { FactoryEngine } from "../src/factory/factory-engine.js";
import { YouTubeClient } from "../src/publishing/youtube-client.js";
import { FactEngine } from "../src/content/fact-engine.js";
import { TopicEngine } from "../src/content/topic-engine.js";
import { ScriptEngine } from "../src/content/script-engine.js";
import { VisualPlanner } from "../src/content/visual-planner.js";
import { config } from "../src/config.js";
import type { FactoryJobState, StoryboardPlan } from "../src/types.js";

describe("Phase 4.1: Adversarial & Quality Gate Hardening Tests", () => {
  const testRoot = "data/jobs-test-adversarial";

  beforeEach(async () => {
    await mkdir(testRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true }).catch(() => {});
  });

  describe("Quality Gates Fail-Closed Semantics", () => {
    const mockStoryboard: StoryboardPlan = {
      topic: TopicEngine.getTargetEmbarrassingMemoryTopic(),
      script: ScriptEngine.generateScript(TopicEngine.getTargetEmbarrassingMemoryTopic()),
      scenes: [
        {
          id: "s1",
          sceneNumber: 1,
          type: "hook",
          narrationText: "Why does your brain replay embarrassing moments at 2 AM?",
          durationSec: 5.0,
          visualPrompt: "Close-up cinematic insomnia shot",
          assetQuery: "night insomnia bedroom dark blue",
          motion: "focus-zoom",
          transition: "fade"
        },
        {
          id: "s2",
          sceneNumber: 2,
          type: "diagram",
          narrationText: "Because your amygdala flagged social threat as life-or-death.",
          durationSec: 8.0,
          visualPrompt: "3D neural schematic of amygdala",
          assetQuery: "brain amygdala neural network glow",
          motion: "kinetic-pop",
          transition: "fade"
        },
        {
          id: "s3",
          sceneNumber: 3,
          type: "reaction",
          narrationText: "In our evolutionary past, social exile meant literal physical danger.",
          durationSec: 10.0,
          visualPrompt: "Paleolithic campfire darkness perimeter",
          assetQuery: "ancient campfire shadows cold night",
          motion: "glide",
          transition: "fade"
        },
        {
          id: "s4",
          sceneNumber: 4,
          type: "payoff",
          narrationText: "Your brain is not punishing you. It is running an aggressive survival backup.",
          durationSec: 9.5,
          visualPrompt: "Modern bedroom ceiling looking up relieved",
          assetQuery: "peaceful bedroom night dawn window light",
          motion: "rise",
          transition: "fade"
        }
      ],
      totalDurationSec: 32.5,
      soundtrack: {
        style: "lofi-chill",
        bpm: 78,
        duckingDb: -18
      }
    };

    it("fails closed when post-render reports and audio metrics are missing in non-dry-run mode", async () => {
      const audit = await QualityGateEngine.audit20PublishingGates({
        storyboard: mockStoryboard,
        isDryRun: false,
        // All reports omitted
      });

      expect(audit.canPublish).toBe(false);
      expect(audit.allPassed).toBe(false);

      const audioGate = audit.gates.find(g => g.name === "audio_quality_loudness");
      const renderGate = audit.gates.find(g => g.name === "full_render_completion");
      const blackFramesGate = audit.gates.find(g => g.name === "black_frozen_frames_check");
      const postQaGate = audit.gates.find(g => g.name === "independent_post_render_qa");
      const releaseGate = audit.gates.find(g => g.name === "release_authorization");

      expect(audioGate?.passed).toBe(false);
      expect(renderGate?.passed).toBe(false);
      expect(blackFramesGate?.passed).toBe(false);
      expect(postQaGate?.passed).toBe(false);
      expect(releaseGate?.passed).toBe(false);
      expect(releaseGate?.severity).toBe("error");
    });

    it("strictly blocks publication if human editorial approval (Gate 20) is absent", async () => {
      const audit = await QualityGateEngine.audit20PublishingGates({
        storyboard: mockStoryboard,
        isDryRun: true,
        approvedForPublishing: false // Human approval not granted
      });

      expect(audit.canPublish).toBe(false);
      const gate20 = audit.gates.find(g => g.id === 20);
      expect(gate20?.passed).toBe(false);
      expect(gate20?.severity).toBe("error");
    });

    it("strictly blocks publication if duplicate content is detected even when approved", async () => {
      const audit = await QualityGateEngine.audit20PublishingGates({
        storyboard: mockStoryboard,
        isDryRun: true,
        approvedForPublishing: true,
        isDuplicate: true // Duplicate detected!
      });

      expect(audit.canPublish).toBe(false);
      const dupGate = audit.gates.find(g => g.name === "duplicate_content_detection");
      expect(dupGate?.passed).toBe(false);
    });

    it("strictly blocks publication if black frames are detected", async () => {
      const audit = await QualityGateEngine.audit20PublishingGates({
        storyboard: mockStoryboard,
        isDryRun: false,
        approvedForPublishing: true,
        audioReportPassed: true,
        syncReportPassed: true,
        provenanceCount: 4,
        renderPath: "dummy.mp4",
        postRenderReport: {
          videoPath: "dummy.mp4",
          fileSizeBytes: 10000000,
          duration: 32.5,
          dimensions: { width: 1080, height: 1920 },
          aspectRatio: 9 / 16,
          aspectRatioStr: "9:16",
          fps: 30,
          videoCodec: "h264",
          pixelFormat: "yuv420p",
          audioCodec: "aac",
          audioSampleRate: 48000,
          audioChannels: 2,
          audioDuration: 32.5,
          faststart: true,
          blackFramesCount: 4, // CORRUPTED: 4 black frames
          frozenSectionsCount: 0,
          checks: {
            exactDimensionsPass: true,
            exactAspectPass: true,
            fpsPass: true,
            videoCodecPass: true,
            audioCodecPass: true,
            audioDurationSyncPass: true,
            fileIntegrityPass: true
          },
          passed: false,
          violations: ["Black frames detected"],
          status: "FAIL"
        }
      });

      expect(audit.canPublish).toBe(false);
      const blackFramesGate = audit.gates.find(g => g.name === "black_frozen_frames_check");
      expect(blackFramesGate?.passed).toBe(false);
    });
  });

  describe("State Machine & Approval Integrity", () => {
    it("rejects illegal state transitions attempting to bypass pipeline stages", async () => {
      const factory = new FactoryEngine();
      const state: FactoryJobState = {
        id: "test-illegal-transition",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: "queued",
        factoryStage: "QUEUED",
        workDir: join(testRoot, "test-illegal-transition"),
        projectDir: join(testRoot, "test-illegal-transition", "project"),
        qualityResults: [],
        retryCount: 0,
        history: []
      };

      // Illegal: QUEUED -> READY_TO_PUBLISH
      await expect(factory.transition(state, "READY_TO_PUBLISH")).rejects.toThrow(/Invalid state transition/);

      // Illegal: QUEUED -> PUBLISHED
      await expect(factory.transition(state, "PUBLISHED")).rejects.toThrow(/Invalid state transition/);

      // Illegal: RESEARCHING -> COMPLETED
      state.factoryStage = "RESEARCHING";
      await expect(factory.transition(state, "COMPLETED")).rejects.toThrow(/Invalid state transition/);
    });

    it("rejects approval if job is not in AWAITING_APPROVAL stage", async () => {
      const factory = new FactoryEngine();
      const jobId = "test-not-awaiting";
      const workDir = join(testRoot, jobId);
      await mkdir(workDir, { recursive: true });

      const state: FactoryJobState = {
        id: jobId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: "queued",
        factoryStage: "PLANNING", // Not AWAITING_APPROVAL
        workDir,
        projectDir: join(workDir, "project"),
        qualityResults: [],
        retryCount: 0,
        history: []
      };
      await factory.persistState(state);

      await expect(factory.approveJob(jobId, "editor-alice", testRoot)).rejects.toThrow(/must be in AWAITING_APPROVAL/);
    });

    it("invalidates approval if the rendered video artifact is modified post-approval", async () => {
      const factory = new FactoryEngine();
      const jobId = "test-tampered-video";
      const workDir = join(testRoot, jobId);
      await mkdir(workDir, { recursive: true });

      const videoPath = join(workDir, "final.mp4");
      await writeFile(videoPath, "ORIGINAL_VIDEO_CONTENT_AAA");

      const state: FactoryJobState = {
        id: jobId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: "approved",
        factoryStage: "READY_TO_PUBLISH",
        workDir,
        projectDir: join(workDir, "project"),
        renderPath: videoPath,
        approvedForPublishing: true,
        approvedBy: "editor-bob",
        approvedVideoSha256: "0000000000000000000000000000000000000000000000000000000000000000", // Mismatched sha
        qualityResults: [],
        retryCount: 0,
        history: []
      };
      await factory.persistState(state);

      const integrity = await factory.verifyApprovalIntegrity(state);
      expect(integrity.valid).toBe(false);
      expect(integrity.reason).toContain("video artifact altered after approval");
    });
  });

  describe("Publishing & Network Boundary Freeze", () => {
    it("guarantees getAccessToken throws without network calls when YOUTUBE_PUBLISHING_ENABLED=false", async () => {
      const client = new YouTubeClient(join(testRoot, "publishing"));
      expect(config.youtubePublishingEnabled).toBe(false);

      await expect(client.getAccessToken()).rejects.toThrow(/YouTube publishing is disabled by configuration/);
    });

    it("rejects 1080x1920 portrait asset for YouTube Data API thumbnails.set operation", async () => {
      const client = new YouTubeClient(join(testRoot, "publishing"));
      const thumbPath = join(testRoot, "vertical-thumb.jpg");

      // Generate actual 1080x1920 test image via ffmpeg
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      await execAsync(`ffmpeg -y -f lavfi -i "color=c=black:s=1080x1920:d=0.1" -vframes 1 "${thumbPath}"`);

      // Preflight should catch this
      const preflight = await client.preflightCheck({
        filePath: "mock.mp4",
        title: "Test Short",
        description: "Test Description",
        tags: ["shorts"],
        privacyStatus: "private",
        thumbnailPath: thumbPath
      }, "test-fingerprint", true);

      expect(preflight.ok).toBe(false);
      expect(preflight.issues.some(i => i.includes("9:16 vertical Shorts cover"))).toBe(true);

      // uploadCustomThumbnail should throw
      await expect(client.uploadCustomThumbnail("test-video-id", thumbPath, { dryRun: false }))
        .rejects.toThrow(/9:16 vertical Shorts cover asset.*strictly requires a 16:9 image/);
    });
  });

  describe("Fact Integrity & Scientific Claim Verification", () => {
    it("detects and flags unsupported numerical percentages in script", () => {
      const claims = [
        {
          id: "claim-1",
          claim: "Unfinished tasks create intrusive cognitive activation until closed.",
          category: "VERIFIED_FACT" as const,
          sourceTitle: "Psychologische Forschung",
          confidence: 0.95
        }
      ];

      const scriptWithBogusStats = "Research reveals 89% of employees suffer chronic cognitive exhaustion from open tabs.";
      const audit = FactEngine.auditScriptAgainstClaims(scriptWithBogusStats, claims);

      expect(audit.passed).toBe(false);
      expect(audit.unsupportedStatistics).toContain("89%");
    });

    it("detects and flags sensationalist clickbait tropes", () => {
      const claims = [
        {
          id: "claim-1",
          claim: "Unfinished tasks create intrusive cognitive activation.",
          category: "VERIFIED_FACT" as const,
          sourceTitle: "Psychologische Forschung",
          confidence: 0.95
        }
      ];

      const clickbaitScript = "Scientists were shocked when they learned everything you know is a lie about open tabs.";
      const audit = FactEngine.auditScriptAgainstClaims(clickbaitScript, claims);

      expect(audit.passed).toBe(false);
      expect(audit.sensationalistPhrases).toContain("scientists were shocked");
      expect(audit.sensationalistPhrases).toContain("everything you know is a lie");
    });

    it("detects domain contradictions against established cognitive psychology", () => {
      const contradictionAudit = FactEngine.auditContradictions(
        "Don't worry about cringe, memories easily fade without any brain trace.",
        "embarrassing-memories"
      );

      expect(contradictionAudit.contradicted).toBe(true);
      expect(contradictionAudit.reasons[0]).toContain("amygdala tag");
    });
  });
});
