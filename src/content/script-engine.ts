import type { ScriptSpec, ScriptBeat, TopicItem, NarrativeStructure } from "../types.js";

export class ScriptEngine {
  /**
   * Generates a deterministic, high-retention social script for a given topic
   * using a specific narrative structure adapted to the topic.
   */
  static generateScript(topic: TopicItem, structure?: NarrativeStructure): ScriptSpec {
    // 1. Structure Selection
    let chosenStructure: NarrativeStructure = structure ?? "OBSERVATION_SURPRISE";
    if (!structure) {
      if (topic.id === "embarrassing-memories") {
        chosenStructure = "OBSERVATION_SURPRISE";
      } else if (topic.id === "doorway-effect") {
        chosenStructure = "MYSTERY_REVEAL";
      } else if (topic.id === "spotlight-effect") {
        chosenStructure = "CONTRADICTION_IMPLICATION";
      }
    }

    if (topic.id === "embarrassing-memories") {
      const beats: ScriptBeat[] = [
        {
          beatNumber: 1,
          name: "hook",
          narration: "It is 3 a.m. You are trying to sleep. And suddenly, your brain replays that awkward thing you said five years ago.",
          estimatedSec: 8.5,
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
          estimatedSec: 8.2,
          targetVisual: "diagram"
        },
        {
          beatNumber: 4,
          name: "insight",
          narration: "Your amygdala flags social pain using the same neural pathways as physical injury, tagging the moment with extreme priority.",
          estimatedSec: 9.0,
          targetVisual: "mixed"
        },
        {
          beatNumber: 5,
          name: "payoff",
          narration: "That late-night cringe isn't self-torture. It is an evolutionary update making sure you stay safe in the tribe.",
          estimatedSec: 7.6,
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
        narrativeStructure: chosenStructure,
        beats,
        fullNarration,
        estimatedTotalSec,
        wordCount,
        wordsPerMinute
      };
    }

    // Doorway Effect (Mystery -> Reveal structure)
    if (topic.id === "doorway-effect" || chosenStructure === "MYSTERY_REVEAL") {
      const beats: ScriptBeat[] = [
        {
          beatNumber: 1,
          name: "hook",
          narration: "You walk into the kitchen, stand in the middle of the room, and completely forget why you came in.",
          estimatedSec: 7.0,
          targetVisual: "hook"
        },
        {
          beatNumber: 2,
          name: "tension",
          narration: "You didn't lose focus. Your brain literally reset your memory buffer the moment you crossed the threshold.",
          estimatedSec: 6.5,
          targetVisual: "reaction"
        },
        {
          beatNumber: 3,
          name: "mechanism",
          narration: "Cognitive scientists call this the Doorway Effect. Physical doorways act as mental event boundaries, archiving the previous room.",
          estimatedSec: 8.5,
          targetVisual: "diagram"
        },
        {
          beatNumber: 4,
          name: "payoff",
          narration: "To retrieve the forgotten thought, simply look back into the previous room. The visual context immediately unzips the memory.",
          estimatedSec: 8.0,
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
        narrativeStructure: "MYSTERY_REVEAL",
        beats,
        fullNarration,
        estimatedTotalSec,
        wordCount: words.length,
        wordsPerMinute: Math.round((words.length / estimatedTotalSec) * 60)
      };
    }

    // Default Question -> Mechanism -> Payoff structure
    const beats: ScriptBeat[] = [
      {
        beatNumber: 1,
        name: "hook",
        narration: `There is a hidden biological rule behind ${topic.topic.toLowerCase()}.`,
        estimatedSec: 5.0,
        targetVisual: "hook"
      },
      {
        beatNumber: 2,
        name: "tension",
        narration: topic.angle,
        estimatedSec: 6.5,
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
        narration: "Recognizing this cognitive pattern gives you conscious control over an unconscious survival reflex.",
        estimatedSec: 7.5,
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
      narrativeStructure: chosenStructure,
      beats,
      fullNarration,
      estimatedTotalSec,
      wordCount: words.length,
      wordsPerMinute: Math.round((words.length / estimatedTotalSec) * 60)
    };
  }
}
