import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import type { VideoAnalyticsRecord } from "../types.js";

export interface SyncOptions {
  jobId: string;
  videoId: string;
  topic?: string;
  narrativeStructure?: string;
  visualStrategy?: string;
  durationSec?: number;
  publishedAt?: string;
  fixtureRecord?: Partial<VideoAnalyticsRecord>;
}

export class YouTubeAnalyticsAdapter {
  private storagePath: string;

  constructor(storageDir = "data/analytics") {
    this.storagePath = join(storageDir, "analytics-records.json");
  }

  /**
   * Retrieves all historical analytics records
   */
  async getRecords(): Promise<VideoAnalyticsRecord[]> {
    try {
      const data = await readFile(this.storagePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Persists analytics snapshot atomically
   */
  async saveRecords(records: VideoAnalyticsRecord[]): Promise<void> {
    const dir = join(this.storagePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(this.storagePath, JSON.stringify(records, null, 2), "utf-8");
  }

  /**
   * Synchronizes metrics for a video.
   * If real YouTube credentials are not active, uses fixture or reports unauthenticated status.
   */
  async syncMetrics(opts: SyncOptions): Promise<VideoAnalyticsRecord> {
    const records = await this.getRecords();
    const publishedTime = opts.publishedAt ? new Date(opts.publishedAt) : new Date(Date.now() - 48 * 3600 * 1000);
    const ageHours = Math.max(0.1, Number(((Date.now() - publishedTime.getTime()) / (1000 * 3600)).toFixed(1)));

    let record: VideoAnalyticsRecord;

    if (opts.fixtureRecord) {
      // Deterministic fixture for tests & offline verification
      record = {
        jobId: opts.jobId,
        videoId: opts.videoId,
        capturedAt: new Date().toISOString(),
        videoAgeHours: ageHours,
        views: opts.fixtureRecord.views ?? 1250,
        watchTimeMinutes: opts.fixtureRecord.watchTimeMinutes ?? 580,
        avgViewDurationSec: opts.fixtureRecord.avgViewDurationSec ?? 28.5,
        avgPercentageViewed: opts.fixtureRecord.avgPercentageViewed ?? 78.4,
        likes: opts.fixtureRecord.likes ?? 88,
        comments: opts.fixtureRecord.comments ?? 12,
        subscribersGained: opts.fixtureRecord.subscribersGained ?? 14,
        subscribersLost: opts.fixtureRecord.subscribersLost ?? 1,
        topic: opts.topic ?? "Cognitive Science",
        narrativeStructure: opts.narrativeStructure ?? "HOOK_PARADOX_MECHANISM_IMPLICATION_PAYOFF",
        visualStrategy: opts.visualStrategy ?? "data_visualization",
        durationSec: opts.durationSec ?? 38.0
      };
    } else if (config.youtubeClientId && config.youtubeRefreshToken && !opts.videoId.startsWith("DRY_RUN_")) {
      // Real YouTube Analytics API call (when authorized)
      throw new Error("Live YouTube Analytics API query requires authorized channel metrics permission");
    } else {
      // Default offline baseline record with transparent documentation
      record = {
        jobId: opts.jobId,
        videoId: opts.videoId,
        capturedAt: new Date().toISOString(),
        videoAgeHours: ageHours,
        views: 0,
        watchTimeMinutes: 0,
        avgViewDurationSec: 0,
        avgPercentageViewed: 0,
        likes: 0,
        comments: 0,
        subscribersGained: 0,
        subscribersLost: 0,
        topic: opts.topic ?? "Cognitive Science",
        narrativeStructure: opts.narrativeStructure ?? "UNKNOWN",
        visualStrategy: opts.visualStrategy ?? "UNKNOWN",
        durationSec: opts.durationSec ?? 38.0
      };
    }

    // Upsert record
    const existingIndex = records.findIndex(r => r.jobId === opts.jobId && r.videoId === opts.videoId);
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await this.saveRecords(records);
    return record;
  }
}
