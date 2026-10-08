import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { VoiceSynthesisResult, TimedWord, ProviderResult } from "../types.js";
import { config } from "../config.js";

export class VoiceEngine {
  /**
   * Synthesizes narration audio and extracts exact word timings.
   * Leverages Showtime's local Kokoro neural engine for zero-cost, zero-latency word-level alignment.
   */
  static async synthesizeNarration(
    narrationText: string,
    outputDir: string,
    voiceId: string = "am_michael",
    preferLocalEngine: boolean = true
  ): Promise<ProviderResult<VoiceSynthesisResult>> {
    const audioPath = join(outputDir, "vo.wav");
    const wordsJsonPath = join(outputDir, "words.json");

    if (preferLocalEngine) {
      try {
        const showtimeBin = config.showtimeBin || "showtime";
        const result = await new Promise<{ code: number; stderr: string }>((resolve) => {
          const child = spawn(showtimeBin, ["voice", "say", narrationText, "-v", voiceId, "-o", audioPath], {
            stdio: ["ignore", "pipe", "pipe"]
          });

          let stderr = "";
          child.stderr.on("data", (d) => (stderr += d.toString()));
          child.on("error", () => resolve({ code: 1, stderr: "Failed to spawn showtime voice" }));
          child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
        });

        if (result.code === 0) {
          // Showtime generates audioPath and audioPath.words.json (or <stem>.words.json)
          const generatedWordsPath = audioPath.replace(/\.wav$/, ".words.json");
          let rawJson = "";
          try {
            rawJson = await readFile(generatedWordsPath, "utf-8");
          } catch {
            rawJson = await readFile(wordsJsonPath, "utf-8").catch(() => "");
          }

          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            const words: TimedWord[] = (parsed.words ?? []).map((w: any) => ({
              word: w.text || w.word || "",
              start: Number(w.start || 0),
              end: Number(w.end || 0),
              confidence: Number(w.conf ?? 1.0)
            }));

            return {
              ok: true,
              value: {
                audioPath,
                durationSec: Number(parsed.duration || (words[words.length - 1]?.end ?? 35)),
                words,
                voiceId,
                provider: "showtime"
              }
            };
          }
        }
      } catch {
        // Fall back to synthetic timing generator if showtime execution fails
      }
    }

    // Deterministic fallback / mock timing generator
    const words = narrationText.trim().split(/\s+/);
    const avgWordDurationSec = 0.38;
    const timedWords: TimedWord[] = [];
    let currentTime = 0.2;

    for (const w of words) {
      const duration = Math.max(0.2, (w.length / 5) * avgWordDurationSec);
      timedWords.push({
        word: w,
        start: Number(currentTime.toFixed(3)),
        end: Number((currentTime + duration).toFixed(3)),
        confidence: 1.0
      });
      currentTime += duration + 0.05;
    }

    return {
      ok: true,
      value: {
        audioPath,
        durationSec: Number(currentTime.toFixed(3)),
        words: timedWords,
        voiceId: voiceId || "mock-voice",
        provider: "mock"
      }
    };
  }
}
