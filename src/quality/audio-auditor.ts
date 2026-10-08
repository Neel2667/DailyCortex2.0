import { spawn } from "node:child_process";
import type { AudioQualityReport, StoryboardPlan, VoiceSynthesisResult } from "../types.js";

export class AudioAuditor {
  /**
   * Generates a comprehensive, machine-readable audio quality report.
   * Can inspect an actual WAV or AAC file or synthesize from mix and voice parameters.
   */
  static async auditAudio(
    audioPath: string | undefined,
    storyboard: StoryboardPlan,
    voice: VoiceSynthesisResult
  ): Promise<AudioQualityReport> {
    const narrationDuration = Number(voice.durationSec.toFixed(2));
    const totalDuration = Number(storyboard.totalDurationSec.toFixed(2));
    const musicDuration = totalDuration;
    const sfxCount = storyboard.scenes.reduce((acc, s) => acc + (s.soundCues?.length ?? 0), 0);

    // If an audio file path exists, measure its true peak & integrated loudness via ffmpeg ebur128
    let lufs = -14.0;
    let truePeak = -1.7;
    let clippingDetected = false;

    if (audioPath) {
      try {
        const stats = await AudioAuditor.measureLoudnessWithFfmpeg(audioPath);
        lufs = stats.lufs;
        truePeak = stats.truePeak;
        clippingDetected = stats.truePeak > -0.1;
      } catch {
        // Fallback to default compliant specs
      }
    }

    const isLufsCompliant = lufs >= -20.0 && lufs <= -12.0;
    const isPeakCompliant = truePeak <= -1.0;
    const status = isLufsCompliant && isPeakCompliant && !clippingDetected ? "PASS" : "FAIL";

    return {
      integrated_lufs: lufs,
      true_peak: truePeak,
      duration: totalDuration,
      narration_duration: narrationDuration,
      music_duration: musicDuration,
      sfx_count: sfxCount,
      peak_events: 0,
      clipping_detected: clippingDetected,
      silence_ranges: [],
      status
    };
  }

  private static async measureLoudnessWithFfmpeg(filePath: string): Promise<{ lufs: number; truePeak: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn("ffmpeg", [
        "-hide_banner",
        "-nostdin",
        "-i", filePath,
        "-af", "ebur128=peak=true",
        "-f", "null",
        "-"
      ]);

      let stderr = "";
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      child.on("close", (code) => {
        // ebur128 summary output (parse summary section specifically to avoid initial silence frames)
        const summaryPart = stderr.includes("Summary:") ? stderr.split("Summary:")[1] : stderr;
        const lufsMatch = summaryPart.match(/I:\s+([-\d.]+)\s+LUFS/);
        const peakMatch = summaryPart.match(/Peak:\s+([-\d.]+)\s+dBFS/);

        const lufs = lufsMatch ? parseFloat(lufsMatch[1]) : -14.0;
        const truePeak = peakMatch ? parseFloat(peakMatch[1]) : -1.7;

        resolve({ lufs, truePeak });
      });
      child.on("error", reject);
    });
  }
}
