import { ProductionPipeline } from "./orchestration/pipeline.js";

async function main() {
  const command = process.argv[2] ?? "dry-run";
  const pipeline = new ProductionPipeline();

  if (command === "dry-run") {
    console.log("=== DAILYCORTEX 2.0 DRY-RUN PIPELINE ===");
    console.log("Generating full production project for: Why Embarrassing Memories Never Fade\n");

    const state = await pipeline.run({
      jobId: "demo-embarrassing-memory",
      dryRun: true
    });

    console.log(`[PASS] Job Stage: ${state.stage}`);
    console.log(`[PASS] Project Directory: ${state.projectDir}`);
    console.log(`[PASS] Total Duration: ${state.storyboard?.totalDurationSec.toFixed(1)}s`);
    console.log(`[PASS] Scene Count: ${state.storyboard?.scenes.length}`);
    console.log(`[PASS] Timed Words: ${state.voiceResult?.words.length}`);
    console.log("\nQuality Gate Verification:");
    for (const q of state.qualityResults) {
      console.log(`  ${q.passed ? "✓" : "✗"} [${q.gate}:${q.check}] ${q.message}`);
    }

    console.log("\nJob Manifest:");
    console.log(JSON.stringify({
      id: state.id,
      stage: state.stage,
      workDir: state.workDir,
      projectDir: state.projectDir,
      durationSec: state.storyboard?.totalDurationSec,
      scenes: state.storyboard?.scenes.map(s => ({
        scene: s.sceneNumber,
        type: s.type,
        duration: s.durationSec,
        headline: s.cardLayout?.headline
      }))
    }, null, 2));
  } else if (command === "generate") {
    console.log("=== DAILYCORTEX 2.0 PROJECT GENERATOR ===");
    const topicId = process.argv[3];
    const state = await pipeline.run({
      jobId: `short-${topicId || Date.now()}`,
      topicId,
      dryRun: false,
      renderVideo: false
    });
    console.log(`Successfully generated Showtime project at: ${state.projectDir}`);
  } else if (command === "render") {
    const topicId = process.argv[3] ?? "embarrassing-memories";
    console.log(`=== DAILYCORTEX 2.0 FULL RENDER PIPELINE [${topicId}] ===`);
    const state = await pipeline.run({
      jobId: `short-render-${topicId}`,
      topicId,
      dryRun: false,
      renderVideo: true,
      previewOnly: false
    });
    console.log(`Render and QA complete. Video output: ${state.renderPath}`);
  } else if (command === "benchmark") {
    console.log("=== DAILYCORTEX 2.0 THREE-VIDEO BENCHMARK SUITE ===");
    const benchmarks = [
      { id: "benchmark-short-a", topicId: "embarrassing-memories", title: "Video A: Embarrassing Memories (Paradox Architecture)" },
      { id: "benchmark-short-b", topicId: "doorway-effect", title: "Video B: Doorway Effect (Mystery Architecture)" },
      { id: "benchmark-short-c", topicId: "spotlight-effect", title: "Video C: Spotlight Effect (Scenario Architecture)" }
    ];

    for (const b of benchmarks) {
      console.log(`\n==================================================`);
      console.log(`STARTING BENCHMARK: ${b.title}`);
      console.log(`==================================================`);
      const state = await pipeline.run({
        jobId: b.id,
        topicId: b.topicId,
        dryRun: false,
        renderVideo: true,
        previewOnly: false
      });
      console.log(`[PASS] Benchmark ${b.id} completed. MP4: ${state.renderPath}`);
    }
    console.log(`\nAll 3 benchmark videos rendered and audited successfully!`);
  } else {
    console.log("Usage:");
    console.log("  npm run dry-run                           # Run deterministic pipeline and assemble project");
    console.log("  npx tsx src/cli.ts generate [topicId]     # Generate native Showtime project with local voice");
    console.log("  npx tsx src/cli.ts render [topicId]       # Full generate + 1080x1920 render + QA");
    console.log("  npx tsx src/cli.ts benchmark              # Execute full 3-video benchmark suite");
  }
}

main().catch(err => {
  console.error("Pipeline Error:", err);
  process.exit(1);
});
