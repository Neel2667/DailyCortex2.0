import { createHash } from "node:crypto";
import type { TopicItem, ScriptSpec, ScenePlan, VideoMetadata } from "../types.js";

export class MetadataGenerator {
  /**
   * Generates publication-ready, evidence-backed metadata for YouTube Shorts.
   * Enforces character limits, anti-clickbait standards, and deterministic content fingerprinting.
   */
  static generateMetadata(topic: TopicItem, script: ScriptSpec, scenes?: ScenePlan[]): VideoMetadata {
    // 1. Generate concise, high-CTR title (<= 60 chars for mobile Shorts)
    let title = MetadataGenerator.formatTitle(topic);
    if (title.length > 60) {
      title = title.slice(0, 57).trim() + "...";
    }

    // 2. Generate factual description with academic citations & disclaimer
    const citations = topic.claims
      .filter(c => c.category === "VERIFIED_FACT" && (c.sourceTitle || c.source))
      .map(c => `• ${c.sourceTitle ?? c.source} (${c.source ?? ""})`)
      .slice(0, 2)
      .join("\n");

    const description = [
      script.hook,
      "",
      topic.angle,
      "",
      "Scientific Sources & Empirical Evidence:",
      citations || "• Behavioral and cognitive neuroscience literature.",
      "",
      "Produced by DailyCortex — Exploring the hidden cognitive mechanisms behind everyday human behavior.",
      "",
      "#Shorts #DailyCortex #Psychology #Neuroscience #BrainScience"
    ].join("\n");

    // 3. Relevant hashtags
    const hashtags = [
      "#Shorts",
      "#DailyCortex",
      `#${topic.category.replace(/_/g, "")}`,
      "#Psychology",
      "#BrainScience"
    ];

    // 4. Tags
    const tags = Array.from(
      new Set([
        "dailycortex",
        "psychology",
        "neuroscience",
        "brain facts",
        "human behavior",
        topic.category,
        ...topic.tags
      ])
    ).slice(0, 15);

    // 5. Short hook description
    const hookDescription = script.hook.slice(0, 120);

    // 6. Content fingerprint (SHA-256) for deduplication
    const normalizedContent = [
      topic.id,
      topic.topic,
      script.narrativeStructure,
      script.fullNarration.toLowerCase().replace(/[^a-z0-9]/g, "")
    ].join("|");

    const contentFingerprint = createHash("sha256").update(normalizedContent).digest("hex");

    return {
      title,
      description,
      hashtags,
      tags,
      hookDescription,
      contentFingerprint,
      provenanceRecord: {
        generatedAt: new Date().toISOString(),
        topicId: topic.id,
        scriptWordCount: script.wordCount,
        version: "2.0-factory"
      }
    };
  }

  /**
   * Formats a crisp, readable Short title without clickbait punctuation
   */
  private static formatTitle(topic: TopicItem): string {
    switch (topic.id) {
      case "embarrassing-memories":
        return "Why Embarrassing Memories Never Fade";
      case "doorway-effect":
        return "The Doorway Effect: Why You Walk In & Forget";
      case "spotlight-effect":
        return "The Spotlight Effect: Nobody Noticed What You Did";
      case "zeigarnik-effect":
        return "The Zeigarnik Effect: Why Unfinished Tasks Haunt You";
      default:
        return topic.topic;
    }
  }

  /**
   * Validates metadata against publication safety rules
   */
  static validateMetadata(metadata: VideoMetadata): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!metadata.title || metadata.title.trim().length === 0) {
      issues.push("Title is required");
    } else if (metadata.title.length > 70) {
      issues.push(`Title exceeds 70 characters (${metadata.title.length} chars)`);
    }

    if (!metadata.description || metadata.description.length < 50) {
      issues.push("Description is too short (< 50 chars); must provide context & evidence");
    }

    if (!metadata.contentFingerprint || metadata.contentFingerprint.length !== 64) {
      issues.push("Valid 64-character SHA-256 content fingerprint is required for deduplication");
    }

    const bannedKeywords = ["SHOCKED", "YOU WON'T BELIEVE", "INSANE TRICK", "CLICK HERE"];
    for (const b of bannedKeywords) {
      if (metadata.title.toUpperCase().includes(b)) {
        issues.push(`Title contains banned clickbait keyword: "${b}"`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
