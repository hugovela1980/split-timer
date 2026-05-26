# Split Timer Project Backlog

## Current Version

- Current stable release: `v1.1.0`
- Stable branch: `main`
- Development branch: `develop`
- Next planned branch: `feature/vanilla-test-runner`

## Current Focus


## Next Up

- Add restart run workflow tests
  - Restarting a run should restore baseline route data
  - Restarting a run should clear active run/session state
  - Restarting a run should reset timer and current segment state
  - Restarting a run should not create unnecessary route file writes

- Add Save New PB workflow tests
  - PB run updates `personalBest`
  - PB run updates `pbSplitTime` / `time`
  - PB run updates `pbSegmentDuration` / `duration`
  - PB run updates improved `goldSplit` / `bestTime` values only when appropriate
  - PB run recalculates `sumOfBest` from `goldSplit`

- Add Save Gold Splits workflow tests
  - Non-PB run preserves `personalBest`
  - Non-PB run preserves PB split/duration fields
  - Non-PB run updates only improved `goldSplit` / `bestTime` values
  - Non-PB run recalculates `sumOfBest` from `goldSplit`

- Add Back to Start button
  - Return from main timer view to start screen
  - Reset timer and route session state
  - Confirm before leaving if active/unfinished run data exists

## Backlog

- Decide future subsegment timing behavior
- Improve Run Complete preview
- Migrate active run state from localStorage to temporary files
- Plan full route data schema cleanup
- Remove compatibility layer after route files fully migrate
- Evaluate GitHub Projects for issue tracking and project board workflow
- Add project documentation / architecture notes

## Completed

- [x] Create stable `v1.0.0` baseline
- [x] Add `main`, `develop`, and feature branch workflow
- [x] Add timing-field compatibility layer
  - `time` → `pbSplitTime`
  - `duration` → `pbSegmentDuration`
  - `bestTime` → `goldSplit`
- [x] Replace direct top-level segment timing reads with compatibility helpers
- [x] Add start screen route selector
- [x] Add create route action from start screen
- [x] Keep main app route selector available after entering app
- [x] Add confirmation before switching routes during active/unfinished runs
- [x] Sync start-screen route selector and main-app route selector
- [x] Prevent active run data from writing to official route files
- [x] Prevent route files from writing on load/switch
- [x] Remove automatic `route-data-backup.json` writes
- [x] Skip unchanged route file writes on the server
- [x] Fix gold split corruption
- [x] Prevent duration recalculation from mutating `goldSplit`
- [x] Restore live gold split indicators
- [x] Add run pace timer color behavior
- [x] Disable subsegment timing controls
- [x] Add short test routes for regression testing
- [x] Run regression tests for PB saves, non-PB gold saves, interrupted runs, and route file writes
- [x] Merge timing-field compatibility work into `develop`
- [x] Merge `develop` into `main`
- [x] Release `v1.1.0`
- [x] Build lightweight vanilla JavaScript test runner inspired by Vitest
- [x] Add workflow regression tests for route/run behavior

## Testing Strategy

This project will use a lightweight vanilla JavaScript test runner inspired by Vitest. The goal is to understand testing fundamentals while keeping the project dependency-light. The runner will use familiar testing patterns such as `describe`, `it`, `expect`, and mock functions, but it will stay small enough to be understandable and maintainable.

The test runner will be structured in a TypeScript-friendly way so it can later become a migration exercise if the project moves toward TypeScript.