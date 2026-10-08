import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContentSpec } from "./types.js";
import { assertQuality } from "./quality.js";
import { toShowtimeBrief } from "./showtime-adapter.js";
import { ProductionPipeline } from "./orchestration/pipeline.js";

export interface ProductionJob {
  id: string;
  specPath: string;
  workDir: string;
  outputPath: string;
  manifestPath?: string;
}

export async function createJob(s: ContentSpec, root = "data/jobs"): Promise<ProductionJob> {
  assertQuality(s);
  const dir = join(root, s.id);
  await mkdir(dir, { recursive: true });
  const specPath = join(dir, "content.json");
  await writeFile(specPath, JSON.stringify(s, null, 2));
  await writeFile(join(dir, "showtime-brief.md"), toShowtimeBrief(s));

  // Run the full pipeline in dry-run mode to assemble native Showtime project files
  const pipeline = new ProductionPipeline();
  const jobState = await pipeline.run({
    jobId: s.id,
    outputRoot: root,
    dryRun: true
  });

  return {
    id: s.id,
    specPath,
    workDir: dir,
    outputPath: join(dir, "render.mp4"),
    manifestPath: join(dir, "job-manifest.json")
  };
}
