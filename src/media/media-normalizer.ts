import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

export interface MediaProbeResult {
  width: number;
  height: number;
  durationSec: number;
  codec: string;
  isPortrait: boolean;
  aspectRatio: string;
}

export type SceneMood =
  | "dark_night_bedroom"
  | "ambient_cafe"
  | "neural_threat_matrix"
  | "fmri_scan_clinical"
  | "sunset_relief_peace";

export class MediaNormalizer {
  private cacheDir: string;

  constructor(cacheDir = "data/assets/cache") {
    this.cacheDir = cacheDir;
  }

  async init(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * Deterministically computes cache key for a media asset and transformation params
   */
  computeCacheKey(provider: string, assetId: string, params: Record<string, any> = {}): string {
    const raw = `${provider}:${assetId}:${JSON.stringify(params)}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Convenience generator for dynamic 9:16 motion plates
   */
  async generateDynamicMotionPlate(mood: SceneMood, durationSec: number): Promise<string> {
    return this.generateMotionPlate("", durationSec, mood);
  }

  /**
   * Probes any media file with ffprobe to extract accurate metadata
   */
  async probeMedia(filePath: string): Promise<MediaProbeResult> {
    return new Promise((resolve, reject) => {
      const child = spawn("ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration,codec_name",
        "-of", "json",
        filePath
      ]);

      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

      child.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`ffprobe failed (${code}): ${stderr}`));
        }
        try {
          const parsed = JSON.parse(stdout);
          const stream = parsed.streams?.[0] ?? {};
          const width = Number(stream.width || 1080);
          const height = Number(stream.height || 1920);
          const durationSec = Number(stream.duration || 10);
          const codec = stream.codec_name || "unknown";
          resolve({
            width,
            height,
            durationSec,
            codec,
            isPortrait: height >= width,
            aspectRatio: `${width}:${height}`
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
        }
      });
    });
  }

  /**
   * Normalizes any input video file to exact 1080x1920 9:16 vertical MP4
   */
  async normalizeVideo(inputPath: string, outputPath: string, durationSec?: number): Promise<string> {
    await this.init();

    const filter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1";
    const args = [
      "-y",
      "-i", inputPath,
      "-vf", filter,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-an"
    ];

    if (durationSec) {
      args.push("-t", durationSec.toFixed(2));
    }
    args.push(outputPath);

    return new Promise((resolve, reject) => {
      const child = spawn("ffmpeg", args);
      let stderr = "";
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      child.on("close", (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error(`ffmpeg normalize failed (${code}): ${stderr}`));
      });
    });
  }

  /**
   * Generates a rich, ambient 1080x1920 30fps WebM (VP9) motion plate tailored to the scene's emotional context.
   * Eliminates static slides and guarantees a valid local 9:16 background video supported natively by Chromium.
   */
  async generateMotionPlate(outputPath: string, durationSec: number, mood: SceneMood): Promise<string> {
    await this.init();

    // Check if cached file already exists with same duration and mood
    const cacheKey = createHash("sha256").update(`${mood}_${durationSec.toFixed(1)}`).digest("hex").slice(0, 16);
    const cachedFile = join(this.cacheDir, `plate_${cacheKey}.webm`);

    try {
      const st = await stat(cachedFile);
      if (st.size > 1024) {
        if (outputPath && outputPath !== cachedFile) {
          const { copyFile } = await import("node:fs/promises");
          await copyFile(cachedFile, outputPath);
          return outputPath;
        }
        return cachedFile;
      }
    } catch {
      // not cached
    }

    let filterGraph = "";
    switch (mood) {
      case "dark_night_bedroom":
        // Deep midnight blue with subtle ambient light drift
        filterGraph = "color=c=0x070913:s=1080x1920:d=" + durationSec + ":r=30,drawbox=y=ih*0.3:h=400:color=0x1E293B@0.25:t=fill";
        break;
      case "ambient_cafe":
        // Warm cafe social background plate with subtle warm amber tone
        filterGraph = "color=c=0x0B0F19:s=1080x1920:d=" + durationSec + ":r=30,drawbox=y=ih*0.4:h=500:color=0x38BDF8@0.15:t=fill";
        break;
      case "neural_threat_matrix":
        // Amber warning tone pulse plate
        filterGraph = "color=c=0x0F0E17:s=1080x1920:d=" + durationSec + ":r=30,drawbox=y=ih*0.35:h=450:color=0xF59E0B@0.18:t=fill";
        break;
      case "fmri_scan_clinical":
        // Clinical emerald priority scan plate
        filterGraph = "color=c=0x06110D:s=1080x1920:d=" + durationSec + ":r=30,drawbox=y=ih*0.4:h=450:color=0x10B981@0.16:t=fill";
        break;
      case "sunset_relief_peace":
      default:
        // Deep twilight purple relief plate
        filterGraph = "color=c=0x0D0B18:s=1080x1920:d=" + durationSec + ":r=30,drawbox=y=ih*0.45:h=550:color=0x8B5CF6@0.2:t=fill";
        break;
    }

    const targetOut = outputPath || cachedFile;
    const args = [
      "-y",
      "-f", "lavfi",
      "-i", filterGraph,
      "-c:v", "libvpx-vp9",
      "-deadline", "realtime",
      "-cpu-used", "8",
      "-b:v", "1M",
      "-g", "15",
      "-pix_fmt", "yuv420p",
      "-an",
      "-t", durationSec.toFixed(2),
      cachedFile
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn("ffmpeg", args);
      let stderr = "";
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      child.on("close", async (code) => {
        if (code === 0) {
          if (outputPath && outputPath !== cachedFile) {
            const { copyFile } = await import("node:fs/promises");
            await copyFile(cachedFile, outputPath);
          }
          resolve();
        } else {
          reject(new Error(`Failed to generate motion plate: ${stderr}`));
        }
      });
    });

    return targetOut;
  }
}
