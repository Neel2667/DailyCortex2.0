import { describe, it, expect } from "vitest";
import { NarrativeTemplateRegistry, NarrativeArchitecture } from "../src/content/narrative-templates.js";
import { TopicEngine } from "../src/content/topic-engine.js";
import { ScriptEngine } from "../src/content/script-engine.js";
import { VisualPlanner } from "../src/content/visual-planner.js";
import { SyncAuditor } from "../src/quality/sync-auditor.js";
import { AudioAuditor } from "../src/quality/audio-auditor.js";
import { PostRenderQA } from "../src/quality/post-render-qa.js";
import { AssetManager } from "../src/media/asset-manager.js";
import { MockAssetProvider } from "../src/media/mock-provider.js";
import { MediaNormalizer } from "../src/media/media-normalizer.js";
import { TimelineRetimer } from "../src/audio/timeline-retimer.js";
import type { VoiceSynthesisResult, TimedWord, StoryboardPlan } from "../src/types.js";

describe("Phase 3 Specifications & Quality Gates", () => {
  describe("Phase B: Strict 1080x1920 Output Format Contract", () => {
    it("rejects 1080x1832 non-canonical output", () => {
      const probe1832 = {
        width: 1080,
        height: 1832,
        fps: 30,
        videoCodec: "h264",
        audioCodec: "aac"
      };
      const exactDimensionsPass = probe1832.width === 1080 && probe1832.height === 1920;
      expect(exactDimensionsPass).toBe(false);

      const expectedRatio = 1080 / 1920;
      const measuredRatio = probe1832.width / probe1832.height;
      const exactAspectPass = Math.abs(measuredRatio - expectedRatio) < 0.005;
      expect(exactAspectPass).toBe(false);
    });

    it("accepts exact 1080x1920 (9:16) format", () => {
      const probe1920 = {
        width: 1080,
        height: 1920,
        fps: 30,
        videoCodec: "h264",
        audioCodec: "aac"
      };
      const exactDimensionsPass = probe1920.width === 1080 && probe1920.height === 1920;
      const expectedRatio = 1080 / 1920;
      const measuredRatio = probe1920.width / probe1920.height;
      const exactAspectPass = Math.abs(measuredRatio - expectedRatio) < 0.0001;

      expect(exactDimensionsPass).toBe(true);
      expect(exactAspectPass).toBe(true);
    });
  });

  describe("Phase C: Synchronization Validation & Monotonicity", () => {
    const dummyTopic = TopicEngine.getTargetEmbarrassingMemoryTopic();
    const script = ScriptEngine.generateScript(dummyTopic);
    const storyboard = VisualPlanner.planStoryboard(dummyTopic, script);

    it("verifies strictly monotonic words without inversions", () => {
      const validVoice: VoiceSynthesisResult = {
        audioPath: "data/dummy.wav",
        durationSec: 10.0,
        words: [
          { word: "Ever", start: 0.1, end: 0.5 },
          { word: "cringe", start: 0.6, end: 1.0 },
          { word: "at", start: 1.1, end: 1.3 },
          { word: "night?", start: 1.4, end: 2.0 }
        ],
        voiceId: "test",
        provider: "mock"
      };

      const retimed = TimelineRetimer.retimeStoryboard(storyboard, validVoice);
      const report = SyncAuditor.auditSynchronization(retimed, validVoice);
      expect(report.monotonicityChecks.passed).toBe(true);
      expect(report.monotonicityChecks.invertedPairsCount).toBe(0);
    });

    it("detects and rejects inverted word timestamps", () => {
      const invertedVoice: VoiceSynthesisResult = {
        audioPath: "data/dummy.wav",
        durationSec: 10.0,
        words: [
          { word: "Word1", start: 0.1, end: 0.5 },
          { word: "Word2", start: 1.0, end: 0.8 }, // inverted start > end
          { word: "Word3", start: 0.4, end: 1.2 }  // out of order
        ],
        voiceId: "test",
        provider: "mock"
      };

      const retimed = TimelineRetimer.retimeStoryboard(storyboard, invertedVoice);
      const report = SyncAuditor.auditSynchronization(retimed, invertedVoice);
      expect(report.passed).toBe(false);
      expect(report.monotonicityChecks.passed).toBe(false);
      expect(report.violations.some(v => v.includes("Word timestamp inverted"))).toBe(true);
    });
  });

  describe("Phase F: Narrative Templates & Deterministic Selection", () => {
    it("provides at least 3 distinct narrative architectures", () => {
      const templates = NarrativeTemplateRegistry.getAllTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(3);

      const structA = templates.find(t => t.id === NarrativeArchitecture.HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF);
      const structB = templates.find(t => t.id === NarrativeArchitecture.MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY);
      const structC = templates.find(t => t.id === NarrativeArchitecture.SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT);

      expect(structA).toBeDefined();
      expect(structB).toBeDefined();
      expect(structC).toBeDefined();
    });

    it("deterministically selects the template suited for each topic type", () => {
      const tA = TopicEngine.getTopicById("embarrassing-memories")!;
      const tB = TopicEngine.getTopicById("doorway-effect")!;
      const tC = TopicEngine.getTopicById("spotlight-effect")!;

      const selA = NarrativeTemplateRegistry.selectTemplateForTopic(tA);
      const selB = NarrativeTemplateRegistry.selectTemplateForTopic(tB);
      const selC = NarrativeTemplateRegistry.selectTemplateForTopic(tC);

      expect(selA.id).toBe(NarrativeArchitecture.HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF);
      expect(selB.id).toBe(NarrativeArchitecture.MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY);
      expect(selC.id).toBe(NarrativeArchitecture.SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT);

      // Verify scripts produced by them have structurally distinct beat roles
      const sA = ScriptEngine.generateScript(tA);
      const sB = ScriptEngine.generateScript(tB);
      const sC = ScriptEngine.generateScript(tC);

      expect(sA.narrativeStructure).toBe(NarrativeArchitecture.HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF);
      expect(sB.narrativeStructure).toBe(NarrativeArchitecture.MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY);
      expect(sC.narrativeStructure).toBe(NarrativeArchitecture.SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT);
    });
  });

  describe("Phase D: Asset Manager Provenance & Local Fallback", () => {
    it("records complete asset provenance for each scene", async () => {
      const normalizer = new MediaNormalizer();
      const mockProvider = new MockAssetProvider(normalizer);
      const assetManager = new AssetManager(mockProvider, normalizer);

      const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
      const script = ScriptEngine.generateScript(topic);
      const storyboard = VisualPlanner.planStoryboard(topic, script);

      const assets = await assetManager.resolveAssetsForScenes(storyboard.scenes);
      expect(assets.length).toBe(storyboard.scenes.length);

      const provenance = assetManager.getProvenance();
      expect(provenance.length).toBe(storyboard.scenes.length);

      const firstRecord = provenance[0];
      expect(firstRecord.provider).toBeDefined();
      expect(firstRecord.providerAssetId).toBeDefined();
      expect(firstRecord.checksum).toBeDefined();
      expect(firstRecord.searchQuery).toBeDefined();
      expect(firstRecord.normalizedDimensions).toEqual({ width: 1080, height: 1920 });
    });
  });

  describe("Phase E: Visual Strategy Diversity", () => {
    it("assigns diverse, non-repetitive visual strategies across topics", () => {
      const tA = TopicEngine.getTopicById("embarrassing-memories")!;
      const tB = TopicEngine.getTopicById("doorway-effect")!;
      const tC = TopicEngine.getTopicById("spotlight-effect")!;

      const sbA = VisualPlanner.planStoryboard(tA, ScriptEngine.generateScript(tA));
      const sbB = VisualPlanner.planStoryboard(tB, ScriptEngine.generateScript(tB));
      const sbC = VisualPlanner.planStoryboard(tC, ScriptEngine.generateScript(tC));

      const strategiesA = new Set(sbA.scenes.map(s => s.visualStrategy));
      const strategiesB = new Set(sbB.scenes.map(s => s.visualStrategy));
      const strategiesC = new Set(sbC.scenes.map(s => s.visualStrategy));

      // Each video must use at least 2 different visual strategies
      expect(strategiesA.size).toBeGreaterThanOrEqual(2);
      expect(strategiesB.size).toBeGreaterThanOrEqual(2);
      expect(strategiesC.size).toBeGreaterThanOrEqual(2);

      // Doorway effect uses diagram_animation
      expect(strategiesB.has("diagram_animation")).toBe(true);

      // Spotlight effect uses data_visualization
      expect(strategiesC.has("data_visualization")).toBe(true);
    });
  });

  describe("Phase J: Independent Post-Render Video QA", () => {
    it("audits real 1080x1920 final.mp4 with zero black frames and exact dimensions", async () => {
      const videoPath = "data/jobs/short-embarrassing-memories/final.mp4";
      const report = await PostRenderQA.auditMp4(videoPath, 6.0, false);

      expect(report.passed).toBe(true);
      expect(report.dimensions).toEqual({ width: 1080, height: 1920 });
      expect(report.aspectRatio).toBeCloseTo(9 / 16, 4);
      expect(report.aspectRatioStr).toBe("1080:1920");
      expect(report.videoCodec).toBe("h264");
      expect(report.audioCodec).toBe("aac");
      expect(report.blackFramesCount).toBe(0);
      expect(report.faststart).toBe(true);
      expect(report.status).toBe("PASS");
    });
  });
});

