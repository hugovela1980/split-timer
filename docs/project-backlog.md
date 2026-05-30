# Split Timer Project Backlog

## Current Version

- Current stable release: `v1.1.0`
- Stable branch: `main`
- Development branch: `develop`
- Next planned branch: `feature/start-screen-route-tests`

## Current Focus

- [ ] Begin route schema cleanup implementation
  - [ ] Add schema normalization tests
  - [ ] Define canonical in-memory timing shape
  - [ ] Normalize legacy route fields to canonical `Ms` fields
  - [ ] Keep existing route files working
  - [ ] Do not remove compatibility fields yet

## Next Up

- [ ] Split `RouteLoader` into smaller modules/classes
  - [ ] Separate route loading/fetching logic
  - [ ] Separate start screen and route selection behavior
  - [ ] Separate run save / PB / gold split behavior
  - [ ] Separate editor-related behavior
  - [ ] Separate comparison / pacing / timing recalculation behavior

- [ ] Extract stopwatch logic from `public/js/app/main.js` into a dedicated stopwatch module
  - [ ] Preserve current event contract first (`stopwatch:start`, `stopwatch:stop`, `stopwatch:clear`, `run:complete`)
  - [ ] Add tests around stopwatch start/stop/clear behavior before refactoring
  - [ ] Keep `RouteLoader` communicating through events instead of direct stopwatch internals

- [ ] Add Back to Start button
  - [ ] Return from main timer view to start screen
  - [ ] Reset timer and route session state
  - [ ] Confirm before leaving if active/unfinished run data exists

## Future Refactors


- [ ] Fix confirmation message typo: “dicard” → “discard”
- [ ] Review duplicate stopwatch:clear dispatch during confirmed route switch
- [ ] Improve slug generation for percent symbols in route names

## Backlog

- [ ] Improve Run Complete preview
- [ ] Migrate active run state from localStorage to temporary files
- [ ] Remove compatibility layer after route files fully migrate
- [ ] Evaluate GitHub Projects for issue tracking and project board workflow
- [ ] Add TypeScript-friendly JSDoc comments to test runner
- [ ] Consider future TypeScript migration for test runner
- [ ] Consider future TypeScript migration for app modules

## Completed

- [x] Plan full route data schema cleanup / implementation pending
- [x] Create stable `v1.0.0` baseline
- [x] Add `main`, `develop`, and feature branch workflow
- [x] Add timing-field compatibility layer
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
- [x] Run manual regression tests for PB saves, non-PB gold saves, interrupted runs, and route file writes
- [x] Merge timing-field compatibility work into `develop`
- [x] Merge `develop` into `main`
- [x] Release `v1.1.0`
- [x] Build lightweight vanilla JavaScript test runner inspired by Vitest
- [x] Add route test fixtures
- [x] Add timing compatibility regression tests
- [x] Add route timing recalculation regression tests
- [x] Add run save behavior tests
- [x] Add route-file write behavior tests
- [x] Add workflow regression tests for route/run behavior
- [x] Add tests for route switching and start screen behavior