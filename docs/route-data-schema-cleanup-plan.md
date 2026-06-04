# Route Data Schema Cleanup Plan

## Goal

The goal of this cleanup is to define a stable final route data schema for Split Timer.

The current route files work, but they contain a mix of:

* Route definition data
* Confirmed timing data
* Compatibility fields from earlier versions of the app
* Temporary run/progress fields
* Display-formatted timing strings and newer canonical millisecond fields

Before removing the timing compatibility layer, the app should have a clearer route data contract.

The final route schema should make it clear:

* Which fields belong permanently in route JSON files
* Which fields are confirmed/saved timing data
* Which fields are temporary active-run/session data and should not be saved to clean route files
* Which timing fields are legacy compatibility fields
* How route files should be migrated over time

## Current Route Data Inventory

Current user-facing route files include:

```txt
act-1-100-percent.json
act-2-100-percent.json
```

Older route files and test files may exist in legacy/archive locations, but they should not be treated as the final user-facing route schema.

## Current Route-Level Fields

Current route files may include these top-level fields:

```txt
schemaVersion
routeId
name
personalBest
personalBestMs
sumOfBest
sumOfBestMs
segments
currentSegmentId
currentSegmentName
```

The newer canonical fields are:

```txt
schemaVersion
routeId
personalBestMs
sumOfBestMs
```

The older display/compatibility fields are:

```txt
personalBest
sumOfBest
```

The route-progress/session fields are:

```txt
currentSegmentId
currentSegmentName
```

These are currently still present in clean route files, but they should eventually be moved out of route JSON and treated as temporary active-run/session state.

## Current Segment-Level Fields

Current segment objects may include:

```txt
id
name
order
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
pbSplitMs
pbSegmentMs
goldSegmentMs
```

The newer canonical timing fields are:

```txt
pbSplitMs
pbSegmentMs
goldSegmentMs
```

The current display/compatibility timing fields are:

```txt
time
duration
bestTime
pbSplitTime
pbSegmentDuration
goldSplit
segmentDuration
```

Not every field has the same meaning:

* `pbSplitMs` = cumulative PB split time at the end of the segment, stored in milliseconds
* `pbSegmentMs` = PB segment duration, stored in milliseconds
* `goldSegmentMs` = best saved segment duration, stored in milliseconds
* `pbSplitTime` = display/compatibility cumulative PB split time
* `pbSegmentDuration` = display/compatibility PB segment duration
* `goldSplit` = display/compatibility best saved segment duration
* `time` = legacy/display cumulative split time
* `duration` = legacy/display segment duration
* `bestTime` = legacy/display gold segment duration
* `segmentDuration` = older active-run segment duration field
* `completed` = temporary active-run progress
* `allowSetTime` = should eventually apply only to subsegments

## Current Subsegment-Level Fields

Current subsegment objects may include:

```txt
id
description
order
time
allowSetTime
completed
setTimeMs
```

Subsegments are currently treated as visual/checklist helpers.

The newer canonical subsegment timing field is:

```txt
setTimeMs
```

This should be used only for reference/display timing when the user explicitly sets a subsegment time. It should not affect the main route timing calculations.

## Current Problems

### 1. Route definition data and run-progress data are mixed

Top-level fields such as:

```txt
currentSegmentId
currentSegmentName
```

represent route progress or current UI/session state. That kind of data may be useful during an active run, but it should not be treated as permanent route definition data.

Eventually, clean route files should not need these fields.

### 2. Segment timing fields are overloaded

Segment-level timing fields currently include several names that overlap in meaning:

```txt
time
duration
bestTime
segmentDuration
pbSplitTime
pbSegmentDuration
goldSplit
pbSplitMs
pbSegmentMs
goldSegmentMs
```

Some fields are cumulative split times. Some are segment durations. Some are legacy display fields. Some are newer canonical millisecond fields.

This makes the app harder to reason about because code has to know which field is authoritative in each context.

### 3. Compatibility fields are still present

The app currently uses a timing-field compatibility layer because route timing data has evolved over time.

That compatibility layer is useful during transition, but the long-term goal should be to migrate route files to one canonical timing shape and eventually remove compatibility fallback logic.

### 4. Temporary active-run data can accidentally look like confirmed route data

Fields such as:

```txt
completed
currentSegmentId
currentSegmentName
```

may be useful during an active run, but they are risky if saved into route files as if they are confirmed route data.

The route schema should make a clean distinction between:

* Permanent route data
* Confirmed timing data
* Temporary run/session data

## Decisions for First Migration Pass

For the first schema migration pass, the project will follow these decisions:

