# Split Timer Project Backlog

## Current Version

- Current stable release: `v1.1.1`
- Stable branch: `main`
- Development branch: `develop`

## Current Focus

- [ ] Prevent Delete Run Data from writing route files
  - [ ] Restore baseline route state in memory only
  - [ ] Clear active/completed run state and localStorage session data
  - [ ] Preserve Last Run review
  - [ ] Ensure Delete Run Data does not call the route file saver
  - [ ] Keep confirmed save actions writing normally
  - [ ] Update tests and smoke test completed-run workflows

## Next Up

- [ ] Clean up route file saving service integration
  - [ ] Review current `file-saver.js` / `window.fileSaver` usage
  - [ ] Inject file-saving dependency into `RouteLoader`
  - [ ] Preserve `/api/health` availability check
  - [ ] Preserve `/api/save-route` file write behavior
  - [ ] Keep route file write behavior tests passing

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
- [ ] Prevent Delete Run Data from writing route files
  - [ ] Treat Delete Run Data as a discard/reset action, not a saved route-data change
  - [ ] Restore the baseline route in memory
  - [ ] Clear active-run localStorage/session state
  - [ ] Clear completed-run state and rerender the route/sidebar/comparison UI
  - [ ] Preserve Last Run review behavior if appropriate
  - [ ] Do not call `saveRouteDataToFile` or `routeFileSaver.saveRouteData`
  - [ ] Keep Save New PB and Save Gold Splits file-writing behavior unchanged
  - [ ] Add/update regression tests so Delete Run Data does not write route files
- [ ] Add force reload route-from-file behavior  
  During development/testing, manually restoring a route JSON file does not update the already-loaded in-memory route data. Add a way to force reload the current route from disk and clear active-run/session state so smoke tests can start from the actual saved file.
- [ ] Rename `RouteLoader` to `SplitTimerController`
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

## Notes
- First time running a route created by the home create route button, when values are blank, is treated as a non-pb when completed and shows some strange behavior

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
- [x] Split RouteLoader run save / PB / gold split behavior  
  Extracted core completed-run save calculations into `RunSaveService`, including gold split updates, sum of best recalculation, personal best updates, completed-run state creation, gold split save route creation, and canonical millisecond timing sync for Save New PB / Save Gold Splits workflows.
- [x] Consolidate RouteLoader refactor progress
- [x] Preserve completed-run review after saving or deleting run data  
  Added Current Run and Last Run sidebar tabs. The app now captures a session-only completed-run review before clearing run state, allowing the user to inspect the last completed run after Save Gold Splits, Save New PB, or Delete Run Data. Last Run displays completed split times, deltas using existing sidebar comparison colors, and a readable run summary.
- [x] Preserve completed-run review after saving or deleting run data  
  Added Current Run and Last Run sidebar tabs. The app now captures a session-only completed-run review before clearing active-run state, allowing the user to review the last completed run after Save New PB, Save Gold Splits, or Delete Run Data. Last Run displays completed split times, color-coded deltas, and a readable run summary. Starting a new run switches back to Current Run while preserving Last Run for the current route session; switching routes clears the Last Run review.
- [x] Extract RunSidebarController from RouteLoader  
  Moved sidebar review tab rendering and Last Run sidebar rendering into `RunSidebarController`. `RouteLoader` now delegates Current Run / Last Run tab UI behavior while preserving Last Run review data, split/delta display, summary rendering, active tab behavior, and existing sidebar smoke-tested workflows.
- [x] Move Current Run sidebar rendering into RunSidebarController  
  Moved current-run sidebar row rendering, split/delta display, gold-split styling, segment click behavior, subsegment click behavior, and sidebar context-menu wiring into `RunSidebarController`. `RouteLoader` now delegates both Current Run and Last Run sidebar rendering while preserving existing sidebar behavior.
- [x] Extract ComparisonPanelController from RouteLoader  
  Moved normal comparison panel rendering and Run Complete panel rendering into `ComparisonPanelController`. `RouteLoader` now delegates comparison UI generation while preserving LIVE / PAUSED / SAVED / IDLE status behavior, current split comparison display, run comparison display, Run Complete save/delete controls, and reset-run behavior.
- [x] Clean up route file saving service integration  
  Added an injectable `routeFileSaver` dependency to `RouteLoader` and removed direct file-saving logic from the save method. `RouteLoader` now prefers the injected file saver while preserving the existing `window.fileSaver` fallback for browser integration. Route file write behavior remains covered by tests.
- [x] Rename `RouteLoader` to `SplitTimerController`  
  Renamed the main app coordinator from `RouteLoader` to `SplitTimerController` and renamed `route-loader.js` to `split-timer-controller.js`. Updated app/test imports and constructor usage while preserving existing behavior.
- [x] Route switching controller extraction from `SplitTimerController`  
  Moved route-switching workflow responsibilities out of `SplitTimerController` into a dedicated controller/service layer while preserving route loading, route-switch confirmation, cancellation, and active-run safety behavior.