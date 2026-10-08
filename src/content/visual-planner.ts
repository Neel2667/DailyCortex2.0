import type { ScriptSpec, ScenePlan, StoryboardPlan, TopicItem } from "../types.js";

export class VisualPlanner {
  /**
   * Plans a high-retention visual storyboard from a script specification.
   * Dynamically adapts visual strategies (data visualization, UI metaphor, diagram,
   * scientific visualization, human behavior, payoff card) to the specific topic.
   */
  static planStoryboard(topic: TopicItem, script: ScriptSpec): StoryboardPlan {
    const isEmbarrassing = topic.id === "embarrassing-memories";
    const isDoorway = topic.id === "doorway-effect";
    const isSpotlight = topic.id === "spotlight-effect";
    const isZeigarnik = topic.id === "zeigarnik-effect";

    const scenes: ScenePlan[] = script.beats.map((beat, idx) => {
      const sceneId = `scene-${idx + 1}`;
      const duration = beat.estimatedSec;

      if (isEmbarrassing) {
        return VisualPlanner.planEmbarrassingScene(beat, idx, sceneId, duration);
      } else if (isDoorway) {
        return VisualPlanner.planDoorwayScene(beat, idx, sceneId, duration);
      } else if (isSpotlight) {
        return VisualPlanner.planSpotlightScene(beat, idx, sceneId, duration);
      } else if (isZeigarnik) {
        return VisualPlanner.planZeigarnikScene(beat, idx, sceneId, duration);
      } else {
        return VisualPlanner.planDefaultScene(beat, idx, sceneId, duration, topic);
      }
    });

    const totalDurationSec = Number(scenes.reduce((sum, s) => sum + s.durationSec, 0).toFixed(2));

    let soundtrackStyle: "minimal-pulse" | "synthwave" | "lofi-chill" | "cinematic-ambient" = "minimal-pulse";
    let soundtrackBpm = 96;

    if (topic.id === "doorway-effect" || topic.category === "memory") {
      soundtrackStyle = "cinematic-ambient";
      soundtrackBpm = 88;
    } else if (topic.id === "spotlight-effect" || topic.category === "social_dynamics") {
      soundtrackStyle = "synthwave";
      soundtrackBpm = 104;
    } else if (topic.id === "zeigarnik-effect" || topic.category === "psychology") {
      soundtrackStyle = "lofi-chill";
      soundtrackBpm = 92;
    }

    return {
      topic,
      script,
      scenes,
      totalDurationSec,
      soundtrack: {
        style: soundtrackStyle,
        bpm: soundtrackBpm,
        duckingDb: 14
      }
    };
  }

