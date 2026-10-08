import { describe, it, expect } from "vitest";
import { AssetScorer } from "../src/media/asset-scorer.js";
import { MockAssetProvider } from "../src/media/mock-provider.js";
import { AssetManager } from "../src/media/asset-manager.js";
import type { MediaAsset, ScenePlan } from "../src/types.js";

describe("Media Intelligence Engine", () => {
  const sampleScene: ScenePlan = {
    id: "s1",
    sceneNumber: 1,
    type: "hook",
    durationSec: 6.0,
    narrationText: "It is 3 a.m. and you remember an awkward moment.",
    visualPrompt: "person waking up bedroom night",
    assetQuery: "person waking up bedroom night",
    motion: "kinetic-pop",
    transition: "push up 0.4"
  };

  it("penalizes duplicate clips heavily", () => {
    const candidate: MediaAsset = {
      id: "asset-123",
      provider: "mock",
      url: "test.mp4",
      mediaType: "video",
      width: 1080,
      height: 1920,
      durationSec: 8.0,
      orientation: "portrait",
      query: "person waking up bedroom night",
      score: 80
    };

    const usedSet = new Set<string>();
    const firstScore = AssetScorer.scoreAsset(candidate, sampleScene, usedSet);

    usedSet.add("asset-123");
    const secondScore = AssetScorer.scoreAsset(candidate, sampleScene, usedSet);

    expect(firstScore).toBeGreaterThan(secondScore);
    expect(firstScore - secondScore).toBeGreaterThanOrEqual(70);
  });

  it("rewards vertical 9:16 portrait assets over landscape", () => {
    const portrait: MediaAsset = {
      id: "p1",
      provider: "mock",
      url: "p.mp4",
      mediaType: "video",
      width: 1080,
      height: 1920,
      durationSec: 10,
      orientation: "portrait",
      query: "person waking up",
      score: 50
    };

    const landscape: MediaAsset = {
      id: "l1",
      provider: "mock",
      url: "l.mp4",
      mediaType: "video",
      width: 1920,
      height: 1080,
      durationSec: 10,
      orientation: "landscape",
      query: "person waking up",
      score: 50
    };

    const used = new Set<string>();
    const scoreP = AssetScorer.scoreAsset(portrait, sampleScene, used);
    const scoreL = AssetScorer.scoreAsset(landscape, sampleScene, used);

    expect(scoreP).toBeGreaterThan(scoreL);
  });

  it("resolves deduplicated assets for multiple scenes via AssetManager", async () => {
    const manager = new AssetManager(new MockAssetProvider());
    const scenes: ScenePlan[] = [
      sampleScene,
      { ...sampleScene, id: "s2", sceneNumber: 2, type: "reaction", assetQuery: "awkward moment" },
      { ...sampleScene, id: "s3", sceneNumber: 3, type: "diagram", assetQuery: "brain diagram" }
    ];

    const resolved = await manager.resolveAssetsForScenes(scenes);
    expect(resolved.length).toBe(3);
    const ids = resolved.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3); // strictly deduplicated
  });
});
