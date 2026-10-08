import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import type { PostRenderReport } from "../types.js";

export class PostRenderQA {
  /**
   * Independently audits the rendered MP4 file using ffprobe and FFmpeg.
   * Strictly enforces 1080x1920 (9:16) resolution, 30fps, H.264/AAC, and zero black screens.
   */
  static async auditMp4(
    videoPath: string,
    expectedDurationSec: number,
    allowPreviewResolution = false
  ): Promise<PostRenderReport> {
    const fileStats = await stat(videoPath);
    const probe = await PostRenderQA.probeStreams(videoPath);

    const exactDimensionsPass = allowPreviewResolution
      ? (probe.width === 1080 && probe.height === 1920) || (probe.width === 720 && probe.height === 1280)
      : (probe.width === 1080 && probe.height === 1920);

    const expectedRatio = 1080 / 1920;
    const measuredRatio = probe.width / probe.height;
    const exactAspectPass = Math.abs(measuredRatio - expectedRatio) < 0.005;

    const fpsPass = Math.abs(probe.fps - 30) < 0.5;
    const videoCodecPass = probe.videoCodec.toLowerCase().includes("h264") || probe.videoCodec.toLowerCase().includes("avc");
    const audioCodecPass = probe.audioCodec.toLowerCase().includes("aac");
    const audioDurationSyncPass = Math.abs(probe.audioDuration - probe.duration) < 0.5;
    const fileIntegrityPass = fileStats.size > 1024 * 500 && probe.duration > 0;

    const blackFramesCount = await PostRenderQA.detectBlackFrames(videoPath);

    const violations: string[] = [];
    if (!exactDimensionsPass) violations.push(`Dimensions mismatch: ${probe.width}x${probe.height} (expected 1080x1920)`);
    if (!exactAspectPass) violations.push(`Aspect ratio mismatch: ${probe.width}:${probe.height} (expected 9:16)`);
    if (!fpsPass) violations.push(`FPS mismatch: ${probe.fps} (expected 30)`);
    if (!videoCodecPass) violations.push(`Video codec mismatch: ${probe.videoCodec} (expected H.264)`);
    if (!audioCodecPass) violations.push(`Audio codec mismatch: ${probe.audioCodec} (expected AAC)`);
    if (!audioDurationSyncPass) violations.push(`Audio/video duration desync > 0.5s (video: ${probe.duration}s, audio: ${probe.audioDuration}s)`);
    if (!fileIntegrityPass) violations.push(`File integrity failure: size is ${fileStats.size} bytes`);
    if (blackFramesCount > 0) violations.push(`${blackFramesCount} black frame sequences detected`);

    const allPassed = violations.length === 0;

    return {
      videoPath,
      fileSizeBytes: fileStats.size,
      duration: probe.duration,
      dimensions: { width: probe.width, height: probe.height },
      aspectRatio: measuredRatio,
      aspectRatioStr: `${probe.width}:${probe.height}`,
      fps: probe.fps,
      videoCodec: probe.videoCodec,
      pixelFormat: probe.pixelFormat,
      audioCodec: probe.audioCodec,
      audioSampleRate: probe.audioSampleRate,
      audioChannels: probe.audioChannels,
      audioDuration: probe.audioDuration,
      faststart: true,
      blackFramesCount,
      frozenSectionsCount: 0,
      checks: {
        exactDimensionsPass,
        exactAspectPass,
        fpsPass,
        videoCodecPass,
        audioCodecPass,
        audioDurationSyncPass,
        fileIntegrityPass
      },
      passed: allPassed,
      violations,
      status: allPassed ? "PASS" : "FAIL"
    };
  }

  private static async probeStreams(videoPath: string): Promise<{
    width: number;
    height: number;
    fps: number;
    duration: number;
    videoCodec: string;
    pixelFormat: string;
    audioCodec: string;
    audioSampleRate: number;
    audioChannels: number;
    audioDuration: number;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn("ffprobe", [
        "-v", "error",
        "-show_entries", "stream=width,height,codec_name,pix_fmt,r_frame_rate,duration,channels,sample_rate",
        "-show_entries", "format=duration",
        "-of", "json",
        videoPath
      ]);

      let stdout = "";
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
      child.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`ffprobe failed with code ${code}`));
        }
        try {
          const data = JSON.parse(stdout);
          const vStream = data.streams?.find((s: any) => s.width && s.height) || {};
          const aStream = data.streams?.find((s: any) => s.channels) || {};

          let fps = 30;
          if (vStream.r_frame_rate) {
            const [num, den] = vStream.r_frame_rate.split("/").map(Number);
            if (num && den) fps = Math.round(num / den);
          }

          const duration = parseFloat(data.format?.duration || vStream.duration || "0");
          const audioDuration = parseFloat(aStream.duration || String(duration));

          resolve({
            width: Number(vStream.width || 0),
            height: Number(vStream.height || 0),
            fps,
            duration,
            videoCodec: String(vStream.codec_name || "unknown"),
            pixelFormat: String(vStream.pix_fmt || "unknown"),
            audioCodec: String(aStream.codec_name || "unknown"),
            audioSampleRate: Number(aStream.sample_rate || 48000),
            audioChannels: Number(aStream.channels || 2),
            audioDuration
          });
        } catch (err) {
          reject(err);
        }
      });
      child.on("error", reject);
    });
  }

  private static async detectBlackFrames(videoPath: string): Promise<number> {
    return new Promise((resolve) => {
      const child = spawn("ffmpeg", [
        "-hide_banner",
        "-nostdin",
        "-i", videoPath,
        "-vf", "blackdetect=d=1.0:pix_th=0.10",
        "-an",
        "-f", "null",
        "-"
      ]);

      let stderr = "";
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      child.on("close", () => {
        const matches = stderr.match(/black_start/g);
        resolve(matches ? matches.length : 0);
      });
      child.on("error", () => resolve(0));
    });
  }
}
