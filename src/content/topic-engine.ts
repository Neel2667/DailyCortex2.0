import type { TopicItem } from "../types.js";

export const CURATED_TOPICS: TopicItem[] = [
  {
    id: "embarrassing-memories",
    topic: "Why Embarrassing Memories Never Fade",
    category: "brain_science",
    angle: "Your brain does not replay cringe moments to punish you — it treats social survival like physical danger.",
    noveltyScore: 8.5,
    curiosityScore: 9.5,
    visualPotential: 9.0,
    targetDurationSec: 36,
    tags: ["psychology", "neuroscience", "cringe", "memory", "evolution"],
    claims: [
      {
        id: "c1",
        claim: "The amygdala tags emotionally intense events with high neurochemical priority during memory encoding.",
        category: "VERIFIED_FACT",
        source: "Cahill & McGaugh, 1998",
        sourceTitle: "Mechanisms of emotional memory",
        sourceUrl: "https://doi.org/10.1016/S0166-2236(97)01214-9",
        excerpt: "The amygdala coordinates neurohormonal systems to prioritize retention of emotionally arousing experiences.",
        publicationDate: "1998",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.95
      },
      {
        id: "c2",
        claim: "Social rejection activates dorsal anterior cingulate cortex pain pathways similar to physical injury.",
        category: "VERIFIED_FACT",
        source: "Eisenberger et al., 2003",
        sourceTitle: "Science: Does rejection hurt? An fMRI study of social exclusion",
        sourceUrl: "https://www.science.org/doi/10.1126/science.1089134",
        excerpt: "Social exclusion elicited activation in the dACC, closely correlating with self-reported distress.",
        publicationDate: "2003-10-10",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.92
      },
      {
        id: "c3",
        claim: "Evolutionary fitness in ancestral human groups depended directly on tribal acceptance, making social mistakes life-threatening.",
        category: "INTERPRETATION",
        source: "Baumeister & Leary, 1995",
        sourceTitle: "The Need to Belong: Desire for interpersonal attachments as a fundamental human motivation",
        sourceUrl: "https://doi.org/10.1037/0033-2909.117.3.497",
        publicationDate: "1995",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.88,
        qualification: "Evolutionary anthropology perspective supported by fossil and hunter-gatherer group dynamics."
      },
      {
        id: "c4",
        claim: "The involuntary intrusive replay of cringe moments is a proactive predictive error-correction loop, not an intentional self-punishment.",
        category: "INTERPRETATION",
        source: "Friston, 2010",
        sourceTitle: "The free-energy principle: a unified brain theory?",
        sourceUrl: "https://doi.org/10.1038/nrn2787",
        publicationDate: "2010",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.85,
        qualification: "Computational neuroscience framework interpreting intrusive cognitive replays as predictive minimization."
      }
    ]
  },
  {
    id: "doorway-effect",
    topic: "The Doorway Effect: Why You Forget What You Came For",
    category: "memory",
    angle: "Walking through a doorway causes the brain to purge mental working memory as an event boundary.",
    noveltyScore: 7.8,
    curiosityScore: 8.8,
    visualPotential: 8.5,
    targetDurationSec: 37,
    tags: ["memory", "psychology", "focus", "daily-science"],
    claims: [
      {
        id: "de1",
        claim: "Passing through physical doorways creates cognitive event boundaries in working memory.",
        category: "VERIFIED_FACT",
        source: "Radvansky et al., 2011",
        sourceTitle: "Walking through doorways causes forgetting: The event boundary effect",
        sourceUrl: "https://doi.org/10.1080/17470218.2011.571267",
        excerpt: "Walking through doorways diminishes memory for items previously encountered across multiple experiments.",
        publicationDate: "2011",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.94
      },
      {
        id: "de2",
        claim: "Working memory updates mental models when environmental context shifts across a physical threshold.",
        category: "VERIFIED_FACT",
        source: "Zacks et al., 2007",
        sourceTitle: "Event perception: a mind-brain perspective",
        sourceUrl: "https://doi.org/10.1037/0033-2909.133.2.273",
        publicationDate: "2007",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.91
      },
      {
        id: "de3",
        claim: "Looking back at the previous room restores perceptual context cues that assist memory retrieval.",
        category: "INTERPRETATION",
        source: "Smith & Vela, 2001",
        sourceTitle: "Environmental context-dependent memory: a review and meta-analysis",
        sourceUrl: "https://doi.org/10.3758/BF03196157",
        publicationDate: "2001",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.87,
        qualification: "Context-dependent memory recovery applies across perceptual reinstated states."
      },
      {
        id: "de4",
        claim: "Event segmentation functions as a cognitive strategy to prevent sensory overload across distinct spaces.",
        category: "INTERPRETATION",
        source: "Kurby & Zacks, 2008",
        sourceTitle: "Segmentation in the perception and memory of events",
        sourceUrl: "https://doi.org/10.1016/j.tics.2007.11.004",
        publicationDate: "2008",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.85,
        qualification: "Adaptive heuristic hypothesis supported by event segmentation theory."
      }
    ]
  },
  {
    id: "spotlight-effect",
    topic: "The Spotlight Effect: Nobody Noticed What You Did",
    category: "social_dynamics",
    angle: "We overestimate how much others notice our flaws by roughly double due to egocentric cognitive anchoring.",
    noveltyScore: 8.0,
    curiosityScore: 9.0,
    visualPotential: 8.7,
    targetDurationSec: 36,
    tags: ["social", "psychology", "anxiety", "perception"],
    claims: [
      {
        id: "se1",
        claim: "People overestimate observer notice of embarrassing t-shirts by more than double the actual rate.",
        category: "VERIFIED_FACT",
        source: "Gilovich, Medvec & Savitsky, 2000",
        sourceTitle: "The spotlight effect in social judgment: An egocentric bias in estimates of the salience of one's own actions and appearance",
        sourceUrl: "https://doi.org/10.1037/0022-3514.78.2.211",
        excerpt: "Participants estimated 50% noticed their target shirt; in reality only 23% did.",
        publicationDate: "2000",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.96
      },
      {
        id: "se2",
        claim: "Egocentric anchoring causes individuals to use their internal intense awareness as the starting baseline for others' awareness.",
        category: "VERIFIED_FACT",
        source: "Epley & Gilovich, 2001",
        sourceTitle: "Putting adjustment back in the anchoring and adjustment heuristic",
        sourceUrl: "https://doi.org/10.1111/1467-9280.00372",
        publicationDate: "2001",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.93
      },
      {
        id: "se3",
        claim: "Social anxiety is intensified by the illusion of transparency, assuming our internal feelings are visible to external observers.",
        category: "INTERPRETATION",
        source: "Gilovich, Savitsky & Medvec, 1998",
        sourceTitle: "The illusion of transparency: Biased assessments of others' ability to read one's emotional states",
        sourceUrl: "https://doi.org/10.1037/0022-3514.75.2.332",
        publicationDate: "1998",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.89,
        qualification: "Experimental social psychology finding documented across public speaking and deception tasks."
      },
      {
        id: "se4",
        claim: "Most humans exist in their own self-referential cognitive spotlight, rarely allocating deep surveillance attention to bystanders.",
        category: "INTERPRETATION",
        source: "Kahneman, 2011",
        sourceTitle: "Thinking, Fast and Slow",
        publicationDate: "2011",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.88,
        qualification: "Cognitive attention constraint hypothesis."
      }
    ]
  },
  {
    id: "zeigarnik-effect",
    topic: "The Zeigarnik Effect: Why Unfinished Tasks Haunt Your Brain",
    category: "psychology",
    angle: "Your brain keeps uncompleted tasks active in mental working memory until closure is reached or a plan is made.",
    noveltyScore: 8.2,
    curiosityScore: 9.1,
    visualPotential: 8.8,
    targetDurationSec: 36,
    tags: ["psychology", "focus", "productivity", "neuroscience", "habits"],
    claims: [
      {
        id: "ze1",
        claim: "Incomplete tasks are recalled approximately 90% better than completed tasks due to unresolved cognitive tension.",
        category: "VERIFIED_FACT",
        source: "Zeigarnik, 1927",
        sourceTitle: "On finished and unfinished tasks (Das Behalten erledigter und unerledigter Handlungen)",
        sourceUrl: "https://doi.org/10.1007/BF02409755",
        excerpt: "Recall ratio of incomplete to completed tasks showed a striking advantage of 1.9 for interrupted actions.",
        publicationDate: "1927",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.94
      },
      {
        id: "ze2",
        claim: "Formulating a concrete implementation plan relieves intrusive thoughts even before the task is executed.",
        category: "VERIFIED_FACT",
        source: "Masicampo & Baumeister, 2011",
        sourceTitle: "Consider it done! Plan making can free the cognitive capacity for unfulfilled goals",
        sourceUrl: "https://doi.org/10.1037/a0024192",
        excerpt: "Committing to a plan for an unfinished goal eliminated the intrusive cognitive interference of the goal.",
        publicationDate: "2011",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.92
      },
      {
        id: "ze3",
        claim: "The human mind naturally seeks Gestalt closure, perceiving open loops as unresolved tension in cognitive field theory.",
        category: "INTERPRETATION",
        source: "Lewin, 1926",
        sourceTitle: "Vorsatz, Wille und Bedürfnis",
        publicationDate: "1926",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.88,
        qualification: "Foundational Gestalt field theory framework describing quasi-needs and goal vectors."
      },
      {
        id: "ze4",
        claim: "Bedtime rumination can be substantially mitigated by offloading unfinished tasks onto a written next-day to-do list.",
        category: "INTERPRETATION",
        source: "Scullin et al., 2018",
        sourceTitle: "The effects of bedtime writing on difficulty falling asleep",
        sourceUrl: "https://doi.org/10.1037/xge0000374",
        publicationDate: "2018",
        retrievedAt: "2026-10-08T00:00:00Z",
        confidence: 0.86,
        qualification: "Polysomnography clinical trial demonstrated significantly faster sleep onset latency after writing specific to-do lists."
      }
    ]
  }
];

export class TopicEngine {
  static getAllTopics(): TopicItem[] {
    return CURATED_TOPICS;
  }

  static getTopicById(id: string): TopicItem | undefined {
    return CURATED_TOPICS.find(t => t.id === id);
  }

  static getTargetEmbarrassingMemoryTopic(): TopicItem {
    const topic = CURATED_TOPICS.find(t => t.id === "embarrassing-memories");
    if (!topic) throw new Error("Target topic not found in curated queue");
    return topic;
  }

  static rankTopics(topics: TopicItem[] = CURATED_TOPICS): TopicItem[] {
    return [...topics].sort((a, b) => {
      const scoreA = a.curiosityScore * 0.4 + a.noveltyScore * 0.3 + a.visualPotential * 0.3;
      const scoreB = b.curiosityScore * 0.4 + b.noveltyScore * 0.3 + b.visualPotential * 0.3;
      return scoreB - scoreA;
    });
  }
}
