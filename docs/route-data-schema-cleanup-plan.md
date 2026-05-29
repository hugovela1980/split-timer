# Route Data Schema Cleanup Plan

## Goal

The goal of this cleanup is to define a stable final route data schema for Split Timer.

The current route files work, but they contain a mix of route definition data, confirmed timing data, compatibility fields, and temporary run/progress fields. Before removing the timing compatibility layer or splitting larger modules like `RouteLoader`, the app should have a clearer route data contract.

The final route schema should make it clear:

* Which fields belong permanently in route JSON files
* Which fields are confirmed/saved timing data
* Which fields are temporary active-run/session data and should not be saved to route files
* Which timing fields are legacy compatibility fields
* How route files should be migrated over time

## Current Route Data Inventory

Current route files inspected:

* `act-1-100-percent.json`
* `act-2-100-percent.json`
* `test-gold-split-fix.json`
* `test-run-2.json`

### Current Route-Level Fields

All inspected route files currently include these top-level fields:

```txt
name
personalBest
sumOfBest
segments
currentSegmentId
currentSegmentName
```

### Current Segment-Level Fields

The inspected route files include these segment-level fields:

```txt
id
name
time
duration
bestTime
allowSetTime
completed
subSegments
segmentDuration
pbSplitTime
pbSegmentDuration
goldSplit
```

Not every file has every segment-level field. For example:

* `act-1-100-percent.json` includes `segmentDuration`
* the other inspected files include `completed`
* all inspected files include timing fields such as `time`, `duration`, `bestTime`, `pbSplitTime`, `pbSegmentDuration`, and `goldSplit`

### Current Subsegment-Level Fields

Subsegments were found in:

* `act-1-100-percent.json`
* `act-2-100-percent.json`

Current subsegment-level fields include:

```txt
description
time
allowSetTime
completed
```

Observed examples:

* `act-1-100-percent.json`

  * first subsegment keys: `description`, `time`, `allowSetTime`
* `act-2-100-percent.json`

  * first subsegment keys: `description`, `time`, `completed`, `allowSetTime`

Subsegments were not found in:

* `test-gold-split-fix.json`
* `test-run-2.json`

## Current Problems

### 1. Route definition data and run-progress data are mixed

Top-level fields such as `currentSegmentId` and `currentSegmentName` appear to represent current progress through a route.

That kind of data may be useful during an active run, but it should be treated carefully. If it represents temporary active-run progress, it should not be saved permanently into clean route JSON files.

### 2. Segment timing fields are overloaded

Segment-level timing fields currently include several names that may overlap in meaning:

```txt
time
duration
bestTime
segmentDuration
pbSplitTime
pbSegmentDuration
goldSplit
```

Some of these may represent cumulative split times, some may represent individual segment durations, and some may exist because the data model changed over time.

This makes the app harder to reason about because the code needs to know which field is authoritative in each context.

### 3. Compatibility fields are still present

The app currently uses a timing-field compatibility layer because route timing data has evolved over time.

That compatibility layer is useful during transition, but the long-term goal should be to migrate route files to one canonical timing shape and eventually remove compatibility logic.

### 4. Temporary active-run data can accidentally look like confirmed route data

Fields such as `completed`, `currentSegmentId`, and `currentSegmentName` may be useful while a run is active, but they are risky if they are saved into route files as if they are confirmed route data.

The route schema should make a clean distinction between:

* permanent route data
* confirmed timing data
* temporary run/session data

## Final Route JSON Shape

The final route schema should include a `schemaVersion` field and use one canonical timing format.

A possible future shape:

```json
{
  "schemaVersion": 2,
  "routeId": "act-1-100-percent",
  "name": "Act 1 100%",
  "game": "Hollow Knight: Silksong",
  "category": "100%",
  "personalBestMs": null,
  "sumOfBestMs": null,
  "segments": [
    {
      "id": 1,
      "name": "Example Segment",
      "order": 1,
      "allowSetTime": true,
      "pbSplitMs": null,
      "pbSegmentMs": null,
      "goldSegmentMs": null,
      "subSegments": []
    }
  ]
}
```

This is a planning example, not a final decision. The exact names may change, but the important principles are:

* use one canonical timing format
* avoid storing display-formatted time strings as the source of truth
* keep temporary active-run/session state out of route JSON files
* make field names describe whether a time is cumulative or segment-only

## Route-Level Fields

Recommended long-term route-level fields:

```txt
schemaVersion
routeId
name
game
category
personalBestMs
sumOfBestMs
segments
```

### Route-Level Fields to Review

```txt
currentSegmentId
currentSegmentName
```

These fields need a decision.

If they represent temporary active-run progress, they should eventually be removed from clean route JSON files and stored somewhere else.

If they represent the default selected segment when a route loads, they should be renamed to make that purpose clearer.

Possible future alternatives:

```txt
startingSegmentId
startingSegmentName
```

Another option is to remove these fields entirely and derive the starting segment from the first segment in the route.

## Segment-Level Fields

Recommended long-term segment-level fields:

```txt
id
name
order
allowSetTime
pbSplitMs
pbSegmentMs
goldSegmentMs
subSegments
```

### Segment-Level Fields to Review

Current fields that need a final decision:

```txt
time
duration
bestTime
segmentDuration
pbSplitTime
pbSegmentDuration
goldSplit
completed
```

Possible interpretation:

* `pbSplitTime` may represent cumulative PB split time at the end of the segment
* `pbSegmentDuration` may represent the segment duration from the PB run
* `goldSplit` may represent the best known segment duration
* `completed` may represent temporary active-run progress
* `time`, `duration`, `bestTime`, and `segmentDuration` may be older or compatibility-era fields

These meanings should be verified before migration.

## Subsegment-Level Fields

The current route files use `subSegments` on segment objects.

