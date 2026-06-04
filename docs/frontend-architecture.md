# Frontend Architecture

## Current Architecture Summary

`RouteLoader` currently acts as the central app coordinator. It initializes services and controllers, coordinates route loading, route switching, run lifecycle events, stopwatch events, and high-level UI updates.

## Controllers

### StartScreenController
- Handles start screen route selection
- Handles Enter key route opening
- Handles start-screen create-route flow
- Shows the main app shell

### RunSidebarController
- Renders Current Run and Last Run sidebar tabs
- Renders current-run sidebar rows
- Renders last-run review rows and summary
- Preserves sidebar delta colors and tab behavior

### ComparisonPanelController
- Renders normal comparison cards
- Renders Run Complete panel
- Preserves IDLE / LIVE / PAUSED / SAVED status behavior

## Services

### RouteDataService
- Loads route JSON
- Unwraps route response data
- Validates route data
- Applies schema normalization

### RouteSelectorService
- Fetches route list
- Populates route selector
- Syncs start screen selector

### RouteStorageService
- Handles localStorage/session persistence
- Saves/restores baseline route data
- Saves/restores active-run data
- Saves/restores run session metadata

### RunSaveService
- Updates gold splits
- Recalculates sum of best
- Updates personal best
- Creates completed-run state
- Syncs canonical timing fields during run-save workflows

### routeFileSaver / FileSaver
- Saves route JSON through the local server
- Uses `/api/health` and `/api/save-route`
- Can be injected into the app coordinator
- Still supports `window.fileSaver` as a browser fallback

## Remaining RouteLoader Responsibilities

- App initialization and controller/service wiring
- Route switching workflow
- Stopwatch event coordination
- High-level run lifecycle state
- Scroll observer / active segment behavior
- Route editor and create-route modal behavior
- Route rendering orchestration
- File save orchestration

## Naming Decision

`RouteLoader` is now too narrow of a name. The class no longer only loads routes; it coordinates the Split Timer app.

Recommended rename:

`RouteLoader` → `SplitTimerController`

## Future Extraction Candidates

- Route switching controller
- Scroll navigation controller
- Route editor controller

## Notes

Do not keep extracting just for neatness. The goal is a moderate architecture that improves readability, testing, and maintainability without turning the app into an over-engineered enterprise-style project.