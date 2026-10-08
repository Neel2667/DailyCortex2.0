import type {
  StoryboardPlan,
  VoiceSynthesisResult,
  QualityGateResult,
  ShowtimeProjectFiles
} from "../types.js";
import { FactEngine } from "../content/fact-engine.js";
import { MediaNormalizer, type MediaProbeResult } from "../media/media-normalizer.js";

export class QualityGateEngine {
  /**
   * Runs the full suite of quality gates across content, visuals, audio, captions, and technical specs.
   */
  static runAllGates(
    storyboard: StoryboardPlan,
    voice?: VoiceSynthesisResult,
    projectFiles?: ShowtimeProjectFiles
  ): QualityGateResult[] {
    const results: QualityGateResult[] = [];

    // 1. CONTENT QA
    const hook = storyboard.script.hook.toLowerCase().trim();
    const isHookStrong = hook.length >= 25 &&
      !hook.startsWith("did you know") &&
      !hook.startsWith("here is a fact") &&
      !hook.startsWith("you won't believe") &&
      !hook.startsWith("scientists discovered");
    results.push({
      gate: "content",
      check: "hook_strength",
      passed: isHookStrong,
      message: isHookStrong ? "Hook is compelling, specific, and avoids cliched tropes" : "Hook is too short or relies on sensationalist AI tropes",
      severity: "error"
    });

    const wpm = storyboard.script.wordsPerMinute;
    const isPacingGood = wpm >= 120 && wpm <= 175;
    results.push({
      gate: "content",
      check: "pacing_wpm",
      passed: isPacingGood,
      score: wpm,
      message: isPacingGood ? `Pacing is optimal (${wpm} WPM)` : `Pacing of ${wpm} WPM is outside optimal range (120-175)`,
      severity: "warning"
    });

    const factAudit = FactEngine.auditScriptAgainstClaims(storyboard.script.fullNarration, storyboard.topic.claims);
    results.push({
      gate: "factual",
      check: "claim_grounding",
      passed: factAudit.passed,
      score: factAudit.score,
      message: factAudit.passed ? "Script is properly grounded in verified claims" : `Factual gaps: ${factAudit.notes.join("; ")}`,
      severity: "warning"
    });

    // 2. VISUAL QA
    const sceneCount = storyboard.scenes.length;
    const hasEnoughScenes = sceneCount >= 4;
    results.push({
      gate: "visual",
      check: "scene_count",
      passed: hasEnoughScenes,
      score: sceneCount,
      message: hasEnoughScenes ? `Healthy scene coverage (${sceneCount} scenes)` : `Too few scenes (${sceneCount}) for dynamic Short`,
      severity: "error"
    });

    // Verify visual diversity (no single type > 50%)
    const typeCounts: Record<string, number> = {};
    for (const s of storyboard.scenes) {
      typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    }
    const maxTypeDominance = Math.max(...Object.values(typeCounts)) / sceneCount;
    const isDiverse = maxTypeDominance <= 0.5;
    results.push({
      gate: "visual",
      check: "visual_diversity",
      passed: isDiverse,
      score: 1 - maxTypeDominance,
      message: isDiverse ? "Visual types are varied and balanced" : `A single visual type dominates ${Math.round(maxTypeDominance * 100)}% of the video`,
      severity: "warning"
    });

    // 3. STRICT TIMING CONTRACT (CANONICAL RETIMING AUDIT)
    if (voice) {
      const sumSceneDuration = Number(
        storyboard.scenes.reduce((sum, s) => sum + s.durationSec, 0).toFixed(2)
      );
      const totalVideoDuration = Number(storyboard.totalDurationSec.toFixed(2));
      const endHold = storyboard.canonicalTimeline?.endHoldSec ?? 1.0;
      const expectedTotal = Number((voice.durationSec + endHold).toFixed(2));

      // Sum of scenes must exactly equal storyboard.totalDurationSec
      const sceneSumDelta = Math.abs(sumSceneDuration - totalVideoDuration);
      const isSceneSumValid = sceneSumDelta <= 0.05;
      results.push({
        gate: "technical",
        check: "scene_timeline_continuity",
        passed: isSceneSumValid,
        score: sceneSumDelta,
        message: isSceneSumValid
          ? `Continuous visual timeline: sum of scenes (${sumSceneDuration}s) matches total duration (${totalVideoDuration}s)`
          : `Timeline discontinuity: scenes sum to ${sumSceneDuration}s but total is ${totalVideoDuration}s (delta: ${sceneSumDelta}s)`,
        severity: "error"
      });

      // Video duration must match canonical voice duration + end hold within 0.25s
      const voiceAlignmentDelta = Math.abs(totalVideoDuration - expectedTotal);
      const isVoiceAligned = voiceAlignmentDelta <= 0.25;
      results.push({
        gate: "audio",
        check: "canonical_timing_synchronization",
        passed: isVoiceAligned,
        score: voiceAlignmentDelta,
        message: isVoiceAligned
          ? `Canonical synchronization PASS: video (${totalVideoDuration}s) = voice (${voice.durationSec.toFixed(2)}s) + hold (${endHold}s)`
          : `CRITICAL TIMING DEFECT: video duration (${totalVideoDuration}s) deviates from expected voice timeline (${expectedTotal}s) by ${voiceAlignmentDelta}s`,
        severity: "error"
      });

      // 4. CAPTION TIMING INTEGRITY
      let captionTimingValid = true;
      let captionIssue = "";
      const lastWord = voice.words[voice.words.length - 1];

      for (let i = 0; i < voice.words.length; i++) {
        const w = voice.words[i];
        if (w.start >= w.end || w.start < 0) {
          captionTimingValid = false;
          captionIssue = `Invalid word timestamps on "${w.word}" (${w.start}s - ${w.end}s)`;
          break;
        }
        if (i > 0 && w.start < voice.words[i - 1].start) {
          captionTimingValid = false;
          captionIssue = `Out-of-order word sequence on "${w.word}"`;
          break;
        }
      }

      if (captionTimingValid && lastWord) {
        if (lastWord.end > totalVideoDuration) {
          captionTimingValid = false;
          captionIssue = `Captions spill past video end: last word ends at ${lastWord.end}s but video ends at ${totalVideoDuration}s`;
        }
      }

      results.push({
        gate: "caption",
        check: "caption_timing_integrity",
        passed: captionTimingValid,
        message: captionTimingValid
          ? `Captions validated (${voice.words.length} timed words, ends cleanly at ${lastWord?.end.toFixed(2)}s)`
          : captionIssue,
        severity: "error"
      });
    }

    // 5. PRODUCTION PROJECT STRUCTURE
    if (projectFiles) {
      const hasCoreFiles = Boolean(
        projectFiles.projectDir &&
        projectFiles.showtimeJsonPath &&
        projectFiles.indexPath &&
        projectFiles.mixJsonPath &&
        projectFiles.wordsJsonPath
      );
      results.push({
        gate: "production",
        check: "project_structure_validity",
        passed: hasCoreFiles,
        message: hasCoreFiles ? "Native Showtime project files assembled" : "Missing required project files",
        severity: "error"
      });
    }

    return results;
  }

