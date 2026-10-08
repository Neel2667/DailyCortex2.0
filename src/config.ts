/**
 * DailyCortex 2.0 Configuration
 * Centralized, safe configuration manager.
 * Strict rule: NEVER log secrets or print API keys/tokens.
 */

export const config = {
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  pexelsApiKey: process.env.PEXELS_API_KEY ?? "",
  showtimeBin: process.env.SHOWTIME_BIN ?? "showtime",
  edgeTtsVoice: process.env.EDGE_TTS_VOICE ?? "en-US-AndrewNeural",

  // YouTube Integration (Disabled by default!)
  youtubePublishingEnabled: process.env.YOUTUBE_PUBLISHING_ENABLED === "true",
  youtubeClientId: process.env.YOUTUBE_CLIENT_ID ?? "",
  youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
  youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? "",
  youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI ?? "http://localhost:8080/oauth2callback",
  credentialsDir: process.env.CREDENTIALS_DIR ?? ".credentials",

  // Production Scheduling & Factory
  scheduleTimezone: process.env.SCHEDULE_TIMEZONE ?? "UTC",
  scheduleDailyTarget: Number(process.env.SCHEDULE_DAILY_TARGET ?? "6"),
  defaultPrivacyStatus: (process.env.DEFAULT_PRIVACY_STATUS as "private" | "unlisted" | "public") ?? "private",
  maxConcurrency: Number(process.env.MAX_CONCURRENCY ?? "1") // Safe for MacBook Air
} as const;
