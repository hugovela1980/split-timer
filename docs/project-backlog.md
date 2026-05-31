# Split Timer Project Backlog

## Current Version

- Current stable release: `v1.1.1`
- Stable branch: `main`
- Development branch: `develop`

## Current Focus

- [ ] Continue splitting RouteLoader completed-run workflow
  - [ ] Review remaining completed-run save/delete/restart responsibilities in `RouteLoader`
  - [ ] Identify which logic belongs in `RunSaveService` versus UI/controller code
  - [ ] Preserve Save New PB behavior
  - [ ] Preserve Save Gold Splits behavior
  - [ ] Preserve Delete Run Data and Restart Run behavior
  - [ ] Keep run save, route file write, and completed-run UI tests passing

## Next Up

- [ ] Split `RouteLoader` into smaller modules/classes
  - [x] Separate route loading/fetching logic
  - [x] Separate start screen and route selection behavior
  - [x] Separate run save behavior
  - [x] Separate run PB / gold split behavior
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
- [ ] - [ ] Rename `RouteLoader` to `SplitTimerController`
  - [ ] Rename `public/js/app/route-loader.js` if appropriate
  - [ ] Update imports in app and tests
  - [ ] Preserve existing behavior with tests passing
  - [ ] Consider whether the old name should remain temporarily as an alias during transition
- [ ] Build support for 'not' in tester
- [ ] Clean up route file saving service integration
  - [ ] Review `public/js/services/file-saver.js` and its current `window.fileSaver` global usage
  - [ ] Decide whether to rename it to a clearer service name such as `RouteFileSaveService`
  - [ ] Inject the file-saving service into `RouteLoader` instead of reading from `window.fileSaver`
  - [ ] Preserve `/api/health` server availability checks
  - [ ] Preserve `/api/save-route` route file write behavior
  - [ ] Keep route file write behavior tests passing
- [ ] Review frontend folder structure after RouteLoader service extractions
  - [ ] Decide whether `public/js/persistence/storage.js` should remain as a low-level persistence helper
  - [ ] Consider moving storage helpers into a clearer infrastructure/services folder
  - [ ] Update imports in a separate cleanup commit after refactors stabilize
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
- [x] Begin route schema cleanup implementation — Phase 1  
  Added the first route data normalization layer: canonical millisecond timing fields, schema versioning, stable IDs, and order fields are now created during normalization while legacy fields and current route files remain supported.
- [x] Add route loading tests for schema normalization  
  Added RouteLoader integration tests confirming that legacy route data receives the new normalized schema fields when loaded, while existing canonical schema fields are preserved and not overwritten.
- [x] Split RouteLoader route-loading responsibilities  
  Extracted route fetching, route response unwrapping, route validation, and schema normalization into `RouteDataService`. `RouteLoader` now delegates route data loading to the service while preserving its public route-loading behavior.
- [x] Split RouteLoader start screen and route selection behavior  
  Extracted start screen route selection, start-route button behavior, Enter-key route loading, start-screen route creation flow, main app display, and stopwatch clear dispatch into `StartScreenController`. `RouteLoader` now delegates start screen behavior to the controller while preserving existing route switching and active-run confirmation behavior.
- [x] Split RouteLoader route selector population behavior  
  Extracted route list fetching and selector population into `RouteSelectorService`. `RouteLoader` now delegates main route selector population and start screen selector syncing to the service while preserving route dropdown loading and selector sync behavior.
- [x] Split RouteLoader storage and session persistence behavior  
  Extracted route data, baseline route, active-run route, run-session, and route-storage clearing behavior into `RouteStorageService`. `RouteLoader` now delegates storage persistence and restoration to the service while preserving existing localStorage behavior, run session persistence, and route save workflows.
- [x] Split RouteLoader run save / PB / gold split behavior  
  Extracted gold split update logic, sum of best recalculation, and personal best update logic into `RunSaveService`. `RouteLoader` now delegates core run-save calculations to the service while preserving existing Save New PB, Save Gold Splits, route file write, and run session behavior.
- [x] Fix Run Complete UI being lost after scrolling completed route  
  Fixed a completed-run state bug where scrolling the route after run completion could trigger current-segment progress updates, clear the Run Complete state, and remove the save/delete controls. Scroll-driven segment updates now preserve the Run Complete UI while unsaved completed-run data exists.
- [x] Split RouteLoader run save / PB / gold split behavior  
  Extracted core run-save calculations into `RunSaveService`, including gold split updates, sum of best recalculation, personal best updates, and gold split save route creation. Also fixed canonical timing sync so saved route data keeps legacy timing fields and millisecond fields aligned during Save Gold Splits / run-save workflows.