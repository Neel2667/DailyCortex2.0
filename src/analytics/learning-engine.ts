import type { VideoAnalyticsRecord, ExperimentRecommendation } from "../types.js";

export interface ArchitecturePerformanceSummary {
  structure: string;
  count: number;
  avgRetentionPct: number;
  avgHourlyVelocity: number;
  avgLikesPerThousandViews: number;
}

export interface LearningAnalysisReport {
  analyzedVideosCount: number;
  topPerformingStructure: string;
  averageRetentionPct: number;
  structureRankings: ArchitecturePerformanceSummary[];
  recommendations: ExperimentRecommendation[];
}

export class LearningEngine {
  /**
   * Generates comparative performance analysis across completed videos,
   * normalizing fairly for video age and exposure.
   */
  static analyzePerformance(records: VideoAnalyticsRecord[]): LearningAnalysisReport {
    if (!records || records.length === 0) {
      return {
        analyzedVideosCount: 0,
        topPerformingStructure: "N/A",
        averageRetentionPct: 0,
        structureRankings: [],
        recommendations: [
          {
            id: "rec-initial-data",
            type: "topic",
            hypothesis: "Baseline publishing required before statistical experimentation.",
            evidence: "Zero analytics records currently stored in registry.",
            suggestedAction: "Complete publishing of the 3 benchmark candidate videos to build empirical baseline.",
            confidence: 0.95,
            createdAt: new Date().toISOString()
          }
        ]
      };
    }

    // 1. Group by narrative structure
    const grouped = new Map<string, VideoAnalyticsRecord[]>();
    for (const r of records) {
      const struct = r.narrativeStructure || "UNKNOWN";
      if (!grouped.has(struct)) grouped.set(struct, []);
      grouped.get(struct)!.push(r);
    }

    const structureRankings: ArchitecturePerformanceSummary[] = [];

    for (const [structure, items] of grouped.entries()) {
      const count = items.length;
      const totalRetention = items.reduce((sum, i) => sum + i.avgPercentageViewed, 0);
      const totalHourlyVelocity = items.reduce((sum, i) => sum + (i.views / Math.max(1, i.videoAgeHours)), 0);
      const totalLikes = items.reduce((sum, i) => sum + i.likes, 0);
      const totalViews = items.reduce((sum, i) => sum + i.views, 0);

      const avgRetentionPct = Number((totalRetention / count).toFixed(1));
      const avgHourlyVelocity = Number((totalHourlyVelocity / count).toFixed(2));
      const avgLikesPerThousandViews = totalViews > 0 ? Number(((totalLikes / totalViews) * 1000).toFixed(1)) : 0;

      structureRankings.push({
        structure,
        count,
        avgRetentionPct,
        avgHourlyVelocity,
        avgLikesPerThousandViews
      });
    }

    // Sort by retention percentage
    structureRankings.sort((a, b) => b.avgRetentionPct - a.avgRetentionPct);

    const topPerformingStructure = structureRankings[0]?.structure ?? "UNKNOWN";
    const overallAvgRetention = Number(
      (records.reduce((sum, r) => sum + r.avgPercentageViewed, 0) / records.length).toFixed(1)
    );

    // 2. Generate Evidence-Based Recommendations
    const recommendations: ExperimentRecommendation[] = [];

    // Retention pacing experiment
    if (overallAvgRetention > 0 && overallAvgRetention < 70) {
      recommendations.push({
        id: `rec-pacing-${Date.now()}`,
        type: "pacing",
        hypothesis: "Tightening opening scene duration from 8.5s to 6.0s will reduce early drop-off.",
        evidence: `Current average retention is ${overallAvgRetention}%, indicating mobile viewers drop off before the paradox mechanism beat.`,
        suggestedAction: "Shorten scene 1 narration by 15% and accelerate hook text animation pop.",
        confidence: 0.85,
        createdAt: new Date().toISOString()
      });
    }

    // Architecture recommendation
    if (structureRankings.length > 1) {
      const top = structureRankings[0];
      const bottom = structureRankings[structureRankings.length - 1];
      if (top.avgRetentionPct - bottom.avgRetentionPct > 5) {
        recommendations.push({
          id: `rec-architecture-${Date.now()}`,
          type: "narrative",
          hypothesis: `${top.structure} holds audience attention better than ${bottom.structure}.`,
          evidence: `${top.structure} achieved ${top.avgRetentionPct}% retention vs ${bottom.avgRetentionPct}% for ${bottom.structure}.`,
          suggestedAction: `Bias the topic queue selector toward ${top.structure} while investigating visual clarity in ${bottom.structure}.`,
          confidence: 0.82,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Visual diversity recommendation
    recommendations.push({
      id: `rec-visual-${Date.now()}`,
      type: "visual",
      hypothesis: "Multi-step animated diagrams outperform static HUD callouts in retention during the explanation beat.",
      evidence: "Cognitive science content requires clear spatial schema illustration.",
      suggestedAction: "Ensure every mechanism scene uses diagram_animation with sequential step-in transitions.",
      confidence: 0.90,
      createdAt: new Date().toISOString()
    });

    return {
      analyzedVideosCount: records.length,
      topPerformingStructure,
      averageRetentionPct: overallAvgRetention,
      structureRankings,
      recommendations
    };
  }
}
