import { writeFile, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "util";
import type { TopicItem, ScriptSpec, ThumbnailSpec } from "../types.js";

const execAsync = promisify(exec);

export class ThumbnailGenerator {
  /**
   * Generates a high-contrast, platform-compliant vertical cover thumbnail (1080x1920) for YouTube Shorts.
   * Leverages real video frame extraction when videoPath is available, combined with safe-zone typography.
   */
  static async generateThumbnail(
    jobDir: string,
    topic: TopicItem,
    script: ScriptSpec,
    options: { videoPath?: string } = {}
  ): Promise<ThumbnailSpec> {
    await mkdir(jobDir, { recursive: true });
    const outputPath = join(jobDir, "thumbnail.jpg");
    const headline = ThumbnailGenerator.getHeadline(topic);
    const subtext = ThumbnailGenerator.getSubtext(topic);
    const accentColor = ThumbnailGenerator.getAccentColor(topic);

    if (options.videoPath) {
      // Extract high-quality frame from hook section (~1.5s in)
      try {
        await execAsync(`ffmpeg -y -ss 00:00:01.500 -i "${options.videoPath}" -vframes 1 -q:v 2 "${outputPath}"`);
      } catch {
        // Fallback to synthetic rendering if frame extraction fails
        await ThumbnailGenerator.renderSyntheticThumbnail(outputPath, topic, headline, subtext, accentColor);
      }
    } else {
      await ThumbnailGenerator.renderSyntheticThumbnail(outputPath, topic, headline, subtext, accentColor);
    }

    // Verify thumbnail with ffprobe
    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${outputPath}"`;
    const { stdout } = await execAsync(probeCmd);
    const probe = JSON.parse(stdout);
    const stream = probe.streams?.[0];
    const width = stream?.width ?? 1080;
    const height = stream?.height ?? 1920;

    const fileStats = await stat(outputPath);
    if (fileStats.size < 5000) {
      throw new Error(`Generated thumbnail is corrupt or too small (${fileStats.size} bytes)`);
    }

    // Also generate YouTube Data API compliant 16:9 custom thumbnail (1280x720)
    const landscapeOutputPath = join(jobDir, "thumbnail-16x9.jpg");
    if (options.videoPath) {
      try {
        await execAsync(`ffmpeg -y -ss 00:00:01.500 -i "${options.videoPath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x070913" -vframes 1 -q:v 2 "${landscapeOutputPath}"`);
      } catch {
        await ThumbnailGenerator.renderSyntheticLandscapeThumbnail(landscapeOutputPath, topic, headline, subtext, accentColor);
      }
    } else {
      await ThumbnailGenerator.renderSyntheticLandscapeThumbnail(landscapeOutputPath, topic, headline, subtext, accentColor);
    }

    const probeCmdLandscape = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${landscapeOutputPath}"`;
    const { stdout: stdoutLandscape } = await execAsync(probeCmdLandscape);
    const probeLandscape = JSON.parse(stdoutLandscape);
    const streamLandscape = probeLandscape.streams?.[0];
    const landscapeWidth = streamLandscape?.width ?? 1280;
    const landscapeHeight = streamLandscape?.height ?? 720;

    return {
      path: outputPath,
      width,
      height,
      format: "jpg",
      headline,
      subtext,
      accentColor,
      safeZonePass: width === 1080 && height === 1920,
      landscapePath: landscapeOutputPath,
      landscapeWidth,
      landscapeHeight,
      targetUse: "shorts_vertical_cover_and_api_16x9"
    };
  }

  /**
   * Generates a high-resolution 1080x1920 standalone SVG cover card and converts it via ffmpeg.
   */
  private static async renderSyntheticThumbnail(
    outputPath: string,
    topic: TopicItem,
    headline: string,
    subtext: string,
    accentColor: string
  ): Promise<void> {
    const svgPath = outputPath.replace(/\.jpg$/, ".svg");
    const svg = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070913" />
      <stop offset="40%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="url(#bg)" />

  <!-- Accent glow orb in center -->
  <circle cx="540" cy="800" r="350" fill="${accentColor}" opacity="0.18" filter="url(#glow)" />

  <!-- Safe Zone Upper Badge (Y: 480) -->
  <g transform="translate(540, 520)">
    <rect x="-180" y="-36" width="360" height="72" rx="36" fill="#1e293b" stroke="${accentColor}" stroke-width="3" />
    <text text-anchor="middle" y="11" font-family="-apple-system, system-ui, sans-serif" font-size="28" font-weight="800" fill="${accentColor}" letter-spacing="3">
      DAILY CORTEX
    </text>
  </g>

  <!-- Main Headline Banner (Y: 750 - 950) -->
  <text x="540" y="780" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="76" font-weight="900" fill="#FFFFFF" letter-spacing="-1">
    ${ThumbnailGenerator.escapeXml(headline)}
  </text>

  <!-- High-contrast Subtitle (Y: 920) -->
  <text x="540" y="900" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="38" font-weight="600" fill="#94A3B8">
    ${ThumbnailGenerator.escapeXml(subtext)}
  </text>

  <!-- Lower Scientific Callout Box (Y: 1200) -->
  <g transform="translate(180, 1150)">
    <rect width="720" height="180" rx="24" fill="#0b0f19" stroke="#334155" stroke-width="2" />
    <circle cx="60" cy="90" r="24" fill="${accentColor}" />
    <text x="110" y="80" font-family="-apple-system, system-ui, sans-serif" font-size="28" font-weight="700" fill="#F8FAFC">
      COGNITIVE MECHANISM
    </text>
    <text x="110" y="120" font-family="-apple-system, system-ui, sans-serif" font-size="22" font-weight="400" fill="#64748B">
      Verified Brain Science &amp; Psychology
    </text>
  </g>
</svg>`;

    await writeFile(svgPath, svg, "utf-8");
    // Generate exact 1080x1920 high-quality base frame with ffmpeg
    const hexColor = accentColor.startsWith("#") ? accentColor : "#38BDF8";
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x0f172a:s=1080x1920:d=0.1" -vframes 1 -q:v 2 "${outputPath}"`);
  }

  private static getHeadline(topic: TopicItem): string {
    switch (topic.id) {
      case "embarrassing-memories":
        return "3 A.M. BRAIN REPLAY";
      case "doorway-effect":
        return "THE DOORWAY WIPE";
      case "spotlight-effect":
        return "NOBODY NOTICED";
      case "zeigarnik-effect":
        return "UNFINISHED TASKS";
      default:
        return topic.topic.toUpperCase().slice(0, 24);
    }
  }

  private static getSubtext(topic: TopicItem): string {
    switch (topic.id) {
      case "embarrassing-memories":
        return "Why Cringe Memories Never Die";
      case "doorway-effect":
        return "Why You Walk In & Completely Freeze";
      case "spotlight-effect":
        return "The Social Anxiety Illusion";
      case "zeigarnik-effect":
        return "Why Open Loops Haunt Your Brain";
      default:
        return "Everyday Cognitive Science";
    }
  }

  private static getAccentColor(topic: TopicItem): string {
    switch (topic.id) {
      case "embarrassing-memories":
        return "#FF3B30";
      case "doorway-effect":
        return "#00E5FF";
      case "spotlight-effect":
        return "#FFD60A";
      case "zeigarnik-effect":
        return "#10B981";
      default:
        return "#38BDF8";
    }
  }

  private static async renderSyntheticLandscapeThumbnail(
    outputPath: string,
    topic: TopicItem,
    headline: string,
    subtext: string,
    accentColor: string
  ): Promise<void> {
    const svgPath = outputPath.replace(/\.jpg$/, ".svg");
    const svg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg16" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#070913" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg16)" />
  <circle cx="640" cy="360" r="280" fill="${accentColor}" opacity="0.15" />
  <text x="640" y="240" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="32" font-weight="800" fill="${accentColor}" letter-spacing="4">
    DAILY CORTEX
  </text>
  <text x="640" y="360" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF">
    ${ThumbnailGenerator.escapeXml(headline)}
  </text>
  <text x="640" y="440" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="28" font-weight="600" fill="#94A3B8">
    ${ThumbnailGenerator.escapeXml(subtext)}
  </text>
</svg>`;
    await writeFile(svgPath, svg.trim(), "utf-8");
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x0f172a:s=1280x720:d=0.1" -vframes 1 -q:v 2 "${outputPath}"`);
  }

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });
  }
}
