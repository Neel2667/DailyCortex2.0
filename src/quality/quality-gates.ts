import type {
  StoryboardPlan,
  VoiceSynthesisResult,
  QualityGateResult,
  ShowtimeProjectFiles
} from "../types.js";
import { FactEngine } from "../content/fact-engine.js";

export class QualityGateEngine {
  /**
   * Runs the full suite of quality gates across content, visuals, audio, captions, and technical specs.
   */
  static runAllGates(
    storyboard: StoryboardPlan,
    voice?: VoiceSynthesisResult,
    projectFiles?: ShowtimeProjectFiles,
    renderedVideoPath?: string
  ): QualityGateResult[] {
    const results: QualityGateResult[] = [];

    // 1. CONTENT QA
    const hook = storyboard.script.hook.toLowerCase();
    const isHookStrong = hook.length >= 25 &&
      !hook.startsWith("did you know") &&
      !hook.startsWith("here is a fact");
    results.push({
      gate: "content",
      check: "hook_strength",
      passed: isHookStrong,
      message: isHookStrong ? "Hook is compelling and avoids generic tropes" : "Hook is too short or uses cliched phrasing",
      severity: "error"
    });

    const wpm = storyboard.script.wordsPerMinute;
    const isPacingGood = wpm >= 120 && wpm <= 170;
    results.push({
      gate: "content",
      check: "pacing_wpm",
      passed: isPacingGood,
      score: wpm,
      message: isPacingGood ? `Pacing is optimal (${wpm} WPM)` : `Pacing of ${wpm} WPM is outside optimal range (120-170)`,
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

    // 3. AUDIO & CAPTION QA
    if (voice) {
      const audioDuration = voice.durationSec;
      const plannedDuration = storyboard.totalDurationSec;
      const durationDelta = Math.abs(audioDuration - plannedDuration);
      const isDurationAligned = durationDelta <= 8.0;

      results.push({
        gate: "audio",
        check: "duration_alignment",
        passed: isDurationAligned,
        score: durationDelta,
        message: isDurationAligned ? `Audio duration (${audioDuration.toFixed(1)}s) closely matches plan (${plannedDuration.toFixed(1)}s)` : `Audio mismatch delta is ${durationDelta.toFixed(1)}s`,
        severity: "warning"
      });

      // Caption timing integrity
      let timingValid = true;
      let timingIssue = "";
      for (let i = 0; i < voice.words.length; i++) {
        const w = voice.words[i];
        if (w.start >= w.end || w.start < 0) {
          timingValid = false;
          timingIssue = `Invalid word timestamps on "${w.word}" (${w.start}s - ${w.end}s)`;
          break;
        }
        if (i > 0 && w.start < voice.words[i - 1].start) {
          timingValid = false;
          timingIssue = `Out-of-order word sequence on "${w.word}"`;
          break;
        }
      }

      results.push({
        gate: "caption",
        check: "caption_timing_integrity",
        passed: timingValid,
        message: timingValid ? `Captions validated (${voice.words.length} timed words)` : timingIssue,
        severity: "error"
      });
    }

    // 4. TECHNICAL QA
    const totalDuration = storyboard.totalDurationSec;
    const isDurationValidShort = totalDuration >= 20 && totalDuration <= 60;
    results.push({
      gate: "technical",
      check: "short_format_duration",
      passed: isDurationValidShort,
      score: totalDuration,
      message: isDurationValidShort ? `Duration ${totalDuration.toFixed(1)}s fits YouTube Shorts specifications` : `Duration ${totalDuration.toFixed(1)}s is outside Shorts bounds (20-60s)`,
      severity: "error"
    });

    // 5. PRODUCTION QA
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