* Confirmed timing values should be stored as numbers in milliseconds.
* Final timing field names should use an explicit `Ms` suffix when the stored value is a millisecond number.
* Formatted time strings should be generated by the UI for display.
* During the transition, route files may still keep display/compatibility string fields.
* `currentSegmentId`, `currentSegmentName`, and `completed` should be treated as temporary active-run/session data.
* Subsegments should be visual/checklist-only for the first migration pass.
* Subsegments should not have their own PB/gold timing data.
* Subsegment timing should not interact with the main route timing calculations.
* User-selected subsegments may still support a `Set Time` button that saves a display/reference split time.
* Subsegments should receive stable IDs.
* Segment and subsegment order should be stored separately from identity.
* `allowSetTime` should eventually exist on subsegments only.
* Main segments should not need `allowSetTime` if confirmed segment timing is handled through the normal run/PB/gold workflow.
* Test route files should eventually move to a dedicated test fixture location or be separated from real user-facing route data.

## Current Timing Field Meanings

Current working interpretation:

```txt
time
```

Legacy/display cumulative split time.

```txt
duration
```

Legacy/display segment duration.

```txt
bestTime
```

Legacy/display best segment duration. This maps conceptually to `goldSplit`.

```txt
segmentDuration
```

Older active-run segment duration field. This should not be part of the final clean route schema.

```txt
pbSplitTime
```

Display/compatibility cumulative PB split time at the end of the segment.

```txt
pbSegmentDuration
```

Display/compatibility PB segment duration.

```txt
goldSplit
```

Display/compatibility best saved segment duration. Despite the name, this is not a cumulative split time.

```txt
pbSplitMs
```

Canonical cumulative PB split time in milliseconds.

```txt
pbSegmentMs
```

Canonical PB segment duration in milliseconds.

```txt
goldSegmentMs
```

Canonical best saved segment duration in milliseconds.

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
      "id": "segment-get-silk-spear",
      "name": "Get Silk Spear",
      "order": 1,
      "pbSplitMs": null,
      "pbSegmentMs": null,
      "goldSegmentMs": null,
      "subSegments": [
        {
          "id": "subsegment-enter-room",
          "description": "Enter room",
          "order": 1,
          "allowSetTime": true,
          "setTimeMs": null
        }
      ]
    }
  ]
}
```

This is a planning example, not a final decision.

The exact names may change, but the important principles are:

* Use one canonical timing format.
* Store confirmed timing values as millisecond numbers.
* Avoid storing display-formatted time strings as the source of truth.
* Keep temporary active-run/session state out of route JSON files.
* Make field names describe whether a time is cumulative or segment-only.
* Use stable IDs that can survive future editing and drag-and-drop reordering.

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
personalBest
sumOfBest
currentSegmentId
currentSegmentName
```

`personalBest` and `sumOfBest` are display/compatibility fields. They may remain during transition, but eventually the canonical source of truth should be:

```txt
personalBestMs
sumOfBestMs
```

`currentSegmentId` and `currentSegmentName` should be treated as temporary active-run/session data. They should eventually be removed from clean route JSON files and stored somewhere else, such as:

* `localStorage` active-run state
* future temporary active-run files
* in-memory session state

Another option is to derive the starting segment from the first segment in the route instead of storing route-level current segment fields.

## Segment-Level Fields

Recommended long-term segment-level fields:

```txt
id
name
order
pbSplitMs
pbSegmentMs
goldSegmentMs
subSegments
```

### Segment-Level Fields to Review

Current fields that need migration or removal decisions:

```txt
time
duration
bestTime
segmentDuration
pbSplitTime
pbSegmentDuration
goldSplit
completed
allowSetTime
```

Recommended direction:

* `time` should eventually be removed.
* `duration` should eventually be removed.
* `bestTime` should eventually be removed.
* `segmentDuration` should eventually be removed.
* `pbSplitTime` should eventually be generated from `pbSplitMs`.
* `pbSegmentDuration` should eventually be generated from `pbSegmentMs`.
* `goldSplit` should eventually be generated from `goldSegmentMs`.
* `completed` should move to active-run/session state.
* `allowSetTime` should move to subsegments only.

## Subsegment-Level Fields

The current route files use `subSegments` on segment objects.

Current subsegment fields include:

```txt
id
description
order
time
allowSetTime
completed
setTimeMs
```

The first migration pass will treat subsegments as visual/checklist-only route helpers. Subsegments should not have their own PB/gold timing data, and their timing should not interact with main segment timing calculations.

However, user-selected subsegments may still support a `Set Time` button.

That time can be saved to the route JSON file and displayed in the UI as a reference time, but it should not affect:

* PB calculations
* Gold split calculations
* Sum of best
* Route completion timing

