import { describe, it, expect } from "vitest";
import { ProductionPipeline } from "../src/orchestration/pipeline.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("Production Pipeline (E2E Dry-Run)", () => {
  it("runs end-to-end dry-run for embarrassing memories Short and writes manifest", async () => {
    const pipeline = new ProductionPipeline();
    const jobId = `test-pipeline-${Date.now()}`;
    const state = await pipeline.run({
      jobId,
      dryRun: true
    });

    expect(state.id).toBe(jobId);
    expect(state.stage).toBe("approved");
    expect(state.topic?.id).toBe("embarrassing-memories");
    expect(state.storyboard?.scenes.length).toBe(5);
    expect(state.voiceResult?.words.length).toBeGreaterThan(50);

    const manifestContent = await readFile(join(state.workDir, "job-manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestContent);
    expect(manifest.id).toBe(jobId);
    expect(manifest.stage).toBe("approved");
    expect(manifest.qualityResults.length).toBeGreaterThanOrEqual(7);
  });
});
