import { describe, it, expect, beforeEach } from "vitest";
import { YouTubeClient } from "../src/publishing/youtube-client.js";
import { PublicationScheduler } from "../src/publishing/scheduler.js";
import { YouTubeAnalyticsAdapter } from "../src/analytics/analytics-adapter.js";
import { LearningEngine } from "../src/analytics/learning-engine.js";
import { config } from "../src/config.js";

describe("Phase 4: YouTube Integration, Scheduling & Analytics", () => {
  describe("YouTube Client & Security Gates", () => {
    let client: YouTubeClient;

    beforeEach(() => {
      client = new YouTubeClient(".credentials", "data/test-publishing");
    });

    it("enforces YouTube publishing disabled by default", () => {
      expect(config.youtubePublishingEnabled).toBe(false);
    });

    it("safe auth-status check never leaks secret strings or keys", async () => {
      const status = await client.getAuthStatus();
      expect(status.authenticated).toBeDefined();
      expect(status.publishingEnabled).toBe(false);
      expect(status.scopes).toContain("https://www.googleapis.com/auth/youtube.upload");

      const serialized = JSON.stringify(status);
      expect(serialized).not.toContain("secret");
      expect(serialized).not.toContain("token_value");
      expect(serialized).not.toContain("AIzaSy");
    });

    it("preflight check rejects missing video file", async () => {
      const preflight = await client.preflightCheck(
        {
          filePath: "data/non-existent-video.mp4",
          title: "Valid Title",
          description: "Valid Description with scientific facts",
          tags: ["shorts"],
          privacyStatus: "private"
        },
        "fingerprint-1234567890abcdef"
      );

      expect(preflight.ok).toBe(false);
      expect(preflight.issues.some(i => i.includes("not found"))).toBe(true);
    });

    it("preflight check rejects invalid or empty titles", async () => {
      const preflight = await client.preflightCheck(
        {
          filePath: "data/jobs/short-embarrassing-memories/final.mp4",
          title: "",
          description: "Valid Description",
          tags: ["shorts"],
          privacyStatus: "private"
        },
        "fingerprint-1234567890abcdef"
      );

      expect(preflight.ok).toBe(false);
      expect(preflight.issues.some(i => i.includes("Title is missing"))).toBe(true);
    });

    it("dry-run upload succeeds safely without contacting remote YouTube API", async () => {
      const res = await client.uploadVideo(
        {
          filePath: "data/jobs/short-embarrassing-memories/final.mp4",
          title: "Why Embarrassing Memories Never Fade",
          description: "Factual neuroscience description with citations",
          tags: ["shorts", "psychology"],
          privacyStatus: "private"
        },
        {
          contentFingerprint: "fingerprint-dryrun-unique-01",
          jobId: "test-job-dryrun",
          dryRun: true
        }
      );

      expect(res.videoId).toContain("DRY_RUN_");
      expect(res.verified).toBe(true);
      expect(res.status).toBe("uploaded");
      expect(res.privacyStatus).toBe("private");
    });
  });

  describe("Publication Scheduler (6 Daily Slots)", () => {
    let scheduler: PublicationScheduler;

    beforeEach(() => {
      scheduler = new PublicationScheduler("data/test-publishing");
    });

    it("configures exactly 6 daily publishing windows by default", () => {
      const cfg = scheduler.getConfig();
      expect(cfg.slotsPerDay).toBe(6);
      expect(cfg.slotTimes).toEqual(["09:00", "12:00", "15:00", "17:00", "19:00", "21:00"]);
    });

    it("calculates sequential future slots and enqueues jobs without collision", async () => {
      const item1 = await scheduler.scheduleJob("job-01", "Video A");
      expect(item1.status).toBe("scheduled");
      expect(item1.scheduledFor).toBeDefined();

      const item2 = await scheduler.scheduleJob("job-02", "Video B");
      expect(item2.status).toBe("scheduled");

      const queue = await scheduler.getQueue();
      expect(queue.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Analytics & Learning Engine", () => {
    let adapter: YouTubeAnalyticsAdapter;

    beforeEach(() => {
      adapter = new YouTubeAnalyticsAdapter("data/test-analytics");
    });

    it("records and calculates age-adjusted metrics with fixture", async () => {
      const record = await adapter.syncMetrics({
        jobId: "test-job-01",
        videoId: "vid_12345",
        topic: "The Spotlight Effect",
        narrativeStructure: "SCENARIO_PROBLEM_HIDDEN_MECHANISM_SURPRISE_ACTIONABLE_INSIGHT",
        fixtureRecord: {
          views: 5000,
          avgPercentageViewed: 82.5,
          likes: 420
        }
      });

      expect(record.views).toBe(5000);
      expect(record.avgPercentageViewed).toBe(82.5);
      expect(record.videoAgeHours).toBeGreaterThan(0);
    });

    it("analyzes comparative performance and ranks architectures by retention", () => {
      const records = [
        {
          jobId: "j1",
          videoId: "v1",
          capturedAt: new Date().toISOString(),
          videoAgeHours: 24,
          views: 8000,
          watchTimeMinutes: 4500,
          avgViewDurationSec: 32,
          avgPercentageViewed: 85.0, // High retention
          likes: 600,
          comments: 40,
          subscribersGained: 45,
          subscribersLost: 2,
          topic: "Brain Science",
          narrativeStructure: "HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF",
          visualStrategy: "scientific_visualization",
          durationSec: 40
        },
        {
          jobId: "j2",
          videoId: "v2",
          capturedAt: new Date().toISOString(),
          videoAgeHours: 24,
          views: 4000,
          watchTimeMinutes: 1800,
          avgViewDurationSec: 22,
          avgPercentageViewed: 61.0, // Lower retention
          likes: 210,
          comments: 15,
          subscribersGained: 12,
          subscribersLost: 1,
          topic: "Social Psychology",
          narrativeStructure: "MYSTERY_CLUE_EXPLANATION_REVEAL_TAKEAWAY",
          visualStrategy: "diagram_animation",
          durationSec: 41
        }
      ];

      const report = LearningEngine.analyzePerformance(records);

      expect(report.analyzedVideosCount).toBe(2);
      expect(report.topPerformingStructure).toBe("HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF");
      expect(report.structureRankings[0].avgRetentionPct).toBe(85.0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.type === "narrative")).toBe(true);
    });
  });
});
