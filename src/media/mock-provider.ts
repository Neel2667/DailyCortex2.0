import type { AssetProvider, MediaAsset, ProviderResult } from "../types.js";
import { MediaNormalizer } from "./media-normalizer.js";
import { join } from "node:path";

export class MockAssetProvider implements AssetProvider {
  constructor(private normalizer?: MediaNormalizer) {}

  async search(
    query: string,
    options: { limit?: number; orientation?: "portrait" | "landscape" | "square" } = {}
  ): Promise<ProviderResult<MediaAsset[]>> {
    const limit = options.limit ?? 5;
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

    const assets: MediaAsset[] = [];
    for (let i = 1; i <= limit; i++) {
      const id = `mock-${cleanQuery.replace(/\s+/g, "-")}-${i}`;
      const localPath = join("data/assets/cache", `${id}.mp4`);
      assets.push({
        id,
        provider: "mock",
        url: localPath,
        localPath,
        mediaType: "video",
        width: 1080,
        height: 1920,
        durationSec: 12.0,
        orientation: "portrait",
        query,
        score: 85 - (i * 2),
        attribution: "DailyCortex Offline Asset Engine"
      });
    }

    return {
      ok: true,
      value: assets
    };
  }
}
