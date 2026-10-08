import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import type { ScheduleConfig, PublicationQueueItem } from "../types.js";

export class PublicationScheduler {
  private queueFilePath: string;
  private scheduleConfig: ScheduleConfig;

  constructor(
    queueRoot = "data/publishing",
    scheduleConfig: Partial<ScheduleConfig> = {}
  ) {
    this.queueFilePath = join(queueRoot, "schedule-queue.json");
    this.scheduleConfig = {
      timezone: scheduleConfig.timezone ?? config.scheduleTimezone,
      slotsPerDay: scheduleConfig.slotsPerDay ?? config.scheduleDailyTarget,
      slotTimes: scheduleConfig.slotTimes ?? [
        "09:00",
        "12:00",
        "15:00",
        "17:00",
        "19:00",
        "21:00"
      ],
      enabled: scheduleConfig.enabled ?? true
    };
  }

  /**
   * Retrieves current scheduled queue items
   */
  async getQueue(): Promise<PublicationQueueItem[]> {
    try {
      const content = await readFile(this.queueFilePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Persists the publication queue atomically
   */
  async saveQueue(queue: PublicationQueueItem[]): Promise<void> {
    const dir = join(this.queueFilePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(this.queueFilePath, JSON.stringify(queue, null, 2), "utf-8");
  }

  /**
   * Calculates the next available publishing window slot for a new approved Short.
   * Spreads publication across the 6 daily configured slots without collision.
   */
  async calculateNextSlot(fromDate: Date = new Date()): Promise<{ slotTime: string; isoTimestamp: string }> {
    const queue = await this.getQueue();
    const scheduledDates = new Set(
      queue
        .filter(q => q.status === "scheduled" || q.status === "pending")
        .map(q => q.scheduledFor)
    );

    const targetDate = new Date(fromDate);
    targetDate.setSeconds(0, 0);

    // Look ahead up to 14 days for the next empty slot
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() + dayOffset);

      for (const timeStr of this.scheduleConfig.slotTimes) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const slotCandidate = new Date(d);
        slotCandidate.setHours(hours, minutes, 0, 0);

        // If candidate is in the future and not already booked
        if (slotCandidate.getTime() > fromDate.getTime() + 10 * 60 * 1000) {
          const iso = slotCandidate.toISOString();
          if (!scheduledDates.has(iso)) {
            return {
              slotTime: timeStr,
              isoTimestamp: iso
            };
          }
        }
      }
    }

    // Default fallback: 2 hours in future
    const fallback = new Date(fromDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
    return { slotTime: "12:00", isoTimestamp: fallback };
  }

  /**
   * Enqueues an approved job into the publication schedule
   */
  async scheduleJob(
    jobId: string,
    title: string,
    explicitSlotIso?: string
  ): Promise<PublicationQueueItem> {
    const queue = await this.getQueue();

    // Check if already in queue
    const existing = queue.find(q => q.jobId === jobId);
    if (existing && existing.status !== "cancelled" && existing.status !== "missed") {
      return existing;
    }

    const slot = explicitSlotIso
      ? { slotTime: explicitSlotIso.slice(11, 16), isoTimestamp: explicitSlotIso }
      : await this.calculateNextSlot();

    const item: PublicationQueueItem = {
      id: `sched-${Date.now()}-${jobId.slice(0, 8)}`,
      jobId,
      title,
      scheduledFor: slot.isoTimestamp,
      status: "scheduled",
      retryCount: 0,
      updatedAt: new Date().toISOString()
    };

    queue.push(item);
    await this.saveQueue(queue);
    return item;
  }

  /**
   * Recovers missed or expired queue items
   */
  async reconcileQueue(): Promise<{ missedCount: number; activeCount: number }> {
    const queue = await this.getQueue();
    const now = new Date();
    let missedCount = 0;
    let activeCount = 0;

    for (const item of queue) {
      if (item.status === "scheduled") {
        const schedTime = new Date(item.scheduledFor);
        // If scheduled time was more than 3 hours ago and never published, mark as missed
        if (now.getTime() - schedTime.getTime() > 3 * 60 * 60 * 1000) {
          item.status = "missed";
          item.error = "Scheduled publication window elapsed without upload execution";
          item.updatedAt = now.toISOString();
          missedCount++;
        } else {
          activeCount++;
        }
      }
    }

    if (missedCount > 0) {
      await this.saveQueue(queue);
    }

    return { missedCount, activeCount };
  }

  /**
   * Returns schedule configuration
   */
  getConfig(): ScheduleConfig {
    return { ...this.scheduleConfig };
  }
}
