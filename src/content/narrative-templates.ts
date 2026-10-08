import type { ScriptBeat, ScriptSpec, TopicItem } from "../types.js";

export type NarrativeStructureType =
  | "HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF"
  | "MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY"
  | "SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT";

export interface NarrativeTemplate {
  id: NarrativeStructureType;
  name: string;
  description: string;
  targetCategory: string;
  generateBeats(topic: TopicItem): ScriptBeat[];
}

export class NarrativeTemplateRegistry {
  /**
   * Template A: Paradox Architecture
   * Hook -> Paradox -> Biological Mechanism -> Neural Implication -> Tribal Payoff
   */
  static readonly PARADOX_TEMPLATE: NarrativeTemplate = {
    id: "HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF",
    name: "Paradox & Biological Mechanism",
    description: "Begins with a sharp cognitive contradiction, explains ancestral survival roots, and resolves with psychological payoff.",
    targetCategory: "brain_science",
    generateBeats(topic: TopicItem): ScriptBeat[] {
      return [
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
    }
  };

  /**
   * Template B: Mystery Architecture
   * Mystery -> Clue -> Scientific Explanation -> Reveal -> Practical Takeaway
   */
  static readonly MYSTERY_TEMPLATE: NarrativeTemplate = {
    id: "MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY",
    name: "Psychological Mystery & Reveal",
    description: "Presents a baffling everyday cognitive glitch, dissects the invisible mechanism, and reveals a practical recovery trick.",
    targetCategory: "memory",
    generateBeats(topic: TopicItem): ScriptBeat[] {
      return [
        {
          beatNumber: 1,
          name: "hook",
          narration: "You walk into the kitchen, freeze in the middle of the room, and completely forget why you came in.",
          estimatedSec: 7.2,
          targetVisual: "hook"
        },
        {
          beatNumber: 2,
          name: "tension",
          narration: "You didn't get distracted. Your brain literally flushed its active memory buffer the second you walked through the door.",
          estimatedSec: 6.8,
          targetVisual: "reaction"
        },
        {
          beatNumber: 3,
          name: "mechanism",
          narration: "Cognitive psychologists call this the Doorway Effect. Physical thresholds act as mental event boundaries, archiving the previous room.",
          estimatedSec: 8.6,
          targetVisual: "diagram"
        },
        {
          beatNumber: 4,
          name: "insight",
          narration: "Your working memory compartmentalizes environments so old sensory data does not overwhelm new spatial survival tasks.",
          estimatedSec: 7.8,
          targetVisual: "mixed"
        },
        {
          beatNumber: 5,
          name: "payoff",
          narration: "To instantly retrieve the lost thought, just look back into the previous doorway. The spatial context immediately reloads the file.",
          estimatedSec: 8.2,
          targetVisual: "payoff"
        }
      ];
    }
  };

  /**
   * Template C: Scenario Architecture
   * Scenario -> Problem -> Hidden Mechanism -> Empirical Surprise -> Actionable Insight
   */
  static readonly SCENARIO_TEMPLATE: NarrativeTemplate = {
    id: "SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT",
    name: "Everyday Scenario & Actionable Insight",
    description: "Sets up an intensely relatable social anxiety scenario, uncovers the egocentric bias, and delivers liberating empirical proof.",
    targetCategory: "social_dynamics",
    generateBeats(topic: TopicItem): ScriptBeat[] {
      return [
        {
          beatNumber: 1,
          name: "hook",
          narration: "You walk into a crowded room with a small stain on your shirt, convinced everyone is judging you.",
          estimatedSec: 7.0,
          targetVisual: "hook"
        },
        {
          beatNumber: 2,
          name: "tension",
          narration: "That suffocating feeling of being under an invisible microscope is real, but the reality is not.",
          estimatedSec: 6.0,
          targetVisual: "reaction"
        },
        {
          beatNumber: 3,
          name: "mechanism",
          narration: "Psychologists call this the Spotlight Effect: we cognitively anchor to our own flaws and assume observers see what we feel.",
          estimatedSec: 8.4,
          targetVisual: "diagram"
        },
        {
          beatNumber: 4,
          name: "insight",
          narration: "When researchers tracked real observers, less than twenty percent even noticed what people were wearing.",
          estimatedSec: 7.2,
          targetVisual: "mixed"
        },
        {
          beatNumber: 5,
          name: "payoff",
          narration: "Nobody is watching you as closely as you think. Everyone else is too busy worrying about their own spotlight.",
          estimatedSec: 8.0,
          targetVisual: "payoff"
        }
      ];
    }
  };

  static getAllTemplates(): NarrativeTemplate[] {
    return [
      NarrativeTemplateRegistry.PARADOX_TEMPLATE,
      NarrativeTemplateRegistry.MYSTERY_TEMPLATE,
      NarrativeTemplateRegistry.SCENARIO_TEMPLATE
    ];
  }

  static selectTemplateForTopic(topic: TopicItem): NarrativeTemplate {
    return NarrativeTemplateRegistry.selectTemplate(topic);
  }

  /**
   * Deterministically select narrative template based on topic metadata and category
   */
  static selectTemplate(topic: TopicItem): NarrativeTemplate {
    if (topic.id === "embarrassing-memories" || topic.category === "brain_science") {
      return NarrativeTemplateRegistry.PARADOX_TEMPLATE;
    }
    if (topic.id === "doorway-effect" || topic.category === "memory") {
      return NarrativeTemplateRegistry.MYSTERY_TEMPLATE;
    }
    if (topic.id === "spotlight-effect" || topic.category === "social_dynamics" || topic.category === "human_behavior") {
      return NarrativeTemplateRegistry.SCENARIO_TEMPLATE;
    }
    return NarrativeTemplateRegistry.PARADOX_TEMPLATE;
  }
}

export const NarrativeArchitecture = {
  HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF: "HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF" as const,
  MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY: "MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY" as const,
  SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT: "SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT" as const
};
