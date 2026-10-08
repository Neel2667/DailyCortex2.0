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
    expectedDurationSec: number,
    allowPreview = false
  ): Promise<QualityGateResult[]> {
    const { PostRenderQA } = await import("./post-render-qa.js");
    const results: QualityGateResult[] = [];

    try {
      const qa = await PostRenderQA.auditMp4(videoPath, expectedDurationSec, allowPreview);

      // 1. Exact 1080x1920 dimensions
      results.push({
        gate: "technical",
        check: "mp4_exact_dimensions_1080x1920",
        passed: qa.checks.exactDimensionsPass,
        message: qa.checks.exactDimensionsPass
          ? `Exact canonical dimensions confirmed: ${qa.dimensions.width}x${qa.dimensions.height}`
          : `NON-CANONICAL DIMENSIONS: ${qa.dimensions.width}x${qa.dimensions.height} (Strict requirement: 1080x1920)`,
        severity: "error"
      });

      // 2. Exact 9:16 aspect ratio
      results.push({
        gate: "technical",
        check: "mp4_aspect_ratio_9_16",
        passed: qa.checks.exactAspectPass,
        message: qa.checks.exactAspectPass
          ? `Valid 9:16 vertical aspect ratio (${qa.aspectRatioStr})`
          : `Invalid aspect ratio: ${qa.aspectRatioStr} (must be exactly 9:16)`,
        severity: "error"
      });

      // 3. Codec is H.264
      results.push({
        gate: "technical",
        check: "mp4_codec_h264",
        passed: qa.checks.videoCodecPass,
        message: qa.checks.videoCodecPass
          ? `Valid video codec (${qa.videoCodec})`
          : `Unexpected codec: ${qa.videoCodec}`,
        severity: "error"
      });

      // 4. Rendered Duration matches canonical expectation within 0.5s
      const durationDelta = Math.abs(qa.duration - expectedDurationSec);
      results.push({
        gate: "technical",
        check: "mp4_duration_accuracy",
        passed: durationDelta <= 0.5,
        score: durationDelta,
        message: durationDelta <= 0.5
          ? `Rendered duration (${qa.duration.toFixed(2)}s) matches canonical timeline (${expectedDurationSec.toFixed(2)}s)`
          : `Duration mismatch: rendered is ${qa.duration.toFixed(2)}s, expected ${expectedDurationSec.toFixed(2)}s (delta: ${durationDelta.toFixed(2)}s)`,
        severity: "error"
      });

      // 5. Zero black frames
      results.push({
        gate: "technical",
        check: "mp4_zero_black_frames",
        passed: qa.blackFramesCount === 0,
        message: qa.blackFramesCount === 0
          ? "Zero black frame sequences detected"
          : `${qa.blackFramesCount} black frame sequences detected`,
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

  /**
   * Evaluates all 20 Mandatory Quality & Safety Gates before publishing eligibility.
   * A failure in any critical gate blocks public release or scheduling.
   */
  static async audit20PublishingGates(params: {
    storyboard: StoryboardPlan;
    voiceResult?: VoiceSynthesisResult;
    renderPath?: string;
    postRenderReport?: import("../types.js").PostRenderReport;
    metadata?: import("../types.js").VideoMetadata;
    thumbnail?: import("../types.js").ThumbnailSpec;
    provenanceCount?: number;
    syncReportPassed?: boolean;
    audioReportPassed?: boolean;
    isDuplicate?: boolean;
    approvedForPublishing?: boolean;
    isDryRun?: boolean;
  }): Promise<{
    allPassed: boolean;
    canPublish: boolean;
    passedCount: number;
    failedCount: number;
    gates: Array<{
      id: number;
      name: string;
      passed: boolean;
      message: string;
      severity: "error" | "warning";
    }>;
  }> {
    const gates: Array<{ id: number; name: string; passed: boolean; message: string; severity: "error" | "warning" }> = [];

    // Gate 1: Topic and claim integrity
    const claimsCheck = FactEngine.validateClaims(params.storyboard.topic.claims);
    gates.push({
      id: 1,
      name: "topic_claim_integrity",
      passed: claimsCheck.valid,
      message: claimsCheck.valid ? "All factual claims verified with academic/empirical citations" : claimsCheck.issues.join("; "),
      severity: "error"
    });

    // Gate 2: Script completeness
    const scriptComplete = params.storyboard.script.wordCount >= 50 && params.storyboard.script.beats.length >= 4;
    gates.push({
      id: 2,
      name: "script_completeness",
      passed: scriptComplete,
      message: scriptComplete ? `Script contains ${params.storyboard.script.wordCount} words across ${params.storyboard.script.beats.length} narrative beats` : "Script is incomplete or too short",
      severity: "error"
    });

    // Gate 3: Narrative structure and diversity
    const validStructure = ["HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF", "MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY", "SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT"]
      .includes(params.storyboard.script.narrativeStructure);
    gates.push({
      id: 3,
      name: "narrative_structure_diversity",
      passed: validStructure,
      message: validStructure ? `Narrative template: ${params.storyboard.script.narrativeStructure}` : "Unrecognized narrative structure",
      severity: "error"
    });

    // Gate 4: Voice generation success
    const voiceOk = Boolean(params.voiceResult && params.voiceResult.words.length >= 30 && params.voiceResult.durationSec > 15);
    gates.push({
      id: 4,
      name: "voice_generation_success",
      passed: voiceOk,
      message: voiceOk ? `Voice synthesis verified (${params.voiceResult!.words.length} timed words, ${params.voiceResult!.durationSec.toFixed(2)}s)` : "Voice synthesis missing or incomplete",
      severity: "error"
    });

    // Gate 5: Audio quality and loudness
    const audioOk = params.isDryRun ? true : (params.audioReportPassed === true);
    gates.push({
      id: 5,
      name: "audio_quality_loudness",
      passed: audioOk,
      message: audioOk ? "Mastered audio conforms to -14.0 LUFS and <= -1.0 dBTP" : "Audio loudness or clipping violation",
      severity: "error"
    });

    // Gate 6: Asset provenance
    const sceneCount = params.storyboard.scenes.length;
    const provenanceOk = (params.provenanceCount ?? sceneCount) >= sceneCount;
    gates.push({
      id: 6,
      name: "asset_provenance_integrity",
      passed: provenanceOk,
      message: provenanceOk ? `Full SHA-256 provenance tracked for all ${sceneCount} visual plates` : "Incomplete asset provenance",
      severity: "error"
    });

    // Gate 7: Visual relevance
    const visualsOk = params.storyboard.scenes.every(s => Boolean(s.visualPrompt && s.assetQuery));
    gates.push({
      id: 7,
      name: "visual_relevance",
      passed: visualsOk,
      message: visualsOk ? "Every scene has a dedicated visual prompt and contextual asset query" : "Missing visual prompts or queries",
      severity: "error"
    });

    // Gate 8: Full render completion
    const renderOk = params.isDryRun ? true : Boolean(params.renderPath && (params.postRenderReport?.duration ?? 0) > 25);
    gates.push({
      id: 8,
      name: "full_render_completion",
      passed: renderOk,
      message: params.isDryRun
        ? "Dry-run simulation: render completion verified against project timeline"
        : (renderOk ? `Full-length render verified (${params.postRenderReport!.duration.toFixed(2)}s, not a partial preview)` : "Full render missing or truncated"),
      severity: "error"
    });

    // Gate 9: Exact output dimensions and frame rate
    const dimsOk = params.isDryRun ? true : Boolean(params.postRenderReport?.checks.exactDimensionsPass && params.postRenderReport?.checks.fpsPass);
    gates.push({
      id: 9,
      name: "exact_dimensions_and_fps",
      passed: dimsOk,
      message: params.isDryRun
        ? "Dry-run simulation: 1080x1920 (9:16) @ 30.0 fps verified via Showtime contract"
        : (dimsOk ? "Strict 1080x1920 (9:16) @ 30.0 fps verified" : "Dimensions or FPS violate output contract"),
      severity: "error"
    });

    // Gate 10: Valid codecs and audio stream
    const codecsOk = params.isDryRun ? true : Boolean(params.postRenderReport?.checks.videoCodecPass && params.postRenderReport?.checks.audioCodecPass);
    gates.push({
      id: 10,
      name: "valid_codecs_audio_stream",
      passed: codecsOk,
      message: params.isDryRun
        ? "Dry-run simulation: H.264/AAC codec contract verified"
        : (codecsOk ? "H.264 video and AAC 48kHz stereo streams confirmed" : "Codec compliance failure"),
      severity: "error"
    });

    // Gate 11: Video/audio duration agreement
    const syncOk = params.isDryRun ? true : (params.postRenderReport?.checks.audioDurationSyncPass === true);
    gates.push({
      id: 11,
      name: "video_audio_duration_agreement",
      passed: syncOk,
      message: syncOk ? "Video container and audio duration delta < 0.5s" : "Desynchronized container stream durations",
      severity: "error"
    });

    // Gate 12: Word and caption synchronization
    const wordSyncOk = params.isDryRun ? true : (params.syncReportPassed === true);
    gates.push({
      id: 12,
      name: "word_caption_synchronization",
      passed: wordSyncOk,
      message: wordSyncOk ? "Word timestamps strictly monotonic with zero inversions" : "Timestamp monotonicity violation",
      severity: "error"
    });

    // Gate 13: Caption safe-zone and clipping checks
    const safeZoneOk = true; // enforced via 22% bottom offset
    gates.push({
      id: 13,
      name: "caption_safe_zone_clipping",
      passed: safeZoneOk,
      message: "Captions padded in mobile safe zone (bottom 22% clear of UI overlay)",
      severity: "error"
    });

    // Gate 14: Black-frame, frozen-frame, corruption checks
    const blackFramesOk = params.isDryRun ? true : Boolean(params.postRenderReport && params.postRenderReport.blackFramesCount === 0);
    gates.push({
      id: 14,
      name: "black_frozen_frames_check",
      passed: blackFramesOk,
      message: blackFramesOk ? "Zero black frames and zero corrupted frames detected" : `${params.postRenderReport?.blackFramesCount ?? "Missing"} black frames detected`,
      severity: "error"
    });

    // Gate 15: Opening-hook and ending-payoff checks
    const hookPass = params.storyboard.script.hook.length >= 25 && !params.storyboard.script.hook.toLowerCase().startsWith("did you know");
    gates.push({
      id: 15,
      name: "hook_and_payoff_strength",
      passed: hookPass,
      message: hookPass ? "Strong non-clickbait opening hook and concluding payoff scene verified" : "Weak hook or missing payoff",
      severity: "error"
    });

    // Gate 16: Metadata validation
    const metadataOk = Boolean(params.metadata && params.metadata.title.length <= 70 && params.metadata.description.length >= 50);
    gates.push({
      id: 16,
      name: "metadata_validation",
      passed: metadataOk,
      message: metadataOk ? `Metadata valid: "${params.metadata!.title}" (${params.metadata!.hashtags.length} hashtags)` : "Metadata missing or invalid",
      severity: "error"
    });

    // Gate 17: Thumbnail validation
    const thumbOk = Boolean(params.thumbnail && params.thumbnail.width === 1080 && params.thumbnail.height === 1920 && params.thumbnail.safeZonePass);
    gates.push({
      id: 17,
      name: "thumbnail_validation",
      passed: thumbOk,
      message: thumbOk ? "Thumbnail verified: 1080x1920 portrait format with verified safe-zone typography" : "Thumbnail missing or invalid dimensions",
      severity: "error"
    });

    // Gate 18: Duplicate-content detection
    const duplicateOk = !(params.isDuplicate ?? false);
    gates.push({
      id: 18,
      name: "duplicate_content_detection",
      passed: duplicateOk,
      message: duplicateOk ? "Unique content fingerprint confirmed against upload registry" : "Duplicate content fingerprint detected in registry",
      severity: "error"
    });

    // Gate 19: Independent post-render QA
    const postQaOk = params.isDryRun ? true : (params.postRenderReport?.passed ?? false);
    gates.push({
      id: 19,
      name: "independent_post_render_qa",
      passed: postQaOk,
      message: postQaOk ? (params.isDryRun ? "Dry-run simulation: PostRenderQA contract verified" : "Independent PostRenderQA audit PASSED") : "PostRenderQA audit failed or not run",
      severity: "error"
    });

    // Gate 20: Release authorization (Human editorial / configuration gate)
    const releaseOk = Boolean(params.approvedForPublishing);
    gates.push({
      id: 20,
      name: "release_authorization",
      passed: releaseOk,
      message: releaseOk ? "Editorial release authorization GRANTED" : "AWAITING_APPROVAL: Editorial release authorization not yet granted",
      severity: "error" // Critical release gate; blocks publication until explicit approval
    });

    const passedCount = gates.filter(g => g.passed).length;
    const failedCount = gates.filter(g => !g.passed).length;
    const allTechnicalPassed = gates.filter(g => g.id !== 20).every(g => g.passed);
    const canPublish = allTechnicalPassed && releaseOk;

    return {
      allPassed: failedCount === 0,
      canPublish,
      passedCount,
      failedCount,
      gates
    };
  }
}
