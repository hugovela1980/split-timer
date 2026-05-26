# Split Timer Project Backlog

## Current Version

- Current stable release: `v1.1.0`
- Stable branch: `main`
- Development branch: `develop`
- Next planned branch: `feature/vanilla-test-runner`

## Current Focus

- [ ] Build vanilla JavaScript test runner with Vitest-style syntax
  - Support `tester.describe()`
  - Support `tester.it()` / `tester.test()`
  - Support `tester.expect()`
  - Support basic matchers like `toBe()`, `toEqual()`, `toBeTruthy()`, and `toBeFalsy()`
  - Support simple mock/spying behavior with `tester.mock()` or `tester.fn()`

## Next Up

- [ ] Add timing compatibility regression tests
  - Test old/new timing field synchronization
  - Test `pbSplitTime`, `pbSegmentDuration`, and `goldSplit`
  - Confirm old fields `time`, `duration`, and `bestTime` remain synced during compatibility phase

- [ ] Add run save behavior tests
  - PB run updates PB split/duration fields correctly
  - Non-PB run preserves PB split/duration fields
  - Non-PB run saves improved gold splits only after confirmation
  - `sumOfBest` is calculated from `goldSplit`

- [ ] Add route-file write behavior tests
  - Loading a route should not write to route JSON files
  - Switching routes should not write to route JSON files
  - Active run data should not write to official route JSON files
  - Confirmed save actions should write route JSON files

- [ ] Add Back to Start button
  - Return from main timer view to start screen
  - Reset timer and route session state
  - Confirm before leaving if active/unfinished run data exists

## Backlog

- [ ] Decide future subsegment timing behavior
  - Determine whether subsegment times are checkpoints, notes, or true split data
  - Keep subsegment timing controls disabled until behavior is defined

- [ ] Improve Run Complete preview
  - Show projected `sumOfBest` before pressing Save New PB / Save Gold Splits
  - Show which segments golded during the completed run

- [ ] Migrate active run state from localStorage to temporary files
  - Keep official route files for confirmed PB/gold/route data only
  - Use temporary run-session files for active/in-progress run data

- [ ] Plan full route data schema cleanup
  - Decide final top-level segment shape
  - Decide whether route files should eventually remove old fields
  - Document final field meanings

- [ ] Remove compatibility layer after route files fully migrate
  - Remove old top-level segment fields `time`, `duration`, and `bestTime`
  - Remove fallback logic after migration is stable
  - Keep compatibility through at least one more stable release before removing

- [ ] Evaluate GitHub Projects for issue tracking and project board workflow
  - Compare Markdown backlog vs GitHub Issues/Projects
  - Decide whether a project board would improve task visibility

- [ ] Add project documentation / architecture notes
  - Explain client-side SPA structure
  - Explain lightweight Node file server
  - Explain confirmed route data vs temporary active-run data
  - Explain testing strategy

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