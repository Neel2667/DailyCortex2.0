import { describe, it, expect } from "vitest";
import { QualityGateEngine } from "../src/quality/quality-gates.js";
import { TopicEngine } from "../src/content/topic-engine.js";
import { ScriptEngine } from "../src/content/script-engine.js";
import { VisualPlanner } from "../src/content/visual-planner.js";
import { VoiceEngine } from "../src/audio/voice-engine.js";
import { TimelineRetimer } from "../src/audio/timeline-retimer.js";

describe("Quality Gate Engine", () => {
  const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
  const script = ScriptEngine.generateScript(topic);
  const storyboard = VisualPlanner.planStoryboard(topic, script);

  it("passes all quality gates on canonically retimed production storyboard and voice", async () => {
    const voice = (await VoiceEngine.synthesizeNarration(script.fullNarration, "/tmp", "am_michael", false)).value!;
    const retimedStoryboard = TimelineRetimer.retimeStoryboard(storyboard, voice, 1.0);
    const results = QualityGateEngine.runAllGates(retimedStoryboard, voice);

    const failures = results.filter(r => !r.passed && r.severity === "error");
    expect(failures.length).toBe(0);
    expect(results.some(r => r.check === "hook_strength")).toBe(true);
    expect(results.some(r => r.check === "visual_diversity")).toBe(true);
    expect(results.some(r => r.check === "canonical_timing_synchronization")).toBe(true);
    expect(results.some(r => r.check === "caption_timing_integrity")).toBe(true);
  });

  it("fails quality gate on timing mismatch when storyboard is not canonically retimed", async () => {
    const voice = (await VoiceEngine.synthesizeNarration(script.fullNarration, "/tmp", "am_michael", false)).value!;
    // Un-retimed storyboard has duration delta > 0.25s
    const results = QualityGateEngine.runAllGates(storyboard, voice);
    const timingGate = results.find(r => r.check === "canonical_timing_synchronization");
    expect(timingGate?.passed).toBe(false);
    expect(() => QualityGateEngine.assertPassed(results)).toThrow(/canonical_timing_synchronization/);
  });

  it("fails quality gate on weak hook", () => {
    const weakStoryboard = {
      ...storyboard,
      script: {
        ...storyboard.script,
        hook: "Did you know this fact?"
      }
    };

    const results = QualityGateEngine.runAllGates(weakStoryboard);
    const hookGate = results.find(r => r.check === "hook_strength");
    expect(hookGate?.passed).toBe(false);

    expect(() => QualityGateEngine.assertPassed(results)).toThrow(/hook_strength/);
  });
});
