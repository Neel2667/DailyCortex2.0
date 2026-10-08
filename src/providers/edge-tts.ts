import { spawn } from "node:child_process";
import { join } from "node:path";
import type { ProviderResult, VoiceProvider, VoiceSynthesisResult, TimedWord } from "../types.js";

export class EdgeTTSProvider implements VoiceProvider {
  async synthesize(text: string, voiceId: string, outputDir: string): Promise<ProviderResult<VoiceSynthesisResult>> {
    const outputPath = join(outputDir, "vo.wav");
    return new Promise((resolve) => {
      const c = spawn("edge-tts", ["--voice", voiceId, "--text", text, "--write-media", outputPath], {
        stdio: ["ignore", "ignore", "pipe"]
      });
      let e = "";
      c.stderr.on("data", (d: Buffer) => (e += d.toString()));
      c.on("error", (x: Error) => resolve({ ok: false, error: x.message }));
      c.on("close", (n: number | null) => {
        if (n === 0) {
          // Generate estimated words for edge-tts
          const words = text.trim().split(/\s+/);
          const timedWords: TimedWord[] = [];
          let cur = 0.2;
          for (const w of words) {
            const d = 0.35;
            timedWords.push({ word: w, start: cur, end: cur + d, confidence: 0.9 });
            cur += d + 0.05;
          }
          resolve({
            ok: true,
            value: {
              audioPath: outputPath,
              durationSec: cur,
              words: timedWords,
              voiceId,
              provider: "edge-tts"
            }
          });
        } else {
          resolve({ ok: false, error: e || `edge-tts exited ${n}` });
        }
      });
    });
  }
}
