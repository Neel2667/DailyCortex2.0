import { describe, it, expect } from "vitest";
import { TopicEngine } from "../src/content/topic-engine.js";
import { FactEngine } from "../src/content/fact-engine.js";
import { ScriptEngine } from "../src/content/script-engine.js";
import { VisualPlanner } from "../src/content/visual-planner.js";

describe("Content Intelligence Engine", () => {
  it("retrieves target topic on embarrassing memories", () => {
    const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
    expect(topic.id).toBe("embarrassing-memories");
    expect(topic.category).toBe("brain_science");
    expect(topic.claims.length).toBeGreaterThanOrEqual(3);
  });

  it("validates factual claims correctly", () => {
    const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
    const result = FactEngine.validateClaims(topic.claims);
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it("catches unverified claims missing sources or low confidence", () => {
    const badClaims = [
      {
        id: "bad-1",
        claim: "Unverified myth",
        category: "VERIFIED_FACT" as const,
        confidence: 0.3
      }
    ];
    const result = FactEngine.validateClaims(badClaims);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("generates structured script with proper pacing", () => {
    const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
    const script = ScriptEngine.generateScript(topic);

    expect(script.beats.length).toBeGreaterThanOrEqual(4);
    expect(script.wordsPerMinute).toBeGreaterThanOrEqual(130);
    expect(script.wordsPerMinute).toBeLessThanOrEqual(175);
    expect(script.hook.length).toBeGreaterThanOrEqual(25);
    expect(script.fullNarration).toContain("3 a.m.");
  });

  it("creates diverse multimodal storyboard", () => {
    const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
    const script = ScriptEngine.generateScript(topic);
    const storyboard = VisualPlanner.planStoryboard(topic, script);

    expect(storyboard.scenes.length).toBe(script.beats.length);
    const types = new Set(storyboard.scenes.map(s => s.type));
    expect(types.size).toBeGreaterThanOrEqual(4); // at least 4 different scene types
    expect(storyboard.soundtrack.duckingDb).toBe(14);
  });
});