  /**
   * Independent Post-Render QA: probes the generated MP4 file with FFmpeg/ffprobe
   */
  static async auditRenderedMp4(
    videoPath: string,
    expectedDurationSec: number
  ): Promise<QualityGateResult[]> {
    const normalizer = new MediaNormalizer();
    const results: QualityGateResult[] = [];

    try {
      const probe: MediaProbeResult = await normalizer.probeMedia(videoPath);

      // 1. Valid video stream & dimensions
      const is916 = (probe.width === 1080 && probe.height === 1920) || (probe.width === 720 && probe.height === 1280);
      results.push({
        gate: "technical",
        check: "mp4_aspect_ratio_9_16",
        passed: is916,
        message: is916
          ? `Valid 9:16 vertical resolution (${probe.width}x${probe.height})`
          : `Invalid aspect ratio: ${probe.width}x${probe.height}`,
        severity: "error"
      });

      // 2. Codec is H.264
      const isH264 = probe.codec.toLowerCase().includes("h264") || probe.codec.toLowerCase().includes("avc");
      results.push({
        gate: "technical",
        check: "mp4_codec_h264",
        passed: isH264,
        message: isH264 ? `Valid video codec (${probe.codec})` : `Unexpected codec: ${probe.codec}`,
        severity: "error"
      });

      // 3. Rendered Duration matches canonical expectation within 0.5s
      const durationDelta = Math.abs(probe.durationSec - expectedDurationSec);
      const isDurationAccurate = durationDelta <= 0.5;
      results.push({
        gate: "technical",
        check: "mp4_duration_accuracy",
        passed: isDurationAccurate,
        score: durationDelta,
        message: isDurationAccurate
          ? `Rendered duration (${probe.durationSec.toFixed(2)}s) matches canonical timeline (${expectedDurationSec.toFixed(2)}s)`
          : `Duration mismatch: rendered is ${probe.durationSec.toFixed(2)}s, expected ${expectedDurationSec.toFixed(2)}s (delta: ${durationDelta.toFixed(2)}s)`,
        severity: "error"
      });
    } catch (err: any) {
      results.push({
        gate: "production",
        check: "mp4_file_probe",
        passed: false,
        message: `Failed to probe rendered video: ${err.message}`,
        severity: "error"
      });
    }

    return results;
  }

  /**
   * Throws if any gate marked severity "error" failed
   */
  static assertPassed(results: QualityGateResult[]): void {
    const blockingFailures = results.filter(r => !r.passed && r.severity === "error");
    if (blockingFailures.length > 0) {
      const summary = blockingFailures.map(f => `[${f.gate}:${f.check}] ${f.message}`).join("; ");
      throw new Error(`Quality Gate Failure: ${summary}`);
    }
  }
}
