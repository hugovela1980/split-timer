# Split Timer Project Backlog

## Current Version
- Current stable release: v1.1.0
- Active branch: develop
- Next planned branch: feature/vanilla-test-runner

## Completed
- [x] Create stable v1.0.0 baseline
- [x] Add feature/develop/main branching workflow
- [x] Add timing-field compatibility layer
- [x] Add start screen route selector
- [x] Add create route from start screen
- [x] Prevent active run data from writing to route files
- [x] Prevent route file writes on load/switch
- [x] Remove automatic route backup writes
- [x] Fix gold split corruption
- [x] Add run pace timer color behavior
- [x] Disable subsegment timing controls
- [x] Release v1.1.0

## Next
- [ ] Build vanilla JavaScript test runner
- [ ] Add timing compatibility regression tests
- [ ] Add run save behavior tests
- [ ] Add route-file write behavior tests
- [ ] Add Back to Start button
- [ ] Decide future subsegment timing behavior

## Backlog
- [ ] Migrate active run state from localStorage to temporary files
- [ ] Plan full route data schema cleanup
- [ ] Remove compatibility layer after route files fully migrate
- [ ] Improve Run Complete preview so projected sumOfBest updates before saving
- [ ] Add project documentation / architecture notes