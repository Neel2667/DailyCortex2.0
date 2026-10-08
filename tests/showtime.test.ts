import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { ShowtimeHtmlBuilder } from "../src/showtime/html-builder.js";
import { ShowtimeProjectBuilder } from "../src/showtime/project-builder.js";
import { TopicEngine } from "../src/content/topic-engine.js";
import { ScriptEngine } from "../src/content/script-engine.js";
import { VisualPlanner } from "../src/content/visual-planner.js";
import { VoiceEngine } from "../src/audio/voice-engine.js";

describe("Showtime Project Generator", () => {
  const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
  const script = ScriptEngine.generateScript(topic);
  const storyboard = VisualPlanner.planStoryboard(topic, script);

  it("builds valid 9:16 HTML stage with mobile safe zones and captions", () => {
    const html = ShowtimeHtmlBuilder.buildHtml(storyboard);

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<script src="/_st/stage.js"></script>');
    expect(html).toContain('data-st="caption-karaoke"');
    expect(html).toContain('data-src="words.json"');
    expect(html).toContain('data-style="clean-pop"');
    expect(html).toContain('data-st="grain"');
    expect(html).toContain('3:00 AM BRAIN LOOP');
  });

  it("builds complete project files on disk", async () => {
    const testDir = join("data/jobs", "test-project-build");
    const voice = (await VoiceEngine.synthesizeNarration(script.fullNarration, testDir, "am_michael", false)).value!;

    const files = await ShowtimeProjectBuilder.buildProject(testDir, storyboard, voice);

    expect(files.projectDir).toBe(testDir);

    const showtimeJson = JSON.parse(await readFile(files.showtimeJsonPath, "utf-8"));
    expect(showtimeJson.width).toBe(1080);
    expect(showtimeJson.height).toBe(1920);
    expect(showtimeJson.fps).toBe(30);
    expect(showtimeJson.expect.platform).toBe("shorts");

    const wordsJson = JSON.parse(await readFile(files.wordsJsonPath, "utf-8"));
    expect(wordsJson.words.length).toBeGreaterThan(0);

    const mixJson = JSON.parse(await readFile(files.mixJsonPath, "utf-8"));
    expect(mixJson.tracks.length).toBeGreaterThan(0);
  }, 60000);
});
