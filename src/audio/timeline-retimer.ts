import type { StoryboardPlan, VoiceSynthesisResult, TimedWord, ScenePlan } from "../types.js";

export interface RetimedScene extends ScenePlan {
  spokenStartSec: number;
  spokenEndSec: number;
}

export class TimelineRetimer {
  /**
   * Retimes all scenes in a storyboard to strictly match the canonical spoken narration timestamps.
   * Eliminates dead air, audio spillover, and timing mismatches.
   */
  static retimeStoryboard(
    storyboard: StoryboardPlan,
    voiceResult: VoiceSynthesisResult,
    endHoldSec = 1.0
  ): StoryboardPlan {
    const timedWords = voiceResult.words;
    if (!timedWords || timedWords.length === 0) {
      return storyboard;
    }

    const beats = storyboard.script.beats;
    let wordCursor = 0;
    const beatBoundaries: Array<{ startSec: number; endSec: number }> = [];

    for (let bIndex = 0; bIndex < beats.length; bIndex++) {
      const beat = beats[bIndex];
      const beatWords = beat.narration
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0);

      const startIndex = wordCursor;
      let matchedCount = 0;
      let endIndex = wordCursor;

      while (wordCursor < timedWords.length && matchedCount < beatWords.length) {
        matchedCount++;
        endIndex = wordCursor;
        wordCursor++;
      }

      const startSec = bIndex === 0
        ? 0.0
        : (timedWords[startIndex]?.start ?? beatBoundaries[bIndex - 1]?.endSec ?? 0.0);
      const endSec = timedWords[endIndex]?.end ?? (startSec + beat.estimatedSec);

      beatBoundaries.push({
        startSec: Number(startSec.toFixed(2)),
        endSec: Number(endSec.toFixed(2))
      });
    }

    // Now retime each corresponding scene
    const retimedScenes: ScenePlan[] = storyboard.scenes.map((scene, idx) => {
      const boundary = beatBoundaries[idx] ?? {
        startSec: idx === 0 ? 0 : 5 * idx,
        endSec: 5 * (idx + 1)
      };
      const nextBoundary = beatBoundaries[idx + 1];

      let sceneDuration: number;
      if (nextBoundary) {
        // Scene lasts until the next spoken beat begins
        sceneDuration = Number((nextBoundary.startSec - boundary.startSec).toFixed(2));
      } else {
        // Final scene covers remainder of voice + visual end hold
        const remainingVoice = Math.max(0, voiceResult.durationSec - boundary.startSec);
        sceneDuration = Number((remainingVoice + endHoldSec).toFixed(2));
      }

      // Ensure scene has positive duration
      sceneDuration = Math.max(2.0, sceneDuration);

      return {
        ...scene,
        durationSec: sceneDuration
      };
    });

    const totalRetimedDuration = Number(
      retimedScenes.reduce((sum, s) => sum + s.durationSec, 0).toFixed(2)
    );

    return {
      ...storyboard,
      scenes: retimedScenes,
      totalDurationSec: totalRetimedDuration,
      canonicalTimeline: {
        narrationDurationSec: voiceResult.durationSec,
        endHoldSec,
        totalDurationSec: totalRetimedDuration,
        retimed: true
      }
    };
  }
}
