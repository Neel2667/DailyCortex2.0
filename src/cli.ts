import { exec } from "node:child_process";
import { promisify } from "util";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config.js";
import { FactoryEngine } from "./factory/factory-engine.js";
import { TopicEngine } from "./content/topic-engine.js";
import { FactEngine } from "./content/fact-engine.js";
import { ScriptEngine } from "./content/script-engine.js";
import { MetadataGenerator } from "./publishing/metadata-generator.js";
import { ThumbnailGenerator } from "./publishing/thumbnail-generator.js";
import { YouTubeClient } from "./publishing/youtube-client.js";
import { PublicationScheduler } from "./publishing/scheduler.js";
import { YouTubeAnalyticsAdapter } from "./analytics/analytics-adapter.js";
import { LearningEngine } from "./analytics/learning-engine.js";
import { QualityGateEngine } from "./quality/quality-gates.js";
import { PostRenderQA } from "./quality/post-render-qa.js";

const execAsync = promisify(exec);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "help";
  const factory = new FactoryEngine();
  const youtubeClient = new YouTubeClient();
  const scheduler = new PublicationScheduler();
  const analyticsAdapter = new YouTubeAnalyticsAdapter();

  switch (command) {
    case "doctor": {
      console.log("=== DAILYCORTEX 2.0 SYSTEM DOCTOR ===");
      // Node
      console.log(`[PASS] Node.js Version: ${process.version}`);

      // FFmpeg & FFprobe
      try {
        const { stdout: ff } = await execAsync("ffmpeg -version");
        const v = ff.split("\n")[0];
        console.log(`[PASS] FFmpeg: ${v.slice(0, 30)}...`);
      } catch {
        console.log(`[FAIL] FFmpeg: Not found in PATH!`);
      }

      try {
        const { stdout: pr } = await execAsync("ffprobe -version");
        const v = pr.split("\n")[0];
        console.log(`[PASS] FFprobe: ${v.slice(0, 30)}...`);
      } catch {
        console.log(`[FAIL] FFprobe: Not found in PATH!`);
      }

      // Showtime
      try {
        const { stdout: st } = await execAsync(`${config.showtimeBin} --version || showtime -v`);
        console.log(`[PASS] Showtime CLI: Present`);
      } catch {
        console.log(`[WARN] Showtime CLI: '${config.showtimeBin}' checked.`);
      }

      // Groq
      if (config.groqApiKey && config.groqApiKey.length > 5) {
        console.log(`[PASS] Groq API: Configured (Key masked)`);
      } else {
        console.log(`[WARN] Groq API: Not configured in GROQ_API_KEY (deterministic scripts active)`);
      }

      // Pexels
      if (config.pexelsApiKey && config.pexelsApiKey.length > 5) {
        console.log(`[PASS] Pexels API: Configured (Key masked)`);
      } else {
        console.log(`[INFO] Pexels API: Key absent. Procedural motion plate fallback active.`);
      }

      // YouTube
      const ytStatus = await youtubeClient.getAuthStatus();
      console.log(`[${ytStatus.authenticated ? "PASS" : "INFO"}] YouTube Auth: ${ytStatus.authenticated ? "Authenticated" : "Unauthenticated"}`);
      console.log(`[INFO] YouTube Publishing Enabled: ${ytStatus.publishingEnabled ? "YES" : "NO (Protected by release gate)"}`);
      for (const n of ytStatus.notes) {
        console.log(`       - ${n}`);
      }
      break;
    }

    case "queue": {
      console.log("=== DAILYCORTEX 2.0 JOB QUEUE ===");
      const jobsDir = "data/jobs";
      try {
        const dirs = await readdir(jobsDir);
        for (const dir of dirs) {
          try {
            const statePath = join(jobsDir, dir, "job-state.json");
            const state = JSON.parse(await readFile(statePath, "utf-8"));
            console.log(`• [${state.factoryStage ?? state.stage}] Job: ${state.id} | Topic: ${state.topic?.topic ?? "N/A"}`);
          } catch {
            // Check legacy job-manifest.json
            try {
              const manifestPath = join(jobsDir, dir, "job-manifest.json");
              const m = JSON.parse(await readFile(manifestPath, "utf-8"));
              console.log(`• [${m.stage.toUpperCase()}] Job: ${m.id} | Topic: ${m.topic?.topic ?? "N/A"}`);
            } catch {
              console.log(`• [RAW_DIR] ${dir}`);
            }
          }
        }
      } catch {
        console.log("No jobs directory found.");
      }
      break;
    }

    case "research": {
      console.log("=== DAILYCORTEX 2.0 EVIDENCE & CLAIM AUDIT ===");
      const topics = TopicEngine.getAllTopics();
      for (const t of topics) {
        const validation = FactEngine.validateClaims(t.claims);
        const script = ScriptEngine.generateScript(t);
        const scriptAudit = FactEngine.auditScriptAgainstClaims(script.fullNarration, t.claims);
        console.log(`\nTopic: ${t.topic} [${t.category}]`);
        console.log(`  Claims: ${validation.claimCount} total (${validation.verifiedFactCount} verified facts)`);
        console.log(`  Claim Validation: ${validation.valid ? "PASS" : "FAIL"}`);
        console.log(`  Script Evidence Coverage: ${(scriptAudit.score * 100).toFixed(0)}%`);
        console.log(`  Anti-Hallucination Audit: ${scriptAudit.passed ? "PASS" : "FAIL"}`);
        if (!scriptAudit.passed) {
          console.log(`  Issues: ${scriptAudit.notes.join("; ")}`);
        }
      }
      break;
    }

    case "generate": {
      const topicId = args[1] ?? "embarrassing-memories";
      console.log(`=== GENERATING PROJECT FOR: ${topicId} ===`);
      const state = await factory.runJob({
        jobId: `short-${topicId}`,
        topicId,
        dryRun: false,
        renderVideo: false
      });
      console.log(`Project generation complete: ${state.projectDir}`);
      break;
    }

    case "render": {
      const topicId = args[1] ?? "embarrassing-memories";
      console.log(`=== FULL RENDER FOR: ${topicId} ===`);
      const state = await factory.runJob({
        jobId: `short-${topicId}`,
        topicId,
        dryRun: false,
        renderVideo: true
      });
      console.log(`Render complete: ${state.renderPath}`);
      break;
    }

    case "qa": {
      const jobId = args[1] ?? "short-embarrassing-memories";
      console.log(`=== 20 QUALITY GATES AUDIT: ${jobId} ===`);
      const reportsDir = `data/jobs/${jobId}/reports`;
      const videoPath = `data/jobs/${jobId}/final.mp4`;
      const state = await factory.loadState(`data/jobs/${jobId}`);

      if (!state || !state.storyboard) {
        console.error(`Error: Job state not found for ${jobId}`);
        process.exit(1);
      }

      let audioReportPassed = false;
      try {
        const audioJson = JSON.parse(await readFile(join(reportsDir, "audio-quality.json"), "utf-8"));
        audioReportPassed = audioJson.status === "PASS";
      } catch {}

      let syncReportPassed = false;
      try {
        const syncJson = JSON.parse(await readFile(join(reportsDir, "sync-report.json"), "utf-8"));
        syncReportPassed = syncJson.status === "PASS" || syncJson.passed === true;
      } catch {}

      let provenanceCount = 0;
      try {
        const provJson = JSON.parse(await readFile(join(reportsDir, "provenance-manifest.json"), "utf-8"));
        provenanceCount = provJson.length;
      } catch {}

      const postRenderReport = await PostRenderQA.auditMp4(videoPath, state.storyboard.totalDurationSec, false);
      const audit = await QualityGateEngine.audit20PublishingGates({
        storyboard: state.storyboard,
        voiceResult: state.voiceResult,
        renderPath: videoPath,
        postRenderReport,
        metadata: state.metadata,
        thumbnail: state.thumbnail,
        audioReportPassed,
        syncReportPassed,
        provenanceCount,
        approvedForPublishing: state.approvedForPublishing
      });

      await writeFile(join(reportsDir, "post-render-report.json"), JSON.stringify(postRenderReport, null, 2), "utf-8");
      await writeFile(join(reportsDir, "twenty-gates-audit.json"), JSON.stringify(audit, null, 2), "utf-8");

      console.log(`Results: ${audit.passedCount}/20 Gates PASSED (canPublish: ${audit.canPublish ? "YES" : "NO"})`);
      for (const g of audit.gates) {
        console.log(`  ${g.passed ? "✓" : "✗"} [Gate ${g.id}: ${g.name}] ${g.message}`);
      }
      break;
    }

    case "metadata": {
      const jobId = args[1] ?? "short-embarrassing-memories";
      const topicId = jobId.replace(/^short-/, "");
      const topic = TopicEngine.getTopicById(topicId) ?? TopicEngine.getTargetEmbarrassingMemoryTopic();
      const script = ScriptEngine.generateScript(topic);
      const metadata = MetadataGenerator.generateMetadata(topic, script);
      console.log("=== GENERATED METADATA ===");
      console.log(JSON.stringify(metadata, null, 2));
      break;
    }

    case "thumbnail": {
      const jobId = args[1] ?? "short-embarrassing-memories";
      const topicId = jobId.replace(/^short-/, "");
      const topic = TopicEngine.getTopicById(topicId) ?? TopicEngine.getTargetEmbarrassingMemoryTopic();
      const script = ScriptEngine.generateScript(topic);
      const thumb = await ThumbnailGenerator.generateThumbnail(`data/jobs/${jobId}`, topic, script, {
        videoPath: `data/jobs/${jobId}/final.mp4`
      });
      console.log("=== GENERATED THUMBNAIL ===");
      console.log(JSON.stringify(thumb, null, 2));
      break;
    }

    case "publish": {
      const isDryRun = args.includes("--dry-run");
      const jobId = args.find(a => !a.startsWith("-") && a !== "publish") ?? "short-embarrassing-memories";
      console.log(`=== PUBLISHING (${isDryRun ? "DRY-RUN" : "REAL"}) [${jobId}] ===`);
      let state = await factory.loadState(`data/jobs/${jobId}`);
      let metadata = state?.metadata;
      if (!metadata) {
        const topicId = jobId.replace(/^short-/, "");
        const topic = TopicEngine.getTopicById(topicId) ?? TopicEngine.getTargetEmbarrassingMemoryTopic();
        const script = ScriptEngine.generateScript(topic);
        metadata = MetadataGenerator.generateMetadata(topic, script);
      }

      const res = await youtubeClient.uploadVideo(
        {
          filePath: state?.renderPath ?? `data/jobs/${jobId}/final.mp4`,
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          privacyStatus: config.defaultPrivacyStatus
        },
        {
          contentFingerprint: metadata.contentFingerprint,
          jobId: jobId,
          dryRun: isDryRun || !config.youtubePublishingEnabled
        }
      );
      console.log(`Publishing Result:`, res);
      break;
    }

    case "youtube": {
      const sub = args[1];
      if (sub === "auth-status") {
        const s = await youtubeClient.getAuthStatus();
        console.log("=== YOUTUBE AUTHENTICATION STATUS ===");
        console.log(JSON.stringify(s, null, 2));
      } else if (sub === "verify") {
        const videoId = args[2] ?? "DRY_RUN_short-embarrassing-memories";
        const v = await youtubeClient.verifyRemoteVideo(videoId);
        console.log(`Remote verification for ${videoId}: ${v ? "CONFIRMED" : "NOT FOUND"}`);
      } else {
        console.log("Usage: npx tsx src/cli.ts youtube [auth-status|verify <videoId>]");
      }
      break;
    }

    case "schedule": {
      console.log("=== PUBLICATION SCHEDULE QUEUE ===");
      const queue = await scheduler.getQueue();
      if (queue.length === 0) {
        console.log("Publication queue is empty.");
      } else {
        for (const item of queue) {
          console.log(`• [${item.status.toUpperCase()}] Job: ${item.jobId} | Scheduled: ${item.scheduledFor} | Title: "${item.title}"`);
        }
      }
      const next = await scheduler.calculateNextSlot();
      console.log(`Next available schedule window: ${next.isoTimestamp} (${next.slotTime})`);
      break;
    }

    case "analytics": {
      const sub = args[1];
      if (sub === "sync") {
        const jobId = args[2] ?? "short-embarrassing-memories";
        const res = await analyticsAdapter.syncMetrics({
          jobId,
          videoId: `demo_${jobId}`,
          fixtureRecord: { views: 3200, avgPercentageViewed: 84.5, likes: 240 }
        });
        console.log("Synced Analytics Record:", res);
      } else if (sub === "report") {
        const records = await analyticsAdapter.getRecords();
        const rep = LearningEngine.analyzePerformance(records);
        console.log("=== LEARNING ENGINE REPORT ===");
        console.log(JSON.stringify(rep, null, 2));
      } else {
        console.log("Usage: npx tsx src/cli.ts analytics [sync <jobId>|report]");
      }
      break;
    }

    case "factory": {
      const sub = args[1] ?? "run";
      if (sub === "run") {
        const batchIdx = args.indexOf("--batch");
        const count = batchIdx !== -1 && args[batchIdx + 1] ? Number(args[batchIdx + 1]) : (!isNaN(Number(args[2])) ? Number(args[2]) : 1);
        console.log(`=== RUNNING PRODUCTION FACTORY (Batch size: ${count}) ===`);
        const results = await factory.runBatch(count, {
          dryRun: true,
          renderVideo: false,
          autoApprove: true
        });
        console.log(`\nFactory run finished. Processed ${results.length} jobs.`);
        for (const r of results) {
          console.log(`  ✓ [${r.factoryStage}] ${r.id} (${r.topic?.topic})`);
        }
      }
      break;
    }

    default:
      console.log("DailyCortex 2.0 Production CLI:");
      console.log("  npx tsx src/cli.ts doctor                     # Inspect environment dependencies");
      console.log("  npx tsx src/cli.ts queue                      # List job queue state machine statuses");
      console.log("  npx tsx src/cli.ts research                   # Audit topic claims & fact integrity");
      console.log("  npx tsx src/cli.ts generate [topicId]         # Generate Showtime project files");
      console.log("  npx tsx src/cli.ts render [topicId]           # Full render + PostRenderQA");
      console.log("  npx tsx src/cli.ts qa [jobId]                 # Audit all 20 quality gates");
      console.log("  npx tsx src/cli.ts metadata [jobId]           # Generate metadata and fingerprint");
      console.log("  npx tsx src/cli.ts thumbnail [jobId]          # Generate 1080x1920 thumbnail card");
      console.log("  npx tsx src/cli.ts publish --dry-run [jobId]  # Safe dry-run publish");
      console.log("  npx tsx src/cli.ts youtube auth-status        # View YouTube OAuth status");
      console.log("  npx tsx src/cli.ts youtube verify [videoId]   # Verify remote video on YouTube");
      console.log("  npx tsx src/cli.ts schedule                   # View publication schedule queue");
      console.log("  npx tsx src/cli.ts analytics sync [jobId]     # Sync analytics metrics");
      console.log("  npx tsx src/cli.ts analytics report           # Learning analysis & recommendations");
      console.log("  npx tsx src/cli.ts factory run [batchSize]    # Autonomous batch execution");
      break;
  }
}

main().catch(err => {
  console.error("CLI Execution Error:", err);
  process.exit(1);
});
