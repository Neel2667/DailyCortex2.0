import { describe, it, expect } from "vitest";
import { FactEngine } from "../src/content/fact-engine.js";
import { TopicEngine } from "../src/content/topic-engine.js";
import { ScriptEngine } from "../src/content/script-engine.js";
import { VisualPlanner } from "../src/content/visual-planner.js";
import { MetadataGenerator } from "../src/publishing/metadata-generator.js";
import { ThumbnailGenerator } from "../src/publishing/thumbnail-generator.js";
import { QualityGateEngine } from "../src/quality/quality-gates.js";
import { FactoryEngine } from "../src/factory/factory-engine.js";
import type { FactualClaim, FactoryJobState } from "../src/types.js";

describe("Phase 4: Factory Specification & Quality Gates", () => {
  describe("Fact Engine & Evidence Integrity", () => {
    it("validates all 4 curated topics with rigorous claim integrity", () => {
      const topics = TopicEngine.getAllTopics();
      expect(topics.length).toBeGreaterThanOrEqual(4);

      for (const t of topics) {
        const check = FactEngine.validateClaims(t.claims);
        expect(check.valid).toBe(true);
        expect(check.issues.length).toBe(0);
        expect(check.verifiedFactCount).toBeGreaterThanOrEqual(2);
      }
    });

    it("detects and flags unsupported statistics in script", () => {
      const claims: FactualClaim[] = [
        {
          id: "test1",
          claim: "The amygdala activates under acute emotional distress.",
          category: "VERIFIED_FACT",
          sourceTitle: "Nature Neuroscience",
          confidence: 0.95
        }
      ];

      const scriptWithFakeStats = "Scientists found that 99% of people fail this test because of acute emotional distress.";
      const audit = FactEngine.auditScriptAgainstClaims(scriptWithFakeStats, claims);

      expect(audit.passed).toBe(false);
      expect(audit.unsupportedStatistics.length).toBeGreaterThan(0);
      expect(audit.unsupportedStatistics[0]).toContain("99%");
    });

    it("detects and flags fabricated citations not in claim registry", () => {
      const claims: FactualClaim[] = [
        {
          id: "test1",
          claim: "Working memory has a bounded channel capacity.",
          category: "VERIFIED_FACT",
          sourceTitle: "Cowan, 2001",
          confidence: 0.92
        }
      ];

      const scriptWithFakeUni = "A groundbreaking study at Harvard and Oxford proved this memory limit.";
      const audit = FactEngine.auditScriptAgainstClaims(scriptWithFakeUni, claims);

      expect(audit.passed).toBe(false);
      expect(audit.unverifiedCitations).toContain("harvard");
    });

    it("rejects overconfident clickbait wording", () => {
      const claims: FactualClaim[] = [
        {
          id: "test1",
          claim: "Doorways signal event segmentation boundaries.",
          category: "VERIFIED_FACT",
          sourceTitle: "Radvansky, 2011",
          confidence: 0.94
        }
      ];

      const clickbaitScript = "Scientists were shocked when this absolute undeniable proof was discovered.";
      const audit = FactEngine.auditScriptAgainstClaims(clickbaitScript, claims);

      expect(audit.passed).toBe(false);
      expect(audit.sensationalistPhrases.length + audit.overconfidentPhrases.length).toBeGreaterThan(0);
    });
  });

  describe("Metadata & Content Fingerprinting", () => {
    it("generates valid, compliant YouTube Shorts metadata with SHA-256 fingerprint", () => {
      const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
      const script = ScriptEngine.generateScript(topic);
      const metadata = MetadataGenerator.generateMetadata(topic, script);

      expect(metadata.title.length).toBeLessThanOrEqual(60);
      expect(metadata.description.length).toBeGreaterThanOrEqual(100);
      expect(metadata.hashtags).toContain("#Shorts");
      expect(metadata.contentFingerprint).toMatch(/^[a-f0-9]{64}$/);

      const validation = MetadataGenerator.validateMetadata(metadata);
      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it("produces deterministic fingerprints that differ across distinct topics", () => {
      const tA = TopicEngine.getTopicById("embarrassing-memories")!;
      const tB = TopicEngine.getTopicById("doorway-effect")!;

      const metaA = MetadataGenerator.generateMetadata(tA, ScriptEngine.generateScript(tA));
      const metaB = MetadataGenerator.generateMetadata(tB, ScriptEngine.generateScript(tB));

      expect(metaA.contentFingerprint).not.toBe(metaB.contentFingerprint);
    });
  });

  describe("Thumbnail Production & Safe Zones", () => {
    it("renders valid 1080x1920 standalone thumbnail with high contrast headline", async () => {
      const topic = TopicEngine.getTopicById("zeigarnik-effect")!;
      const script = ScriptEngine.generateScript(topic);
      const thumb = await ThumbnailGenerator.generateThumbnail("data/jobs/test-zeigarnik", topic, script);

      expect(thumb.width).toBe(1080);
      expect(thumb.height).toBe(1920);
      expect(thumb.format).toBe("jpg");
      expect(thumb.safeZonePass).toBe(true);
      expect(thumb.headline).toBe("UNFINISHED TASKS");
    }, 20000);
  });

  describe("20 Mandatory Quality & Safety Gates", () => {
    it("blocks publishing eligibility if human editorial release is not granted (Gate 20)", async () => {
      const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
      const script = ScriptEngine.generateScript(topic);
      const storyboard = VisualPlanner.planStoryboard(topic, script);

      const audit = await QualityGateEngine.audit20PublishingGates({
        storyboard,
        approvedForPublishing: false // not approved yet
      });

      expect(audit.canPublish).toBe(false);
      const gate20 = audit.gates.find(g => g.id === 20);
      expect(gate20).toBeDefined();
      expect(gate20!.passed).toBe(false);
      expect(gate20!.message).toContain("AWAITING_APPROVAL");
    });

    it("approves publishing eligibility when all technical gates pass and release is authorized", async () => {
      const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
      const script = ScriptEngine.generateScript(topic);
      const storyboard = VisualPlanner.planStoryboard(topic, script);
      const metadata = MetadataGenerator.generateMetadata(topic, script);

      const audit = await QualityGateEngine.audit20PublishingGates({
        storyboard,
        voiceResult: {
          audioPath: "data/mock.wav",
          durationSec: 36.5,
          words: Array(50).fill({ word: "test", start: 0, end: 1 }),
          voiceId: "am_michael",
          provider: "mock"
        },
        renderPath: "data/mock.mp4",
        postRenderReport: {
          videoPath: "data/mock.mp4",
          fileSizeBytes: 40000000,
          duration: 38.0,
          dimensions: { width: 1080, height: 1920 },
          aspectRatio: 9 / 16,
          aspectRatioStr: "1080:1920",
          fps: 30.0,
          videoCodec: "h264",
          pixelFormat: "yuv420p",
          audioCodec: "aac",
          audioSampleRate: 48000,
          audioChannels: 2,
          audioDuration: 38.0,
          faststart: true,
          blackFramesCount: 0,
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
          passed: true,
          violations: [],
          status: "PASS"
        },
        metadata,
        thumbnail: {
          path: "data/thumb.jpg",
          width: 1080,
          height: 1920,
          format: "jpg",
          headline: "3 A.M. REPLAY",
          safeZonePass: true
        },
        isDuplicate: false,
        audioReportPassed: true,
        syncReportPassed: true,
        provenanceCount: storyboard.scenes.length,
        approvedForPublishing: true // Explicitly approved
      });

      expect(audit.canPublish).toBe(true);
      expect(audit.failedCount).toBe(0);
      expect(audit.passedCount).toBe(20);
    });
  });

  describe("Factory Durable State Machine", () => {
    it("validates legal state transitions and rejects illegal transitions", async () => {
      const factory = new FactoryEngine();
      const mockState: FactoryJobState = {
        id: "test-state-job",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: "queued",
        factoryStage: "QUEUED",
        workDir: "data/jobs/test-state-job",
        qualityResults: [],
        retryCount: 0,
        history: [{ stage: "QUEUED", timestamp: new Date().toISOString() }]
      };

      // QUEUED -> RESEARCHING is legal
      await expect(factory.transition(mockState, "RESEARCHING")).resolves.not.toThrow();
      expect(mockState.factoryStage).toBe("RESEARCHING");

      // RESEARCHING -> PUBLISHED is strictly illegal
      await expect(factory.transition(mockState, "PUBLISHED")).rejects.toThrow(/Invalid state transition/);
    });

    it("runs an end-to-end dry-run factory execution cleanly", async () => {
      const factory = new FactoryEngine();
      const state = await factory.runJob({
        jobId: "test-factory-run",
        topicId: "zeigarnik-effect",
        dryRun: true,
        autoApprove: true,
        forceRerun: true
      });

      expect(state.factoryStage).toBe("COMPLETED");
      expect(state.topic?.id).toBe("zeigarnik-effect");
      expect(state.metadata).toBeDefined();
      expect(state.thumbnail).toBeDefined();
      expect(state.remoteVideoId).toContain("DRY_RUN_");
      expect(state.scheduledFor).toBeDefined();
    }, 20000);
  });
});