  private static planEmbarrassingScene(beat: any, idx: number, sceneId: string, duration: number): ScenePlan {
    switch (beat.name) {
      case "hook":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "hook",
          visualStrategy: "ui_metaphor",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Night bedroom atmosphere, digital clock displaying 3:00 AM, sudden alert eyes opening",
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
          visualStrategy: "data_visualization",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Comparison between fleeting factual memories and persistent cringe memories",
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
            accentColor: "#38BDF8",
            dataComparison: {
              itemA: { label: "School Facts", value: "Fades away", percentage: 35 },
              itemB: { label: "Awkward Moment", value: "Permanently Stuck", percentage: 95, highlight: true }
            }
          }
        };
      case "mechanism":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "diagram",
          visualStrategy: "diagram_animation",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Threat matrix showing ancestral survival chain: Social error to tribal exile to danger",
          assetQuery: "neural network brain pulses animation",
          mood: "neural_threat_matrix",
          onScreenText: "ANCESTRAL THREAT CIRCUIT",
          motion: "split-reveal",
          transition: "push up 0.4",
          soundCues: ["whoosh", "ding"],
          cardLayout: {
            headline: "SOCIAL = PHYSICAL PAIN",
            badge: "ANCESTRAL BLUEPRINT",
            subtext: "To primitive biology: Isolation was fatal.",
            accentColor: "#F59E0B",
            diagramSteps: [
              { title: "Social Error", icon: "alert" },
              { title: "Tribal Exile", icon: "warning" },
              { title: "Mortal Danger", icon: "critical" }
            ]
          }
        };
      case "insight":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "mixed",
          visualStrategy: "scientific_visualization",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "fMRI neuro-scan monitor highlighting dorsal anterior cingulate cortex and amygdala",
          assetQuery: "brain scan fMRI scientific visualization",
          mood: "fmri_scan_clinical",
          onScreenText: "AMYGDALA PRIORITY TAG",
          motion: "focus-zoom",
          transition: "crossfade 0.3",
          soundCues: ["pop", "thock"],
          cardLayout: {
            headline: "AMYGDALA OVERRIDE",
            badge: "NEURAL SCAN",
            subtext: "Emotion coats the memory in high-priority varnish.",
            accentColor: "#10B981",
            metricsList: [
              { label: "Brain Region", value: "Dorsal ACC + Amygdala" },
              { label: "Priority Flag", value: "CRITICAL OVERRIDE", alert: true },
              { label: "Instruction", value: "Never Repeat Mistake" }
            ]
          }
        };
      case "payoff":
      default:
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "payoff",
          visualStrategy: "payoff_card",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Person looking relaxed and relieved under calm evening twilight",
          assetQuery: "person smiling peaceful evening city sunset",
          mood: "sunset_relief_peace",
          onScreenText: "SURVIVAL PROGRAM, NOT PUNISHMENT",
          motion: "kinetic-pop",
          transition: "sdf-iris 0.6",
          soundCues: ["success", "chime"],
          cardLayout: {
            headline: "SURVIVAL, NOT PUNISHMENT",
            badge: "DAILY CORTEX",
            subtext: "Your brain is protecting your belonging.",
            accentColor: "#8B5CF6"
          }
        };
    }
  }

  private static planDoorwayScene(beat: any, idx: number, sceneId: string, duration: number): ScenePlan {
    switch (beat.name) {
      case "hook":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "hook",
          visualStrategy: "human_behavior",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "First person perspective walking into a modern kitchen, pausing in the center with confusion",
          assetQuery: "person entering kitchen modern house",
          mood: "ambient_cafe",
          onScreenText: "THE DOORWAY WIPE",
          motion: "kinetic-pop",
          transition: "push up 0.4",
          soundCues: ["thock", "whoosh"],
          cardLayout: {
            headline: "THE DOORWAY WIPE",
            badge: "WORKING MEMORY",
            subtext: "Why did you just walk in here?",
            accentColor: "#38BDF8"
          }
        };
      case "tension":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "reaction",
          visualStrategy: "ui_metaphor",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "HUD graphic showing working memory cache clearing as user steps over door frame",
          assetQuery: "minimalist interior doorway architectural frame",
          mood: "neural_threat_matrix",
          onScreenText: "EVENT BOUNDARY DETECTED",
          motion: "rise",
          transition: "sdf-iris 0.5",
          soundCues: ["paper-swipe", "pop"],
          cardLayout: {
            headline: "BUFFER FLUSHED",
            badge: "EVENT BOUNDARY",
            subtext: "New threshold crossed. Old context purged.",
            accentColor: "#F59E0B",
            dataComparison: {
              itemA: { label: "Previous Room Cache", value: "Purged (0%)", percentage: 5 },
              itemB: { label: "New Space Sensor Feed", value: "Active (100%)", percentage: 95, highlight: true }
            }
          }
        };
      case "mechanism":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "diagram",
          visualStrategy: "diagram_animation",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Cognitive compartmentalization diagram: Room A thoughts archived into background stack",
          assetQuery: "clean abstract geometry transition shapes",
          mood: "dark_night_bedroom",
          onScreenText: "SPATIAL EVENT BOUNDARIES",
          motion: "split-reveal",
          transition: "push up 0.4",
          soundCues: ["whoosh", "ding"],
          cardLayout: {
            headline: "CHAPTER BREAKS",
            badge: "COGNITIVE COMPARTMENTS",
            subtext: "Physical doorways signal a new mental episode.",
            accentColor: "#8B5CF6",
            diagramSteps: [
              { title: "Room A Intent", icon: "alert" },
              { title: "Physical Threshold", icon: "warning" },
              { title: "Mental Archive", icon: "critical" }
            ]
          }
        };
      case "insight":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "mixed",
          visualStrategy: "scientific_visualization",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Mental model architecture showing resource allocation preventing sensory overload",
          assetQuery: "scientific laboratory high tech visualization",
          mood: "fmri_scan_clinical",
          onScreenText: "WORKING MEMORY HYGIENE",
          motion: "focus-zoom",
          transition: "crossfade 0.3",
          soundCues: ["pop", "thock"],
          cardLayout: {
            headline: "OVERLOAD PROTECTION",
            badge: "NEURAL EFFICIENCY",
            subtext: "Flushing irrelevant data keeps attention agile.",
            accentColor: "#10B981",
            metricsList: [
              { label: "Working Memory Capacity", value: "4-7 Chunks Max" },
              { label: "Spatial Shift Policy", value: "PURGE ON TRANSITION", alert: true },
              { label: "Survival Utility", value: "Assess New Threat" }
            ]
          }
        };
      case "payoff":
      default:
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "payoff",
          visualStrategy: "payoff_card",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Person looking back through doorframe with sudden realization and smile",
          assetQuery: "bright airy modern living room sunlit morning",
          mood: "sunset_relief_peace",
          onScreenText: "LOOK BACK TO UNZIP",
          motion: "kinetic-pop",
          transition: "sdf-iris 0.6",
          soundCues: ["success", "chime"],
          cardLayout: {
            headline: "LOOK BACK TO UNZIP",
            badge: "DAILY CORTEX",
            subtext: "Spatial cues immediately reload the forgotten thought.",
            accentColor: "#38BDF8"
          }
        };
    }
  }

  private static planSpotlightScene(beat: any, idx: number, sceneId: string, duration: number): ScenePlan {
    switch (beat.name) {
      case "hook":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "hook",
          visualStrategy: "human_behavior",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Person walking into crowded auditorium feeling like an intense glowing spotlight is following them",
          assetQuery: "crowded party event people chatting indoor",
          mood: "dark_night_bedroom",
          onScreenText: "THE INVISIBLE SPOTLIGHT",
          motion: "kinetic-pop",
          transition: "push up 0.4",
          soundCues: ["thock", "whoosh"],
          cardLayout: {
            headline: "THE SPOTLIGHT ILLUSION",
            badge: "SOCIAL HYPER-AWARENESS",
            subtext: "Convinced everyone is watching your flaw.",
            accentColor: "#F43F5E"
          }
        };
      case "tension":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "reaction",
          visualStrategy: "data_visualization",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Split graphic showing intense internal anxiety vs indifferent bystanders on their phones",
          assetQuery: "people sitting in subway coffee shop on phones",
          mood: "ambient_cafe",
          onScreenText: "PERCEPTION vs REALITY",
          motion: "rise",
          transition: "sdf-iris 0.5",
          soundCues: ["paper-swipe", "pop"],
          cardLayout: {
            headline: "THE PERCEPTION GAP",
            badge: "EGOCENTRIC BIAS",
            subtext: "What we feel vs what others actually notice.",
            accentColor: "#38BDF8",
            dataComparison: {
              itemA: { label: "Estimated Attention", value: "85% Watching", percentage: 85, highlight: true },
              itemB: { label: "Actual Attention", value: "< 20% Noticed", percentage: 18 }
            }
          }
        };
      case "mechanism":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "diagram",
          visualStrategy: "diagram_animation",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Diagram showing egocentric cognitive anchoring: We anchor to our feelings and fail to adjust",
          assetQuery: "abstract visual representation of focus spotlight",
          mood: "neural_threat_matrix",
          onScreenText: "EGOCENTRIC ANCHORING",
          motion: "split-reveal",
          transition: "push up 0.4",
          soundCues: ["whoosh", "ding"],
          cardLayout: {
            headline: "COGNITIVE ANCHOR",
            badge: "ANCHOR & ADJUST",
            subtext: "We confuse internal sensation with external reality.",
            accentColor: "#F59E0B",
            diagramSteps: [
              { title: "Self Awareness", icon: "alert" },
              { title: "Projected Attention", icon: "warning" },
              { title: "Imagined Judgement", icon: "critical" }
            ]
          }
        };
      case "insight":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "mixed",
          visualStrategy: "scientific_visualization",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Cornell University study chart: Barry Manilow t-shirt experiment proving massive overestimation",
          assetQuery: "university campus research students walking",
          mood: "fmri_scan_clinical",
          onScreenText: "CORNELL EXPERIMENT",
          motion: "focus-zoom",
          transition: "crossfade 0.3",
          soundCues: ["pop", "thock"],
          cardLayout: {
            headline: "CORNELL STUDY DATA",
            badge: "GILOVICH ET AL.",
            subtext: "Less than 20% of participants could identify the shirt.",
            accentColor: "#10B981",
            metricsList: [
              { label: "Target Shirt", value: "Embarrassing Print" },
              { label: "Predicted Notice", value: "50% of Room" },
              { label: "Actual Notice", value: "23% Actual Notice", alert: true }
            ]
          }
        };
      case "payoff":
      default:
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "payoff",
          visualStrategy: "payoff_card",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Person walking confidently through busy street, free from social anxiety, warm golden hour sun",
          assetQuery: "confident person walking city street sunset smiling",
          mood: "sunset_relief_peace",
          onScreenText: "NOBODY IS WATCHING",
          motion: "kinetic-pop",
          transition: "sdf-iris 0.6",
          soundCues: ["success", "chime"],
          cardLayout: {
            headline: "YOU ARE INVISIBLE",
            badge: "DAILY CORTEX",
            subtext: "Everyone is busy worrying about their own spotlight.",
            accentColor: "#8B5CF6"
          }
        };
    }
  }

  private static planZeigarnikScene(beat: any, idx: number, sceneId: string, duration: number): ScenePlan {
    switch (beat.name) {
      case "hook":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "hook",
          visualStrategy: "ui_metaphor",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Smartphone screen glowing in darkness with 1 unread notification badge pulsing red",
          assetQuery: "smartphone screen notification alert dark desk",
          mood: "neural_threat_matrix",
          onScreenText: "1 UNFINISHED TASK",
          motion: "kinetic-pop",
          transition: "push up 0.4",
          soundCues: ["pop", "thock"],
          cardLayout: {
            headline: "OPEN COGNITIVE LOOP",
            badge: "NOTIFICATION RADAR",
            subtext: "Why does that one unsent email haunt you?",
            accentColor: "#EF4444"
          }
        };
      case "tension":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "reaction",
          visualStrategy: "data_visualization",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Comparison meter: 20 completed checklist tasks grayed out vs 1 unfinished task blazing orange",
          assetQuery: "checklist task manager productivity interface glowing",
          mood: "ambient_cafe",
          onScreenText: "ASYMMETRIC RECALL",
          motion: "rise",
          transition: "sdf-iris 0.5",
          soundCues: ["paper-swipe", "ding"],
          cardLayout: {
            headline: "THE 90% RECALL GAP",
            badge: "SELECTIVE OBSESSION",
            subtext: "Your brain ignores what is done and fixates on what remains.",
            accentColor: "#F59E0B",
            dataComparison: {
              itemA: { label: "20 Finished Tasks", value: "Archived (10%)", percentage: 10 },
              itemB: { label: "1 Open Loop", value: "Active Alert (90%)", percentage: 90, highlight: true }
            }
          }
        };
      case "mechanism":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "diagram",
          visualStrategy: "diagram_animation",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Gestalt psychology diagram: incomplete circle seeking closure with arrows of mental tension",
          assetQuery: "gestalt closure diagram psychology abstract geometric tension",
          mood: "fmri_scan_clinical",
          onScreenText: "QUASI-NEED TENSION",
          motion: "split-reveal",
          transition: "push up 0.4",
          soundCues: ["whoosh", "pop"],
          cardLayout: {
            headline: "GESTALT CLOSURE",
            badge: "BLUMA ZEIGARNIK (1927)",
            subtext: "Unfinished goals create an active psychological tension field.",
            accentColor: "#8B5CF6",
            diagramSteps: [
              { title: "Task Initiated", icon: "alert" },
              { title: "Interruption / Delay", icon: "warning" },
              { title: "Working Memory Lock", icon: "critical" }
            ]
          }
        };
      case "insight":
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "mixed",
          visualStrategy: "scientific_visualization",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Human brain prefrontal cortex maintaining active RAM buffer of open threads",
          assetQuery: "neural network glowing connections memory buffer",
          mood: "fmri_scan_clinical",
          onScreenText: "BUFFER RETENTION",
          motion: "focus-zoom",
          transition: "crossfade 0.3",
          soundCues: ["thock", "ding"],
          cardLayout: {
            headline: "COGNITIVE LEAK",
            badge: "WORKING MEMORY RAM",
            subtext: "Every open loop drains active processing bandwidth.",
            accentColor: "#06B6D4",
            metricsList: [
              { label: "Working Memory Drain", value: "High Latency" },
              { label: "Task Status", value: "Unresolved Threat" },
              { label: "Solution", value: "Offload Context", alert: true }
            ]
          }
        };
      case "payoff":
      default:
        return {
          id: sceneId,
          sceneNumber: idx + 1,
          type: "payoff",
          visualStrategy: "payoff_card",
          durationSec: duration,
          narrationText: beat.narration,
          visualPrompt: "Clean pen writing down specific next step on notebook, immediate sigh of relief and calm lighting",
          assetQuery: "hand writing pen notebook calm minimalist desk warm lighting",
          mood: "sunset_relief_peace",
          onScreenText: "WRITE IT DOWN",
          motion: "kinetic-pop",
          transition: "sdf-iris 0.6",
          soundCues: ["success", "chime"],
          cardLayout: {
            headline: "CLOSE THE LOOP",
            badge: "DAILY CORTEX",
            subtext: "Write down the next action. Your brain lets go immediately.",
            accentColor: "#10B981"
          }
        };
    }
  }

  private static planDefaultScene(beat: any, idx: number, sceneId: string, duration: number, topic: TopicItem): ScenePlan {
    return {
      id: sceneId,
      sceneNumber: idx + 1,
      type: beat.targetVisual ?? "mixed",
      visualStrategy: "kinetic_typography",
      durationSec: duration,
      narrationText: beat.narration,
      visualPrompt: `Visual scene illustrating ${topic.topic}`,
      assetQuery: topic.tags[0] ?? "abstract brain science",
      mood: "ambient_cafe",
      onScreenText: beat.name.toUpperCase(),
      motion: "rise",
      transition: "push up 0.4",
      soundCues: ["pop"],
      cardLayout: {
        headline: topic.topic,
        badge: "DAILY CORTEX",
        subtext: beat.narration.slice(0, 50) + "...",
        accentColor: "#38BDF8"
      }
    };
  }
}
