# DailyCortex 2.0

Automated YouTube content factory built around [Showtime](https://github.com/FavioVazquez/showtime).

## Goal

Turn a topic into a research-backed, visually planned, narrated, captioned and rendered video, then eventually publish and learn from analytics.

## Architecture

Research/content intelligence → Groq script generation → visual plan → asset providers (Pexels/Openverse/local) → Edge TTS → Showtime production/rendering → QA → YouTube publisher → analytics/learning.

Showtime is treated as the production engine, not as the whole automation system.

## Current status

Phase 0 foundation:
- typed content specification
- provider interfaces
- Groq, Pexels and Edge-TTS adapters
- Showtime CLI adapter
- deterministic manifest/job generation
- quality-gate model
- tests and GitHub Actions

Publishing and analytics are intentionally not implemented yet.

## Development

```bash
npm install
npm test
npm run typecheck
npm run dry-run
```

Copy `.env.example` to `.env` when integrating external providers. Never commit secrets.
