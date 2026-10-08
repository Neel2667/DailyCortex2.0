import type { AssetProvider, MediaAsset, ScenePlan } from "../types.js";
import { AssetScorer } from "./asset-scorer.js";
import { MockAssetProvider } from "./mock-provider.js";
import { PexelsProvider } from "../providers/pexels.js";
import { config } from "../config.js";

export class AssetManager {
  private primaryProvider: AssetProvider;
  private fallbackProvider: AssetProvider;

  constructor(primaryProvider?: AssetProvider) {
    if (primaryProvider) {
      this.primaryProvider = primaryProvider;
    } else if (config.pexelsApiKey) {
      this.primaryProvider = new PexelsProvider(config.pexelsApiKey);
    } else {
      this.primaryProvider = new MockAssetProvider();
    }
    this.fallbackProvider = new MockAssetProvider();
  }

  /**
   * Resolves and assigns optimal, deduplicated assets for all scenes in a storyboard.
   */
  async resolveAssetsForScenes(scenes: ScenePlan[]): Promise<MediaAsset[]> {
    const selectedAssets: MediaAsset[] = [];
    const usedAssetIds = new Set<string>();

    for (const scene of scenes) {
      const query = scene.assetQuery || scene.visualPrompt;
      let candidates: MediaAsset[] = [];

      try {
        const result = await this.primaryProvider.search(query, {
          limit: 6,
          orientation: "portrait"
        });

        if (result.ok && result.value && result.value.length > 0) {
          candidates = result.value;
        }
      } catch {
        // Fallback on network or API failure
      }

      if (candidates.length === 0) {
        const fallback = await this.fallbackProvider.search(query, {
          limit: 4,
          orientation: "portrait"
        });
        candidates = fallback.value ?? [];
      }

      const ranked = AssetScorer.rankAssets(candidates, scene, usedAssetIds);
      const chosen = ranked[0] ?? {
        id: `fallback-${scene.id}`,
        provider: "mock" as const,
        url: "",
        width: 1080,
        height: 1920,
        orientation: "portrait" as const,
        query,
        score: 40
      };

      selectedAssets.push(chosen);
      usedAssetIds.add(chosen.id);
    }

    return selectedAssets;
  }
}
