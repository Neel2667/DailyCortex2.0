import { describe, it, expect } from "vitest";
import { VoiceEngine } from "../src/audio/voice-engine.js";
import { SoundDesignEngine } from "../src/audio/sound-design.js";
import { TopicEngine } from "../src/content/topic-engine.js";
import { ScriptEngine } from "../src/content/script-engine.js";
import { VisualPlanner } from "../src/content/visual-planner.js";

describe("Audio & Sound Design Engine", () => {
  it("synthesizes narration and extracts timed words", async () => {
    const text = "Your brain remembers embarrassing moments for a reason.";
    const result = await VoiceEngine.synthesizeNarration(text, "/tmp", "am_michael", false);

    expect(result.ok).toBe(true);
    expect(result.value).toBeDefined();
    expect(result.value?.words.length).toBe(8);
    expect(result.value?.durationSec).toBeGreaterThan(2);

    const firstWord = result.value?.words[0];
    expect(firstWord?.word).toBe("Your");
    expect(firstWord?.start).toBeLessThan(firstWord!.end);
  });

  it("generates declarative mix.json with ducking and synchronized SFX", () => {
    const topic = TopicEngine.getTargetEmbarrassingMemoryTopic();
    const script = ScriptEngine.generateScript(topic);
    const storyboard = VisualPlanner.planStoryboard(topic, script);

    const mix = SoundDesignEngine.generateMix(storyboard, "voice/vo.wav");

    expect(mix.sample_rate).toBe(48000);
    expect(mix.master.lufs).toBe(-14);

    const voiceTrack = mix.tracks.find(t => t.kind === "voice");
    expect(voiceTrack).toBeDefined();
    expect(voiceTrack?.file).toBe("voice/vo.wav");

    const musicTrack = mix.tracks.find(t => t.kind === "music");
    expect(musicTrack).toBeDefined();
    expect(musicTrack?.duck?.under).toBe("voice");
    expect(musicTrack?.duck?.depth_db).toBe(14);

    const sfxTracks = mix.tracks.filter(t => t.kind === "sfx");
    expect(sfxTracks.length).toBeGreaterThanOrEqual(4);
  });
});
