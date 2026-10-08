import type { StoryboardPlan, VoiceSynthesisResult, SyncReport } from "../types.js";

export class SyncAuditor {
  /**
   * Performs an independent, millisecond-level synchronization audit between
   * spoken narration word timestamps and visual storyboard scenes.
   */
  static auditSynchronization(
    storyboard: StoryboardPlan,
    voice: VoiceSynthesisResult
  ): SyncReport {
    const audioDuration = Number(voice.durationSec.toFixed(2));
    const videoDuration = Number(storyboard.totalDurationSec.toFixed(2));
    const holdDuration = Number((storyboard.canonicalTimeline?.endHoldSec ?? 1.0).toFixed(2));
    const durationDelta = Number(Math.abs(videoDuration - (audioDuration + holdDuration)).toFixed(3));

    const violations: string[] = [];

    // 1. Overall timeline delta check (< 0.25s)
    if (durationDelta > 0.25) {
      violations.push(`Overall timeline mismatch: video is ${videoDuration}s, expected voice (${audioDuration}s) + hold (${holdDuration}s) = ${audioDuration + holdDuration}s (delta: ${durationDelta}s)`);
    }

    // 2. Word Monotonicity Check
    let invertedPairsCount = 0;
    for (let i = 0; i < voice.words.length; i++) {
      const w = voice.words[i];
      if (w.start > w.end) {
        violations.push(`Word timestamp inverted for "${w.word}": start (${w.start}s) > end (${w.end}s)`);
        invertedPairsCount++;
      }
      if (i > 0 && w.start < voice.words[i - 1].start) {
        violations.push(`Out of chronological order: "${w.word}" (${w.start}s) starts before previous word "${voice.words[i - 1].word}" (${voice.words[i - 1].start}s)`);
        invertedPairsCount++;
      }
    }

    // 3. Scene Alignment Check
    let currentTimelineCursor = 0;
    const sceneChecks: SyncReport["sceneChecks"] = [];
    let wordCursor = 0;
    const beats = storyboard.script.beats;

    for (let i = 0; i < storyboard.scenes.length; i++) {
      const scene = storyboard.scenes[i];
      const beat = beats[i];
      const plannedStart = currentTimelineCursor;
      const plannedEnd = Number((plannedStart + scene.durationSec).toFixed(2));
      currentTimelineCursor = plannedEnd;

      let sceneWords: typeof voice.words = [];
      if (beat) {
        const beatWordCount = beat.narration
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 0).length;
        sceneWords = voice.words.slice(wordCursor, wordCursor + beatWordCount);
        wordCursor += beatWordCount;
      }

      const firstWord = sceneWords[0] ? { word: sceneWords[0].word, start: sceneWords[0].start } : undefined;
      const lastWord = sceneWords[sceneWords.length - 1] ? { word: sceneWords[sceneWords.length - 1].word, end: sceneWords[sceneWords.length - 1].end } : undefined;

      // Check alignment: scene must comfortably envelope its spoken words within 0.15s tolerance
      let aligned = true;
      let discrepancySec = 0;

      if (firstWord && plannedStart > firstWord.start + 0.15) {
        aligned = false;
        discrepancySec = Number((plannedStart - firstWord.start).toFixed(2));
        violations.push(`Scene ${scene.sceneNumber} (${scene.type}) starts late: word "${firstWord.word}" begins at ${firstWord.start}s but scene starts at ${plannedStart}s`);
      }

      if (lastWord && plannedEnd < lastWord.end - 0.15) {
        aligned = false;
        discrepancySec = Number((lastWord.end - plannedEnd).toFixed(2));
        violations.push(`Scene ${scene.sceneNumber} (${scene.type}) ends early: word "${lastWord.word}" ends at ${lastWord.end}s but scene ends at ${plannedEnd}s`);
      }

      sceneChecks.push({
        sceneNumber: scene.sceneNumber,
        sceneType: scene.type,
        plannedStart,
        plannedEnd,
        duration: scene.durationSec,
        firstWord,
        lastWord,
        aligned,
        discrepancySec
      });
    }

    // 4. Caption Bounds Check
    const captionChecks: SyncReport["captionChecks"] = [];
    for (let idx = 0; idx < voice.words.length; idx += 6) {
      const chunk = voice.words.slice(idx, idx + 6);
      const start = chunk[0].start;
      const end = chunk[chunk.length - 1].end;
      const text = chunk.map(w => w.word).join(" ");
      const inSpeechRange = start >= 0 && end <= audioDuration + 0.5;

      if (!inSpeechRange) {
        violations.push(`Caption chunk "${text}" (${start}s - ${end}s) extends outside audio duration (${audioDuration}s)`);
      }

      captionChecks.push({
        index: idx / 6,
        text,
        start,
        end,
        inSpeechRange
      });
    }

    // 5. Final Payoff Hold Check
    const finalWord = voice.words[voice.words.length - 1];
    if (finalWord) {
      const postSpeechHold = videoDuration - finalWord.end;
      if (postSpeechHold < 0.6) {
        violations.push(`Insufficient payoff hold: video terminates ${postSpeechHold.toFixed(2)}s after last word, risking abrupt cut`);
      }
    }

    return {
      audioDuration,
      videoDuration,
      holdDuration,
      durationDelta,
      sceneChecks,
      captionChecks,
      monotonicityChecks: {
        passed: invertedPairsCount === 0,
        invertedPairsCount
      },
      violations,
      passed: violations.length === 0,
      status: violations.length === 0 ? "PASS" : "FAIL"
    };
  }
}
