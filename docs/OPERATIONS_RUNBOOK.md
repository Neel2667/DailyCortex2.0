# DailyCortex 2.0 — Operations Runbook

## 1. Quick Operator Verification Commands

### System Health Doctor
Verify local ffmpeg, ffprobe, Showtime CLI, Node.js version, and provider configurations:
```bash
npx tsx src/cli.ts doctor
```

### Inspect Topic Queue & Claim Integrity
Examine verified scientific facts and anti-hallucination evidence:
```bash
npx tsx src/cli.ts research
```

### Check Job Queue Statuses
Inspect the durable state of all rendered and pending jobs:
```bash
npx tsx src/cli.ts queue
```

### Generate Metadata & Thumbnails
Generate YouTube metadata and a 1080×1920 thumbnail card for a topic:
```bash
npx tsx src/cli.ts metadata zeigarnik-effect
npx tsx src/cli.ts thumbnail zeigarnik-effect
```

### Audit the 20 Mandatory Quality Gates
Run an audit across all 20 quality gates for a specific job:
```bash
npx tsx src/cli.ts qa short-embarrassing-memories
```

### Dry-Run Publishing Test
Safely test the upload and scheduling logic with zero remote side effects:
```bash
npx tsx src/cli.ts publish --dry-run short-embarrassing-memories
```

### Inspect Publication Schedule Queue
Review scheduled video slots:
```bash
npx tsx src/cli.ts schedule
```

### Run Batch Factory
Run a bounded batch of jobs across the curated topic queue:
```bash
npx tsx src/cli.ts factory run --batch 2
```

---

## 2. Daily Production Routine

1. **Morning Doctor Check**:
   Run `npx tsx src/cli.ts doctor` to ensure rendering binaries are healthy.
2. **Batch Queue Run**:
   Run `npx tsx src/cli.ts factory run --batch 3` to produce candidate videos through the 20 quality gates.
3. **Review Awaiting Approval Queue**:
   Inspect generated MP4s and thumbnails in `data/jobs/<job-id>/`.
4. **Approve Release**:
   Once satisfied with visual pacing, approve the job for scheduling.
5. **Evening Analytics Sync**:
   Run `npx tsx src/cli.ts analytics sync <job-id>` and `npx tsx src/cli.ts analytics report` to monitor performance feedback and experiment recommendations.
