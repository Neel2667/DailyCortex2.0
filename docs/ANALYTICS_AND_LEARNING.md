# DailyCortex 2.0 — Analytics & Learning System

## 1. Analytics Collection
DailyCortex integrates with YouTube Analytics API to track audience performance across published Shorts:

### Tracked Metrics
- **Views**: Total video impressions that converted into views.
- **Watch Time**: Total watch duration (in seconds).
- **Average View Duration (AVD)**: Average watch time per viewer.
- **Audience Retention %**: `AVD / Video Duration * 100`.
- **Likes & Comments**: Viewer engagement signals.
- **Subscribers Gained / Lost**: Channel conversion signal.
- **Publish Age Hours**: Duration since release at the time of recording.
- **View Velocity (views/hr)**: `Views / (Publish Age Hours + 1)`.

### Age-Normalized Comparison
Direct comparison of a 2-hour-old Short to a 30-day-old Short produces misleading conclusions. DailyCortex normalizes metric comparisons by tracking **View Velocity** and **Initial 48-Hour Retention %** rather than absolute cumulative views.

---

## 2. Learning Engine & Content Optimization
The `LearningEngine` (`src/analytics/learning-engine.ts`) runs statistical aggregation over published video performance:
1. **Narrative Architecture Ranking**:
   Compares average retention across templates:
   - `EMBARRASSING_MEMORY`
   - `DOORWAY_EFFECT`
   - `SPOTLIGHT_EFFECT`
   - `ZEIGARNIK_EFFECT`
2. **Visual Pacing Correlator**:
   Identifies whether motion graphic diagrams, live-action b-roll plates, or kinetic typography correlate with higher 3-second hook retention.
3. **Evidence-Based Experiment Generation**:
   Generates structured recommendations with confidence scores:
   ```json
   {
     "id": "rec-17914820",
     "type": "pacing",
     "hypothesis": "Faster cut rate (<2.5s per scene) increases completion rate for memory topics.",
     "evidence": "Videos with Scene Count >= 6 averaged 78.4% retention vs 64.2% for Scene Count <= 4.",
     "suggestedAction": "Test 6-scene partition for upcoming memory queue candidates.",
     "confidence": 0.88
   }
   ```
4. **Safety Boundary**:
   The Learning Engine **never** automatically relaxes quality gates or alters scientific accuracy criteria. All proposed changes are strictly advisory or bounded to narrative pacing variations.
