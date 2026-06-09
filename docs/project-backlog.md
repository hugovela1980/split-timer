# Split Timer Project Backlog

## Current Version

- Current stable release: `v1.1.1`
- Stable branch: `main`
- Development branch: `develop`

## Current Focus

* [x] Create or update `README.md`

  * [ ] Explain what Split Timer does
  * [ ] Include setup/run instructions
  * [ ] Include test command
  * [ ] Briefly describe project architecture and testing approach
  * [ ] Add screenshots or GIFs if available
  * [ ] Add current version notes

* [x] Final full smoke test before main branch update

## Next Up


  * [ ] Open app and load route
  * [ ] Start / pause / resume / reset timer
  * [ ] Complete PB run and Save New PB
  * [ ] Complete non-PB run and Save Gold Splits
  * [ ] Delete Run Data and verify no route file write occurs
  * [ ] Review Last Run tab behavior
  * [ ] Switch routes with and without active run data
  * [ ] Add/delete/rename segment
  * [ ] Add subsegment
  * [ ] Clear Segment Split
  * [ ] Refresh browser and reload route
  * [ ] Run full unit test suite

* [ ] Prepare stable version for main branch

  * [ ] Confirm `develop` is clean
  * [ ] Confirm `npm test` passes
  * [ ] Merge `develop` into `main`
  * [ ] Tag stable version
  * [ ] Push `main` and tags

## Backlog

### Compatibility Layer Removal Path

* [ ] Verify all user-facing route files are fully migrated

  * [ ] Confirm each route has `schemaVersion`
  * [ ] Confirm each route has `routeId`
  * [ ] Confirm each segment has stable `id` and `order`
  * [ ] Confirm canonical millisecond fields exist where needed
  * [ ] Confirm subsegments have stable `id`, `order`, and `setTimeMs`

* [ ] Ensure route editor creates canonical route data

  * [ ] Add Segment should create all required canonical fields
  * [ ] Add Subsegment should create all required canonical fields
  * [ ] Create Route should create schema-complete route files
  * [ ] Rename/delete/clear actions should preserve schema consistency

* [ ] Audit route file write behavior before removing compatibility layer

  * [ ] Confirm route files are written only for intentional saved route-data changes
  * [ ] Confirm navigation, scrolling, tab switching, pause/resume, and Delete Run Data do not write route files
  * [ ] Confirm Save New PB and Save Gold Splits write expected canonical and transitional fields
  * [ ] Confirm route editor writes expected canonical and transitional fields

* [ ] Decide whether clean route writes should save normalized schema fields

  * [ ] Current app normalizes route data in memory
  * [ ] Decide whether saved route files should always use the normalized schema shape
  * [ ] If yes, ensure all route files are intentionally migrated before compatibility removal
  * [ ] If no, preserve raw file shape separately from normalized in-memory state

* [ ] Move test routes to fixtures or separate development-only route data

  * [ ] Keep user-facing routes separate from automated test data
  * [ ] Decide whether test routes should appear in the normal route dropdown
  * [ ] Update tests to use fixture data instead of public route files where possible

* [ ] Add final schema validation tests

  * [ ] Validate user-facing route files against expected schema
  * [ ] Validate editor-created routes
  * [ ] Validate route files after Save New PB
  * [ ] Validate route files after Save Gold Splits
  * [ ] Validate route files after route editor changes

* [ ] Shift UI display formatting toward canonical millisecond fields

  * [ ] Prefer `pbSplitMs`, `pbSegmentMs`, and `goldSegmentMs` as source of truth
  * [ ] Generate formatted display strings from millisecond values where possible
  * [ ] Reduce dependence on legacy display-string fields

* [ ] Remove timing compatibility layer after route files fully migrate

  * [ ] Remove old timing-field fallback logic
  * [ ] Update tests to expect final schema only
  * [ ] Keep migration tests only if old route imports still need support
  * [ ] Confirm PB, gold split, sum of best, comparison panel, sidebar, and Last Run behavior still work

### Stable Version Polish / Usability

* [ ] Fix sidebar overflow with long split times

  * [ ] Prevent sidebar table columns from exceeding the sidebar container width
  * [ ] Preserve readable `Segment | Split | Vs Best` layout for routes longer than one hour
  * [ ] Review spacing/font sizing for `HH:MM:SS` times and large positive/negative deltas
  * [ ] Avoid horizontal page overflow when sidebar content is wide
  * [ ] Smoke test with Act 1 / Act 2 routes and one-hour-plus split times

* [ ] Review whether Clear Segment Split should preserve current segment selection

  * [ ] Current behavior clears the target segment gold split correctly
  * [ ] Route-level `sumOfBest` updates correctly
  * [ ] Decide whether clear-split should preserve the user's current route/sidebar position

* [ ] Add force reload route-from-file behavior

  * [ ] During development/testing, manually restoring a route JSON file does not update already-loaded in-memory route data
  * [ ] Add a way to force reload the current route from disk
  * [ ] Clear active-run/session state during forced reload
  * [ ] Avoid relying on stale in-memory route data after manual route file edits

* [ ] Add Back to Start button

  * [ ] Return from main timer view to start screen
  * [ ] Reset timer and route session state
  * [ ] Confirm before leaving if active/unfinished run data exists

### Future Architecture / Tooling

* [ ] Review frontend folder structure after controller/service extractions

  * [ ] Decide whether `public/js/persistence/storage.js` should remain as a low-level persistence helper
  * [ ] Consider moving storage helpers into a clearer infrastructure/services folder
  * [ ] Update imports in a separate cleanup commit after refactors stabilize

