# DailyCortex 2.0 — Recovery, Retry & Resilience Architecture

## 1. Crash & Process Interruption Recovery
If the factory process terminates unexpectedly (e.g. system reboot, memory pressure, killed terminal process):
1. **Durable State Inspection**:
   Every job directory (`data/jobs/<job-id>/`) contains `job-state.json` recording:
   - Current stage (`QUEUED`, `RENDERING`, `QA_RUNNING`, etc.).
   - Full chronological transition history with timestamps and context.
   - Generated paths (script, voice WAV, project files, render MP4).
2. **Safe Resumption**:
   When `FactoryEngine.runJob()` or `factory run` is executed again:
   - Jobs in `COMPLETED` are loaded idempotently and returned without repeating expensive rendering or API calls.
   - Interrupted jobs in intermediate states transition cleanly back to `QUEUED` and resume from their last verified artifact (reusing valid cached Kokoro WAVs and Showtime projects).
   - Jobs in `FAILED` or `QA_FAILED` increment `retryCount` and can be retried up to `maxRetries` (default: 3).

---

## 2. Exponential Backoff & Retry Bounds
Network operations (e.g. Kokoro synthesis, Showtime asset downloads, YouTube uploads) implement bounded exponential backoff:
- **Base delay**: 1,000 ms.
- **Backoff multiplier**: $2^n$.
- **Max delay**: 30,000 ms.
- **Maximum attempts**: 3.

---

## 3. Duplicate Upload Prevention
To prevent duplicate videos on YouTube after a network glitch or process restart:
1. **Content Fingerprinting**:
   Every topic and script combination receives a deterministic 64-character SHA-256 fingerprint based on the core claims and script text:
   ```ts
   hash = createHash("sha256").update(`${topic.id}:${script.rawScript}`).digest("hex")
   ```
2. **Registry Check**:
   Before initiating an upload, `YouTubeClient` checks `data/registry/fingerprints.json`. If the fingerprint exists, the upload is aborted with:
   `Error: Duplicate content detected: Video with fingerprint ... already published.`
3. **Post-Upload Verification**:
   After upload, the remote video's status is retrieved via `GET /videos?id=<videoId>` to confirm YouTube successfully ingested the media before updating `job-state.json` to `UPLOADED_PRIVATE`.