Current subsegment fields include:

```txt
description
time
allowSetTime
completed
```

The future behavior of subsegments still needs to be decided.

The current field names suggest that subsegments may have been intended to support timing or checklist-style completion behavior. However, it is not yet clear whether subsegments should become fully timed entities with their own PB/gold data or remain descriptive helper items inside a larger segment.

Possible options:

### Option A: Subsegments are visual/checklist-only

Subsegments help describe what happens inside a segment, but they do not have their own saved timing data.

Possible final shape:

```json
{
  "id": "sub-1",
  "description": "Example subsegment",
  "order": 1,
  "allowSetTime": true
}
```

### Option B: Subsegments are active-run timing/checklist helpers

Subsegments can help track temporary progress during a run, but only parent segments save confirmed PB/gold data to the route file.

Possible final shape:

```json
{
  "id": "sub-1",
  "description": "Example subsegment",
  "order": 1,
  "allowSetTime": true
}
```

Temporary fields such as `completed` would live in active-run/session state, not in the clean route JSON file.

This is the tentative recommended direction because it keeps the schema simpler while still allowing subsegments to support route guidance or active-run progress.

### Option C: Subsegments become fully timed saved entities

Subsegments can have their own saved timing data, PBs, and golds.

Possible final shape:

```json
{
  "id": "sub-1",
  "description": "Example subsegment",
  "order": 1,
  "allowSetTime": true,
  "pbSplitMs": null,
  "pbSegmentMs": null,
  "goldSegmentMs": null
}
```

This would make subsegments more powerful, but it would also make timing calculations, save workflows, and route file migration more complex.

This decision should be finalized before the route schema is locked.

## Confirmed Timing Data

Confirmed timing data is timing data that the user intentionally saves to the route file.

Examples:

```txt
personalBestMs
sumOfBestMs
pbSplitMs
pbSegmentMs
goldSegmentMs
```

Recommended rule:

```txt
Confirmed route timing data should be stored as numbers in milliseconds.
Formatted time strings should be generated for display only.
```

This makes calculations, comparisons, sorting, and tests simpler.

For example:

```json
{
  "pbSplitMs": 372500,
  "pbSegmentMs": 42100,
  "goldSegmentMs": 39750
}
```

The UI can format those values as needed:

```txt
06:12.500
00:42.100
00:39.750
```

## Data That Should Not Be Saved to Route Files

The following data should be treated as temporary active-run or session data unless there is a strong reason to preserve it:

```txt
currentSegmentId
currentSegmentName
completed
active run progress
session-only set segments
session-only gold split candidates
temporary comparison state
temporary run completion preview data
stopwatch running state
```

This data may still need to be stored somewhere, but it should not become part of the clean route JSON schema.

Possible temporary storage locations:

* current localStorage active-run state
* future temporary active-run files
* in-memory session state

## Tentative Direction

The current preferred direction is:

* Add a `schemaVersion` field to route files.
* Store confirmed timing values as numbers in milliseconds.
* Use formatted time strings only for display.
* Keep temporary active-run progress out of route JSON files.
* Treat `completed`, `currentSegmentId`, and `currentSegmentName` as temporary/session-oriented unless a stronger permanent purpose is identified.
* Treat subsegments as active-run timing/checklist helpers for now, not full PB/gold entities.
* Keep PB/gold timing data at the parent segment level unless the app later needs subsegment-level PB/gold tracking.
* Migrate route files gradually while the compatibility layer remains in place.
* Remove the compatibility layer only after route files and tests fully support the final schema.

## Migration Plan

The route schema cleanup should happen in phases.

### Phase 1: Document Current Fields

* Inventory all route-level fields
* Inventory all segment-level fields
* Inventory subsegment fields
* Identify which fields are current, legacy, confirmed, or temporary

### Phase 2: Define Final Schema

* Decide final route-level field names
* Decide final segment-level field names
* Decide whether subsegments are timed, active-run helpers, or visual-only checklist items
* Decide canonical timing format
* Add `schemaVersion`

### Phase 3: Add Schema Normalization

* Keep existing route files working
* Normalize older route data into the final in-memory shape when loaded
* Add tests for normalization behavior

### Phase 4: Migrate Route Files

* Update route JSON files to the final schema
* Remove old/duplicate timing fields from route files
* Verify route loading, timing calculations, PB saving, gold split saving, and route switching still work

### Phase 5: Remove Compatibility Layer

* Remove old timing-field fallback logic
* Update tests to expect the final schema only
* Keep migration tests only if old route files still need to be supported

## Compatibility Layer Removal Plan

The timing compatibility layer should not be removed until:

* all route files have been migrated
* final schema tests exist
* route loading tests pass with migrated files
* run save behavior tests pass with migrated files
* PB and gold split workflow tests pass with migrated files
* route file write behavior tests prove temporary data is not written to route files

After that, compatibility helpers can be removed or simplified.

## Open Questions

* Should route files keep `currentSegmentId` and `currentSegmentName`, or should those be temporary active-run fields?
* Are subsegments intended to be timed in the future, active-run/checklist helpers, or only visual helper items?
* Should subsegments receive stable IDs, or is their order inside the parent segment enough?
* Should subsegment `time` be kept as a route-planning field, converted to milliseconds, or removed from clean route files?
* Should `allowSetTime` exist on both segments and subsegments in the final schema?
* What is the exact difference between `time`, `duration`, `bestTime`, and `segmentDuration` in the current files?
* Is `goldSplit` currently a segment duration, cumulative split time, or something else?
* Should final field names use `Ms` suffixes to make millisecond values explicit?
* Should route IDs remain numeric segment IDs, or should they eventually become stable string IDs?
* Should test route files live in the same route directory as real route files, or should they move to a dedicated test fixture location?
