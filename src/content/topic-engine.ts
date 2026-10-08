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
        source: "Cahill & McGaugh, 1998, Mechanisms of emotional memory",
        confidence: 0.95
      },
      {
        id: "c2",
        claim: "Social rejection activates dorsal anterior cingulate cortex pain pathways similar to physical injury.",
        category: "VERIFIED_FACT",
        source: "Eisenberger et al., 2003, Science: Does rejection hurt?",
        confidence: 0.92
      },
      {
        id: "c3",
        claim: "Evolutionary fitness in ancestral human groups depended directly on tribal acceptance, making social mistakes life-threatening.",
        category: "INTERPRETATION",
        source: "Baumeister & Leary, 1995, The Need to Belong",
        confidence: 0.88
      },
      {
        id: "c4",
        claim: "The involuntary intrusive replay of cringe moments is a proactive predictive error-correction loop, not an intentional self-punishment.",
        category: "INTERPRETATION",
        source: "Friston, 2010, The free-energy principle",
        confidence: 0.85
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
        source: "Radvansky et al., 2011, Quarterly Journal of Experimental Psychology",
        confidence: 0.94
      },
      {
        id: "de2",
        claim: "Working memory updates mental models when environmental context shifts across a physical threshold.",
        category: "VERIFIED_FACT",
        source: "Zacks et al., 2007, Psychological Bulletin",
        confidence: 0.91
      },
      {
        id: "de3",
        claim: "Looking back at the previous room restores perceptual context cues that assist memory retrieval.",
        category: "INTERPRETATION",
        source: "Smith & Vela, 2001, Environmental context-dependent memory",
        confidence: 0.87
      },
      {
        id: "de4",
        claim: "Event segmentation functions as a cognitive strategy to prevent sensory overload across distinct spaces.",
        category: "INTERPRETATION",
        source: "Kurby & Zacks, 2008, Trends in Cognitive Sciences",
        confidence: 0.85
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
        source: "Gilovich, Medvec & Savitsky, 2000, Journal of Personality and Social Psychology",
        confidence: 0.96
      },
      {
        id: "se2",
        claim: "Egocentric anchoring causes individuals to use their internal intense awareness as the starting baseline for others' awareness.",
        category: "VERIFIED_FACT",
        source: "Epley & Gilovich, 2001, Psychological Science",
        confidence: 0.93
      },
      {
        id: "se3",
        claim: "Social anxiety is intensified by the illusion of transparency, assuming our internal feelings are visible to external observers.",
        category: "INTERPRETATION",
        source: "Gilovich, Savitsky & Medvec, 1998, Journal of Personality and Social Psychology",
        confidence: 0.89
      },
      {
        id: "se4",
        claim: "Most humans exist in their own self-referential cognitive spotlight, rarely allocating deep surveillance attention to bystanders.",
        category: "INTERPRETATION",
        source: "Kahneman, 2011, Thinking, Fast and Slow",
        confidence: 0.88
      }
    ]
  }
];

export class TopicEngine {
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
