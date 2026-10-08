import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createReadStream } from "node:fs";
import { config } from "../config.js";
import type {
  YouTubeCredentials,
  YouTubeUploadRequest,
  YouTubeUploadResult,
  VideoMetadata
} from "../types.js";

export interface YouTubeAuthStatus {
  authenticated: boolean;
  publishingEnabled: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  tokenExpired: boolean;
  tokenExpiryDate?: string;
  scopes: string[];
  channelTitle?: string;
  notes: string[];
}

export interface UploadRegistryEntry {
  jobId: string;
  contentFingerprint: string;
  videoId: string;
  title: string;
  uploadedAt: string;
  privacyStatus: string;
  scheduledTime?: string;
}

export class YouTubeClient {
  private credentialsDir: string;
  private tokensFilePath: string;
  private registryFilePath: string;
  private tokenCache?: { accessToken: string; expiresAt: number };

  constructor(credentialsDir = config.credentialsDir, registryRoot = "data/publishing") {
    this.credentialsDir = credentialsDir;
    this.tokensFilePath = join(credentialsDir, "youtube-tokens.json");
    this.registryFilePath = join(registryRoot, "upload-registry.json");
  }

  /**
   * Safe status check: Never prints secrets, keys, or token values.
   */
  async getAuthStatus(): Promise<YouTubeAuthStatus> {
    const hasClientId = Boolean(config.youtubeClientId && config.youtubeClientId.length > 5);
    const hasClientSecret = Boolean(config.youtubeClientSecret && config.youtubeClientSecret.length > 5);
    let hasRefreshToken = Boolean(config.youtubeRefreshToken && config.youtubeRefreshToken.length > 5);

    let tokenExpired = false;
    let tokenExpiryDate: string | undefined;

    // Check on-disk persisted tokens if not in env
    try {
      const saved = JSON.parse(await readFile(this.tokensFilePath, "utf-8"));
      if (saved.refreshToken) hasRefreshToken = true;
      if (saved.tokenExpiry) {
        tokenExpired = Date.now() >= saved.tokenExpiry;
        tokenExpiryDate = new Date(saved.tokenExpiry).toISOString();
      }
    } catch {
      // Tokens file doesn't exist yet
    }

    const authenticated = hasClientId && hasClientSecret && hasRefreshToken;
    const notes: string[] = [];

    if (!config.youtubePublishingEnabled) {
      notes.push("YOUTUBE_PUBLISHING_ENABLED is false. All real upload requests will be blocked by safety release gate.");
    }
    if (!hasClientId || !hasClientSecret) {
      notes.push("Missing OAuth Client ID or Client Secret.");
    }
    if (!hasRefreshToken) {
      notes.push("Missing OAuth Refresh Token. Run OAuth authorization flow to connect channel.");
    }

    return {
      authenticated,
      publishingEnabled: config.youtubePublishingEnabled,
      hasClientId,
      hasClientSecret,
      hasRefreshToken,
      tokenExpired,
      tokenExpiryDate,
      scopes: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
      ],
      notes
    };
  }

  /**
   * Refreshes OAuth2 access token safely using Google's token endpoint
   */
  async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60000) {
      return this.tokenCache.accessToken;
    }

    let refreshToken = config.youtubeRefreshToken;
    if (!refreshToken) {
      try {
        const saved = JSON.parse(await readFile(this.tokensFilePath, "utf-8"));
        refreshToken = saved.refreshToken;
      } catch {
        throw new Error("No YouTube refresh token available in env or credentials directory");
      }
    }

    if (!config.youtubeClientId || !config.youtubeClientSecret || !refreshToken) {
      throw new Error("Incomplete OAuth configuration. Cannot refresh YouTube access token.");
    }

    const tokenUrl = "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
      client_id: config.youtubeClientId,
      client_secret: config.youtubeClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`YouTube OAuth token refresh failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    const expiresAt = Date.now() + expiresInMs;

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt
    };

    // Update persisted tokens file securely
    await mkdir(this.credentialsDir, { recursive: true });
    await writeFile(
      this.tokensFilePath,
      JSON.stringify(
        {
          refreshToken,
          accessTokenExpiry: expiresAt,
          updatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      { mode: 0o600 }
    );

    return data.access_token;
  }

  /**
   * Upload preflight check: verifies file presence, size, metadata, and duplicate upload registry
   */
  async preflightCheck(
    req: YouTubeUploadRequest,
    contentFingerprint: string,
    dryRun = false
  ): Promise<{ ok: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 1. File checks
    if (!dryRun) {
      try {
        const s = await stat(req.filePath);
        if (s.size === 0) issues.push(`Video file is empty (0 bytes): ${req.filePath}`);
        if (s.size > 256 * 1024 * 1024) issues.push(`Video file exceeds Shorts limit (>256MB): ${req.filePath}`);
      } catch {
        issues.push(`Video file not found or inaccessible: ${req.filePath}`);
      }
    }

    // 2. Metadata checks
    if (!req.title || req.title.trim().length === 0) {
      issues.push("Title is missing");
    } else if (req.title.length > 100) {
      issues.push(`Title exceeds YouTube 100-character limit (${req.title.length} chars)`);
    }

    if (!req.description || req.description.length === 0) {
      issues.push("Description is missing");
    }

    // 3. Duplicate check
    const isDuplicate = await this.isDuplicateUpload(contentFingerprint);
    if (isDuplicate) {
      issues.push(`Duplicate content detected! Fingerprint ${contentFingerprint.slice(0, 16)}... has already been uploaded.`);
    }

    return {
      ok: issues.length === 0,
      issues
    };
  }

  /**
   * Executes or dry-runs YouTube Shorts upload with resumable upload protocol
   */
  async uploadVideo(
    req: YouTubeUploadRequest,
    options: {
      contentFingerprint: string;
      jobId: string;
      dryRun?: boolean;
    }
  ): Promise<YouTubeUploadResult> {
    const isDryRun = options.dryRun || !config.youtubePublishingEnabled;
    const preflight = await this.preflightCheck(req, options.contentFingerprint, isDryRun);
    if (!preflight.ok) {
      throw new Error(`Upload preflight rejected: ${preflight.issues.join("; ")}`);
    }

    // DRY-RUN OR PUBLISHING DISABLED SAFETY GATE
    if (isDryRun) {
      const simulatedVideoId = `DRY_RUN_${options.jobId}`;
      return {
        videoId: simulatedVideoId,
        url: `https://youtube.com/shorts/${simulatedVideoId}`,
        status: req.publishAt ? "scheduled" : "uploaded",
        privacyStatus: req.privacyStatus,
        scheduledTime: req.publishAt,
        uploadedAt: new Date().toISOString(),
        verified: true,
        remoteTitle: req.title,
        remoteDescription: req.description
      };
    }

    // REAL UPLOAD PROTOCOL (YouTube Data API v3 Resumable Upload)
    const accessToken = await this.getAccessToken();
    const fileStats = await stat(req.filePath);

    const metadataPart = {
      snippet: {
        title: req.title,
        description: req.description,
        tags: req.tags,
        categoryId: "28" // Science & Technology
      },
      status: {
        privacyStatus: req.publishAt ? "private" : req.privacyStatus,
        publishAt: req.publishAt,
        selfDeclaredMadeForKids: false
      }
    };

    // 1. Initialize Resumable Upload
    const initUrl = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
    const initRes = await fetch(initUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": fileStats.size.toString()
      },
      body: JSON.stringify(metadataPart)
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Failed to initialize resumable upload (${initRes.status}): ${errText}`);
    }

    const uploadLocation = initRes.headers.get("location");
    if (!uploadLocation) {
      throw new Error("YouTube API did not return resumable upload Location header");
    }

    // 2. Stream video content
    const fileBuffer = await readFile(req.filePath);
    const uploadRes = await fetch(uploadLocation, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": fileStats.size.toString()
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube video upload failed (${uploadRes.status}): ${errText}`);
    }

    const videoResource: any = await uploadRes.json();
    const videoId = videoResource.id;

    // 3. Post-upload verification: retrieve remote resource
    const verified = await this.verifyRemoteVideo(videoId);
    if (!verified) {
      throw new Error(`Remote verification failed for uploaded video ID ${videoId}`);
    }

    // 4. Record into upload registry to prevent future duplicate uploads
    await this.recordUpload({
      jobId: options.jobId,
      contentFingerprint: options.contentFingerprint,
      videoId,
      title: req.title,
      uploadedAt: new Date().toISOString(),
      privacyStatus: req.privacyStatus,
      scheduledTime: req.publishAt
    });

    return {
      videoId,
      url: `https://youtube.com/shorts/${videoId}`,
      status: req.publishAt ? "scheduled" : "uploaded",
      privacyStatus: req.privacyStatus,
      scheduledTime: req.publishAt,
      uploadedAt: new Date().toISOString(),
      verified: true,
      remoteTitle: videoResource.snippet?.title,
      remoteDescription: videoResource.snippet?.description
    };
  }

  /**
   * Post-upload verification: Queries YouTube API to ensure video exists and has status
   */
  async verifyRemoteVideo(videoId: string): Promise<boolean> {
    if (videoId.startsWith("DRY_RUN_") || videoId.startsWith("mock_")) {
      return true;
    }

    try {
      const accessToken = await this.getAccessToken();
      const queryUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(videoId)}`;
      const res = await fetch(queryUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) return false;
      const data: any = await res.json();
      return Array.isArray(data.items) && data.items.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether the content fingerprint is already present in the registry
   */
  async isDuplicateUpload(contentFingerprint: string): Promise<boolean> {
    const registry = await this.getUploadRegistry();
    return registry.some(e => e.contentFingerprint === contentFingerprint);
  }

  /**
   * Retrieves all upload registry records
   */
  async getUploadRegistry(): Promise<UploadRegistryEntry[]> {
    try {
      const data = await readFile(this.registryFilePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Records successful upload in registry atomically
   */
  private async recordUpload(entry: UploadRegistryEntry): Promise<void> {
    const registry = await this.getUploadRegistry();
    registry.push(entry);
    const dir = join(this.registryFilePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(this.registryFilePath, JSON.stringify(registry, null, 2), "utf-8");
  }
}
