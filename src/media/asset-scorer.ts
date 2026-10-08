import type { MediaAsset, ScenePlan } from "../types.js";

export class AssetScorer {
  /**
   * Scores a candidate asset against a target scene and previously used assets.
   * Considers orientation, duration, semantic match, and heavily penalizes duplication.
   */
  static scoreAsset(
    candidate: MediaAsset,
    scene: ScenePlan,
    usedAssetIds: Set<string>
  ): number {
    let score = 50;

    // 1. Heavy penalty for duplicate reuse
    if (usedAssetIds.has(candidate.id)) {
      score -= 80;
    }

    // 2. Orientation match (Vertical 9:16 priority for Shorts)
    if (candidate.orientation === "portrait" || (candidate.height > candidate.width)) {
      score += 35;
    } else if (candidate.orientation === "square") {
      score += 10;
    } else {
      // Landscape requires cropping in 9:16
      score -= 15;
    }

    // 3. Duration match: asset must cover the scene duration
    if (candidate.durationSec) {
      if (candidate.durationSec >= scene.durationSec) {
        score += 15;
      } else {
        // Shorter than scene duration would loop or freeze
        score -= 25;
      }
    }

    // 4. Query & keyword relevance
    if (scene.assetQuery) {
      const queryWords = scene.assetQuery.toLowerCase().split(/\s+/);
      const matched = queryWords.filter(w => candidate.query.toLowerCase().includes(w)).length;
      score += Math.min(20, matched * 5);
    }

    return Math.max(0, score);
  }

  /**
   * Sorts candidate assets from best to worst
   */
  static rankAssets(
    candidates: MediaAsset[],
    scene: ScenePlan,
    usedAssetIds: Set<string>
  ): MediaAsset[] {
    return [...candidates]
      .map(asset => ({
        ...asset,
        score: this.scoreAsset(asset, scene, usedAssetIds)
      }))
      .sort((a, b) => b.score - a.score);
  }
}
