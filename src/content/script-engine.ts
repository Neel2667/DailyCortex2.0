import type { ScriptSpec, ScriptBeat, TopicItem, NarrativeStructure } from "../types.js";
import { NarrativeTemplateRegistry, type NarrativeStructureType } from "./narrative-templates.js";

export class ScriptEngine {
  /**
   * Generates a deterministic, high-retention social script for a given topic
   * using a specific narrative structure adapted to the topic.
   */
  static generateScript(topic: TopicItem, structure?: NarrativeStructure | NarrativeStructureType): ScriptSpec {
    // 1. Structure Selection
    const template = structure
      ? (structure === "MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY" || structure === "MYSTERY_REVEAL"
          ? NarrativeTemplateRegistry.MYSTERY_TEMPLATE
          : structure === "SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT" || structure === "CONTRADICTION_IMPLICATION"
            ? NarrativeTemplateRegistry.SCENARIO_TEMPLATE
            : NarrativeTemplateRegistry.PARADOX_TEMPLATE)
      : NarrativeTemplateRegistry.selectTemplate(topic);

    const beats: ScriptBeat[] = template.generateBeats(topic);
    const fullNarration = beats.map(b => b.narration).join(" ");
    const words = fullNarration.trim().split(/\s+/);
    const wordCount = words.length;
    const estimatedTotalSec = Number(beats.reduce((sum, b) => sum + b.estimatedSec, 0).toFixed(2));
    const wordsPerMinute = Math.round((wordCount / estimatedTotalSec) * 60);

    return {
      title: topic.topic,
      hook: beats[0].narration,
      coreInsight: topic.angle,
      narrativeStructure: template.id as NarrativeStructure,
      beats,
      fullNarration,
      estimatedTotalSec,
      wordCount,
      wordsPerMinute
    };
  }
}