* [ ] Extract stopwatch logic from `public/js/app/main.js` into a dedicated stopwatch module

  * [ ] Preserve current event contract first: `stopwatch:start`, `stopwatch:stop`, `stopwatch:clear`, `run:complete`
  * [ ] Add tests around stopwatch start/stop/clear behavior before refactoring
  * [ ] Keep `SplitTimerController` communicating through events instead of direct stopwatch internals

* [ ] Review duplicate `stopwatch:clear` dispatch during confirmed route switch

* [ ] Improve slug generation for percent symbols in route names

* [ ] Improve custom test runner

  * [ ] Build support for `not`
  * [ ] Add TypeScript-friendly JSDoc comments to test runner
  * [ ] Consider future TypeScript migration for test runner

* [ ] Consider future TypeScript migration for app modules

* [ ] Evaluate GitHub Projects for issue tracking and project board workflow

* [ ] Migrate active run state from localStorage to temporary files

## Completed

* [x] Preserve completed-run review after saving or deleting run data
  Added Current Run and Last Run sidebar tabs so completed-run data remains available for review during the current session. Last Run preserves read-only completed-run split data and summary information after Save New PB, Save Gold Splits, or Delete Run Data.

* [x] Add Last Run review clearing behavior
  Updated Last Run behavior so starting a new run switches the sidebar back to Current Run while still allowing the user to revisit Last Run during the session. Switching routes clears Last Run so completed-run data from one route does not appear under another route.

* [x] Prevent Delete Run Data from writing route files
  Updated Delete Run Data so it behaves as a discard/reset action instead of a saved route-data change. The app now restores baseline route state in memory, clears active/completed run session state, preserves Last Run review behavior, and avoids calling the route file saver. Save New PB and Save Gold Splits continue to write route files normally.

* [x] Fix Last Run tab showing route baseline data after deleting an unset run
  Updated Last Run review capture so it only preserves segments that were actually recorded/set during the run. Deleting an unset run now shows an empty/explanatory Last Run state instead of displaying baseline PB route data, while completed runs with recorded segment data still show the correct Last Run review.

* [x] Preserve comparison card values when pausing a run
  Fixed paused-run display so segment and run comparison cards keep their current split and comparison values instead of reverting to blank/default placeholders. Updated status display so paused runs show an appropriate paused state instead of incorrectly showing saved.

* [x] Clean up route file saving service integration
  Added an injectable `routeFileSaver` dependency to `SplitTimerController` and removed direct file-saving logic from the save method. `SplitTimerController` now prefers the injected file saver while preserving the existing `window.fileSaver` fallback for browser integration.

* [x] Extract `RunSidebarController` from `SplitTimerController`
  Moved Current Run and Last Run sidebar rendering into a dedicated controller. `SplitTimerController` now delegates sidebar tab rendering and completed-run review display while preserving existing run/sidebar behavior.

* [x] Extract current-run sidebar row rendering
  Moved current-run row rendering into `RunSidebarController`, reducing direct sidebar DOM rendering inside `SplitTimerController`.

* [x] Extract `ComparisonPanelController` from `SplitTimerController`
  Moved comparison panel and Run Complete panel rendering into a dedicated controller. Preserved IDLE, LIVE, PAUSED, and SAVED display behavior while reducing UI rendering responsibility in `SplitTimerController`.

* [x] Extract `ScrollNavigationController` from `SplitTimerController`
  Moved scroll observer setup and visible-segment detection into a dedicated controller. Preserved scroll-driven sidebar updates, start-run scroll reset behavior, and prevented sidebar/scroll navigation from writing route files.

* [x] Rename `RouteLoader` to `SplitTimerController`
  Renamed the main app coordinator from `RouteLoader` to `SplitTimerController` and renamed `route-loader.js` to `split-timer-controller.js`. Updated app/test imports and constructor usage while preserving existing behavior.

* [x] Document frontend controller/service architecture
  Created `docs/frontend-architecture.md` to document the current controller/service structure, remaining `SplitTimerController` responsibilities, and future extraction candidates.

* [x] Update route schema cleanup documentation
  Updated `docs/route-data-schema-cleanup-plan.md` to reflect the newer `SplitTimerController` architecture and the long-term path toward canonical millisecond timing fields.

* [x] Improve failed test summary output
  Updated the custom test runner so failed tests are collected during the run and summarized after the main `Test Summary`. Failed test details now include the parent `describe` block, the `it` statement, and the error message in a readable stacked format, while passing test runs keep the normal summary output.

* [x] Extract `RouteEditorController` form behavior from `SplitTimerController`
  Moved Add Segment, Add Subsegment, Delete Segment, and editor dropdown refresh behavior into `RouteEditorController`. `SplitTimerController` now delegates editor form wiring while still owning route-data mutation, save, and rerender orchestration through callbacks.

* [x] Continue `RouteEditorController` extraction: sidebar context menu
  Moved sidebar context menu open/close behavior and action routing into `RouteEditorController`. Added tests for opening the menu, routing Rename/Delete/Clear Split actions to callbacks, and closing the menu through outside clicks. `SplitTimerController` now delegates context menu UI behavior while still owning route-data mutations through callbacks.

* [x] Move rename modal wiring into `RouteEditorController`
  Moved rename modal opening, submit, cancel, and close/reset behavior into `RouteEditorController`. The controller owns rename modal UI wiring while `SplitTimerController` still performs the actual segment/subsegment rename mutation through callbacks.

* [x] Route switching controller extraction from `SplitTimerController`
  Moved route-switching workflow responsibilities out of `SplitTimerController` into a dedicated controller/service layer while preserving route loading, route-switch confirmation, cancellation, and active-run safety behavior.

- [x] Add tablet/mobile responsive layout for 830px breakpoint where sidebar no longer fits beside timer

- [x] Add tablet comparison-card actions and layout

- [x] Fix Run Complete card for mobile layouts

- [x] Update project docs before stable version

## Notes
