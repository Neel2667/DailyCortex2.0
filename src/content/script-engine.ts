import type { ScriptSpec, ScriptBeat, TopicItem } from "../types.js";

export class ScriptEngine {
  /**
   * Generates a deterministic, high-retention social script for a given topic.
   * If an LLM is available, it can be passed in; otherwise it builds a schema-compliant script.
   */
  static generateScript(topic: TopicItem): ScriptSpec {
    if (topic.id === "embarrassing-memories") {
      const beats: ScriptBeat[] = [
        {
          beatNumber: 1,
          name: "hook",
          narration: "It is 3 a.m. You are trying to sleep. And suddenly, your brain replays that awkward thing you said five years ago.",
          estimatedSec: 6.5,
          targetVisual: "hook"
        },
        {
          beatNumber: 2,
          name: "tension",
          narration: "Why does your memory hold onto a harmless slip-up while forgetting what you studied yesterday?",
          estimatedSec: 5.5,
          targetVisual: "reaction"
        },
        {
          beatNumber: 3,
          name: "mechanism",
          narration: "Because to your ancestral brain, social mistakes were never harmless. Rejection meant exile, and exile meant danger.",
          estimatedSec: 7.0,
          targetVisual: "diagram"
        },
        {
          beatNumber: 4,
          name: "insight",
          narration: "Your amygdala flags social pain using the same neural pathways as physical injury, tagging the moment with extreme priority.",
          estimatedSec: 7.5,
          targetVisual: "mixed"
        },
        {
          beatNumber: 5,
          name: "payoff",
          narration: "That late-night cringe isn't self-torture. It is an evolutionary update making sure you stay safe in the tribe.",
          estimatedSec: 7.0,
          targetVisual: "payoff"
        }
      ];

      const fullNarration = beats.map(b => b.narration).join(" ");
      const words = fullNarration.trim().split(/\s+/);
      const wordCount = words.length;
      const estimatedTotalSec = beats.reduce((sum, b) => sum + b.estimatedSec, 0);
      const wordsPerMinute = Math.round((wordCount / estimatedTotalSec) * 60);

      return {
        title: "Why Embarrassing Memories Never Fade",
        hook: beats[0].narration,
        coreInsight: "The brain processes social cringe through threat circuitry to protect evolutionary belonging.",
        beats,
        fullNarration,
        estimatedTotalSec,
        wordCount,
        wordsPerMinute
      };
    }

    // Default template generator for other topics
    const beats: ScriptBeat[] = [
      {
        beatNumber: 1,
        name: "hook",
        narration: `There is a strange reason behind ${topic.topic.toLowerCase()}.`,
        estimatedSec: 4.0,
        targetVisual: "hook"
      },
      {
        beatNumber: 2,
        name: "tension",
        narration: topic.angle,
        estimatedSec: 6.0,
        targetVisual: "reaction"
      },
      {
        beatNumber: 3,
        name: "mechanism",
        narration: topic.claims[0]?.claim ?? "The brain prioritizes patterns that safeguard perception.",
        estimatedSec: 8.0,
        targetVisual: "diagram"
      },
      {
        beatNumber: 4,
        name: "payoff",
        narration: "Understanding this cognitive quirk changes how you interpret your daily reactions.",
        estimatedSec: 6.0,
        targetVisual: "payoff"
      }
    ];

    const fullNarration = beats.map(b => b.narration).join(" ");
    const words = fullNarration.trim().split(/\s+/);
    const estimatedTotalSec = beats.reduce((sum, b) => sum + b.estimatedSec, 0);

    return {
      title: topic.topic,
      hook: beats[0].narration,
      coreInsight: topic.angle,
      beats,
      fullNarration,
      estimatedTotalSec,
      wordCount: words.length,
      wordsPerMinute: Math.round((words.length / estimatedTotalSec) * 60)
    };
  }
}