Recommended long-term subsegment-level fields:

```txt
id
description
order
allowSetTime
setTimeMs
```

Possible final shape:

```json
{
  "id": "subsegment-enter-room",
  "description": "Enter room",
  "order": 1,
  "allowSetTime": true,
  "setTimeMs": null
}
```

### Subsegment Fields to Remove or Treat as Temporary

```txt
time
completed
```

`time` should eventually migrate to `setTimeMs`.

`completed` should be treated as temporary active-run/session data, not clean route JSON data.

### Subsegment Timing Decision

Subsegment timing should be visual/reference-only for the first migration pass.

Subsegment times:

* may be saved when the user explicitly clicks a `Set Time` button
* may be displayed in the UI
* should not affect segment PB calculations
* should not affect gold split calculations
* should not affect sum of best
* should not affect route completion timing

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
last completed run review state
sidebar active tab state
```

This data may still need to be stored somewhere, but it should not become part of the clean route JSON schema.

Possible temporary storage locations:

* current `localStorage` active-run state
* future temporary active-run files
* in-memory session state

## SplitTimerController and Schema Responsibility

`SplitTimerController` should not become responsible for deeply understanding every legacy route shape. Its long-term role should be to coordinate route loading, run state, UI controllers, and save workflows.

Schema-specific work should remain delegated where possible:

* `RouteDataService` should load, validate, and normalize route data.
* Timing compatibility helpers should translate legacy fields into the current working shape during transition.
* `RunSaveService` should update confirmed timing fields during save workflows.
* Future schema migration tools or scripts should update route JSON files directly.

The long-term goal is for `SplitTimerController` to work against a stable route data contract instead of constantly handling legacy compatibility details.

## Migration Plan

The route schema cleanup should happen in phases.

### Phase 1: Document Current Fields

* Inventory all route-level fields.
* Inventory all segment-level fields.
* Inventory subsegment fields.
* Identify which fields are current, legacy, confirmed, or temporary.

### Phase 2: Define Final Schema

* Decide final route-level field names.
* Decide final segment-level field names.
* Decide final subsegment-level field names.
* Use millisecond number fields with explicit `Ms` suffixes.
* Add `schemaVersion`.
* Decide final ID format for routes, segments, and subsegments.

### Phase 3: Add Schema Normalization

* Keep existing route files working.
* Normalize older route data into the current in-memory shape when loaded.
* Add tests for normalization behavior.
* Preserve compatibility with existing route JSON files during the transition.

### Phase 4: Migrate Route Files

* Update user-facing route JSON files toward the current schema.
* Add canonical millisecond fields.
* Add route, segment, and subsegment IDs.
* Add order fields.
* Move old route versions to a legacy/archive location if needed.
* Verify route loading, timing calculations, PB saving, gold split saving, subsegment display, and route switching still work.

### Phase 5: Move Test Routes to Fixtures

* Move test route files to a dedicated fixture location.
* Keep test route data separate from real user-facing route data.
* Decide how the app should intentionally load test routes during development/testing.
* Ensure normal route dropdown behavior does not accidentally mix real routes and test fixtures unless intentionally configured.

### Phase 6: Remove Compatibility Layer

* Remove old timing-field fallback logic.
* Update tests to expect the final schema only.
* Keep migration tests only if old route files still need to be supported.

## Compatibility Layer Removal Plan

The timing compatibility layer should not be removed until:

* all user-facing route files have been migrated
* final schema tests exist
* route loading tests pass with migrated files
* run save behavior tests pass with migrated files
* PB and gold split workflow tests pass with migrated files
* route file write behavior tests prove temporary data is not written to route files
* subsegment `Set Time` behavior is verified not to affect main timing calculations
* `SplitTimerController` and related services/controllers are working against the current route data contract

After that, compatibility helpers can be removed or simplified.

## Open Questions

* What exact string ID format should routes, segments, and subsegments use?
* Should IDs be human-readable slugs, generated IDs, or a mix of both?
* Should subsegment `setTimeMs` be the final field name for visual/reference-only subsegment times?
* Should subsegment `time` migrate directly to `setTimeMs`, or should old subsegment times be reviewed manually?
* Should route files include `game` and `category` fields now, or should those wait until later?
* Should `sumOfBestMs` be stored in the route file or derived from segment `goldSegmentMs` values?
* What should happen to existing `bestTime` values during migration?
* Should test routes be hidden from the normal route dropdown by default?
* How should the app intentionally expose test routes during development/testing?
* When should display/compatibility string fields be removed from route files?
* Should the app keep saving compatibility string fields until the UI fully reads from canonical millisecond fields?
