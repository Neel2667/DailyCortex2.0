# YouTube Data API v3 Setup & Security Guide

## 1. Safety Release Gate (Default Behavior)
By default, all YouTube publishing is disabled:
```env
YOUTUBE_PUBLISHING_ENABLED=false
```
When this variable is `false` (or when `--dry-run` is invoked):
- The `YouTubeClient` enters dry-run mode.
- No network requests are made to Google APIs.
- Upload calls return synthetic identifiers prefixed with `DRY_RUN_`.
- No remote video resources are created or modified.

---

## 2. Setting Up YouTube Data API v3 Credentials

### Step 1: Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `daily-cortex-production`).
3. Under **APIs & Services > Library**, enable:
   - **YouTube Data API v3**
   - **YouTube Analytics API** (optional, for metrics sync)

### Step 2: Configure OAuth 2.0 Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **User Type: External** (or Internal for Google Workspace).
3. Add required scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
4. Add your YouTube channel Google account as a Test User while in testing mode.

### Step 3: Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
2. Select Application Type: **Desktop App**.
3. Name it `DailyCortex Local Publisher`.
4. Download the client credentials JSON or copy the Client ID and Client Secret.

### Step 4: Configure Local Environment
Add the client credentials to your local `.env` file (never commit this file):
```env
YOUTUBE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
YOUTUBE_CLIENT_SECRET="your-client-secret"
YOUTUBE_REDIRECT_URI="http://localhost:8080/oauth2callback"
```

### Step 5: Authorize and Obtain Refresh Token
Run the local OAuth authorization flow or obtain a refresh token using Google's OAuth 2.0 Playground. Save the refresh token in `.env`:
```env
YOUTUBE_REFRESH_TOKEN="1//04...your-refresh-token"
```

---

## 3. Verifying Authentication Status
Inspect authentication status without leaking secrets:
```bash
npx tsx src/cli.ts youtube auth-status
```
Example Output:
```json
{
  "authenticated": true,
  "publishingEnabled": false,
  "hasClientId": true,
  "hasClientSecret": true,
  "hasRefreshToken": true,
  "tokenExpired": false,
  "scopes": [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
  ]
}
```

---

## 4. Enabling Production Publishing
To enable real publishing once all quality checks are satisfied:
1. Ensure your channel has uploaded videos manually and completed phone verification for custom thumbnails and API quota.
2. In `.env`:
   ```env
   YOUTUBE_PUBLISHING_ENABLED=true
   YOUTUBE_DEFAULT_PRIVACY="private"
   ```
3. Videos will upload as **Private** by default for operator review before public publication.
