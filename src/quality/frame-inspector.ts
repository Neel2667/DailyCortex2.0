import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface FrameExtractionResult {
  percent: number;
  timestampSec: number;
  imagePath: string;
}

export class FrameInspector {
  /**
   * Extracts frames at specific percentage intervals and scene boundaries from an MP4 file.
   */
  static async extractBenchmarkFrames(
    videoPath: string,
    outputDir: string,
    durationSec: number,
    sceneTimestamps: number[] = []
  ): Promise<FrameExtractionResult[]> {
    await mkdir(outputDir, { recursive: true });

    const percentages = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
    const results: FrameExtractionResult[] = [];

    // Extract percentage frames
    for (const pct of percentages) {
      // Clamp 100% to slightly before end so ffmpeg captures valid frame
      const targetSec = pct === 100 ? Math.max(0, durationSec - 0.05) : (pct / 100) * durationSec;
      const roundedSec = Number(targetSec.toFixed(2));
      const frameName = `frame_pct_${String(pct).padStart(3, "0")}_${roundedSec}s.jpg`;
      const outPath = join(outputDir, frameName);

      await FrameInspector.extractSingleFrame(videoPath, roundedSec, outPath);
      results.push({
        percent: pct,
        timestampSec: roundedSec,
        imagePath: outPath
      });
    }

    // Extract scene transition frames
    for (let i = 0; i < sceneTimestamps.length; i++) {
      const sec = sceneTimestamps[i];
      const frameName = `scene_${i + 1}_transition_${sec}s.jpg`;
      const outPath = join(outputDir, frameName);
      await FrameInspector.extractSingleFrame(videoPath, sec, outPath);
    }

    return results;
  }

  private static extractSingleFrame(videoPath: string, timestampSec: number, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("ffmpeg", [
        "-ss", String(timestampSec),
        "-i", videoPath,
        "-vframes", "1",
        "-q:v", "2",
        "-y",
        outPath
      ], { stdio: "ignore" });

      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg frame extraction failed at ${timestampSec}s with code ${code}`));
      });
      child.on("error", reject);
    });
  }
}
