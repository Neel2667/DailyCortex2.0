import type { ScriptSpec, ScenePlan, StoryboardPlan, TopicItem } from "../types.js";

export class VisualPlanner {
  /**
   * Plans a high-retention visual storyboard from a script specification.
   * Ensures diverse scene types (hook, reaction, diagram, footage, typography, mixed, payoff)
   * with explicit mood tokens for background media generation.
   */
  static planStoryboard(topic: TopicItem, script: ScriptSpec): StoryboardPlan {
    const scenes: ScenePlan[] = script.beats.map((beat, idx) => {
      const sceneId = `scene-${idx + 1}`;
      const duration = beat.estimatedSec;

      switch (beat.name) {
        case "hook":
          return {
            id: sceneId,
            sceneNumber: idx + 1,
            type: "hook",
            durationSec: duration,
            narrationText: beat.narration,
            visualPrompt: "Night bedroom atmosphere, clock displaying 3:00 AM, sudden alert eyes opening with emotional shock",
            assetQuery: "person waking up bedroom night",
            mood: "dark_night_bedroom",
            onScreenText: "3:00 AM BRAIN LOOP",
            motion: "kinetic-pop",
            transition: "push up 0.4",
            soundCues: ["thock", "whoosh"],
            cardLayout: {
              headline: "3:00 AM BRAIN LOOP",
              badge: "MEMORY REPLAY",
              subtext: "Why does cringe keep you awake?",
              accentColor: "#F43F5E"
            }
          };

        case "tension":
          return {
            id: sceneId,
            sceneNumber: idx + 1,
            type: "reaction",
            durationSec: duration,
            narrationText: beat.narration,
            visualPrompt: "Cinematic close-up of a person cringing at an awkward social interaction in a busy cafe",
            assetQuery: "person feeling awkward social group",
            mood: "ambient_cafe",
            onScreenText: "HARMLESS SLIP vs DEEP MEMORY",
            motion: "rise",
            transition: "sdf-iris 0.5",
            soundCues: ["paper-swipe", "pop"],
            cardLayout: {
              headline: "THE PARADOX",
              badge: "SELECTIVE STORAGE",
              subtext: "Textbook facts fade. Cringe stays sharp.",
              accentColor: "#38BDF8"
            }
          };

        case "mechanism":
          return {
            id: sceneId,
            sceneNumber: idx + 1,
            type: "diagram",
            durationSec: duration,
            narrationText: beat.narration,
            visualPrompt: "Stylized neuro-biological diagram showing Amygdala threat circuit firing with high-voltage memory tagging",
            assetQuery: "neural network brain pulses animation",
            mood: "neural_threat_matrix",
            onScreenText: "ANCESTRAL THREAT CIRCUIT",
            motion: "split-reveal",
            transition: "push up 0.4",
            soundCues: ["whoosh", "ding"],
            cardLayout: {
              headline: "SOCIAL = PHYSICAL PAIN",
              badge: "ANCESTRAL BLUEPRINT",
              subtext: "Ostracism = Tribal Exile = Danger",
              accentColor: "#F59E0B"
            }
          };

        case "insight":
          return {
            id: sceneId,
            sceneNumber: idx + 1,
            type: "mixed",
            durationSec: duration,
            narrationText: beat.narration,
            visualPrompt: "Split screen of fMRI dorsal anterior cingulate cortex scan alongside person processing a memory",
            assetQuery: "brain scan fMRI scientific visualization",
            mood: "fmri_scan_clinical",
            onScreenText: "AMYGDALA PRIORITY TAG",
            motion: "focus-zoom",
            transition: "crossfade 0.3",
            soundCues: ["pop", "thock"],
            cardLayout: {
              headline: "AMYGDALA OVERRIDE",
              badge: "NEURAL SCAN",
              subtext: "Flagged: DO NOT REPEAT",
              accentColor: "#10B981"
            }
          };

        case "payoff":
        default:
          return {
            id: sceneId,
            sceneNumber: idx + 1,
            type: "payoff",
            durationSec: duration,
            narrationText: beat.narration,
            visualPrompt: "Person feeling calm and relieved, looking up with clarity as glowing neural nodes settle into coherence",
            assetQuery: "person smiling peaceful evening city sunset",
            mood: "sunset_relief_peace",
            onScreenText: "SURVIVAL PROGRAM, NOT PUNISHMENT",
            motion: "kinetic-pop",
            transition: "sdf-iris 0.6",
            soundCues: ["success", "chime", "logo-sting"],
            cardLayout: {
              headline: "SURVIVAL, NOT PUNISHMENT",
              badge: "DAILY CORTEX",
              subtext: "Your brain is protecting your belonging.",
              accentColor: "#8B5CF6"
            }
          };
      }
    });

    const totalDurationSec = scenes.reduce((sum, s) => sum + s.durationSec, 0);

    return {
      topic,
      script,
      scenes,
      totalDurationSec,
      soundtrack: {
        style: "minimal-pulse",
        bpm: 96,
        duckingDb: 14
      }
    };
  }
}
