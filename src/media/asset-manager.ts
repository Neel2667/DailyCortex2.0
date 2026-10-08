import type { AssetProvider, MediaAsset, ScenePlan } from "../types.js";
import { AssetScorer } from "./asset-scorer.js";
import { MockAssetProvider } from "./mock-provider.js";
import { PexelsProvider } from "../providers/pexels.js";
import { MediaNormalizer } from "./media-normalizer.js";
import { config } from "../config.js";
import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

export class AssetManager {
  private primaryProvider: AssetProvider;
  private fallbackProvider: AssetProvider;
  private normalizer: MediaNormalizer;

  constructor(primaryProvider?: AssetProvider, normalizer?: MediaNormalizer) {
    this.normalizer = normalizer ?? new MediaNormalizer();
    if (primaryProvider) {
      this.primaryProvider = primaryProvider;
    } else if (config.pexelsApiKey) {
      this.primaryProvider = new PexelsProvider(config.pexelsApiKey);
    } else {
      this.primaryProvider = new MockAssetProvider(this.normalizer);
    }
    this.fallbackProvider = new MockAssetProvider(this.normalizer);
  }

  /**
   * Resolves, downloads, normalizes, and caches 1080x1920 MP4 assets for every scene.
   */
  async resolveAssetsForScenes(scenes: ScenePlan[]): Promise<MediaAsset[]> {
    const selectedAssets: MediaAsset[] = [];
    const usedAssetIds = new Set<string>();

    for (const scene of scenes) {
      const query = scene.assetQuery || scene.visualPrompt;
      let candidates: MediaAsset[] = [];

      try {
        const result = await this.primaryProvider.search(query, {
          limit: 5,
          orientation: "portrait"
        });

        if (result.ok && result.value && result.value.length > 0) {
          candidates = result.value;
        }
      } catch {
        // Fallback to offline on error
      }

      if (candidates.length === 0) {
        const fallback = await this.fallbackProvider.search(query, {
          limit: 3,
          orientation: "portrait"
        });
        candidates = fallback.value ?? [];
      }

      const ranked = AssetScorer.rankAssets(candidates, scene, usedAssetIds);
      let chosen = ranked[0];

      if (!chosen) {
        // Generate motion plate directly
        const platePath = await this.normalizer.generateMotionPlate(
          join("data/assets/cache", `plate_${scene.id}.mp4`),
          scene.durationSec,
          scene.mood ?? "dark_night_bedroom"
        );
        chosen = {
          id: `plate-${scene.id}`,
          provider: "local",
          url: platePath,
          localPath: platePath,
          mediaType: "video",
          width: 1080,
          height: 1920,
          durationSec: scene.durationSec,
          orientation: "portrait",
          query,
          score: 80,
          attribution: "DailyCortex Normalizer"
        };
      }

      // If chosen asset is remote and has URL but no localPath: download and normalize it
      if (chosen.url && chosen.url.startsWith("http") && !chosen.localPath) {
        try {
          const rawDest = join("data/assets/cache", `raw_${chosen.id}.mp4`);
          const normDest = join("data/assets/cache", `norm_${chosen.id}.mp4`);

          // Check if already normalized in cache
          let alreadyCached = false;
          try {
            const st = await stat(normDest);
            if (st.size > 1024) alreadyCached = true;
          } catch {}

          if (!alreadyCached) {
            const res = await fetch(chosen.url);
            if (res.ok && res.body) {
              const fileStream = createWriteStream(rawDest);
              // @ts-ignore
              await pipeline(res.body, fileStream);
              await this.normalizer.normalizeVideo(rawDest, normDest, scene.durationSec);
            }
          }
          chosen.localPath = normDest;
        } catch {
          // If download fails, generate local motion plate fallback
          const platePath = await this.normalizer.generateMotionPlate(
            join("data/assets/cache", `plate_${scene.id}.mp4`),
            scene.durationSec,
            scene.mood ?? "dark_night_bedroom"
          );
          chosen.localPath = platePath;
        }
      }

      // If localPath is still missing, ensure motion plate exists
      if (!chosen.localPath) {
        const platePath = await this.normalizer.generateMotionPlate(
          join("data/assets/cache", `plate_${scene.id}.mp4`),
          scene.durationSec,
          scene.mood ?? "dark_night_bedroom"
        );
        chosen.localPath = platePath;
      }

      selectedAssets.push(chosen);
      usedAssetIds.add(chosen.id);
    }

    return selectedAssets;
  }
}
