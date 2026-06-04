import { tester } from './test-runner/tester.js';
import { SplitTimerController } from '../public/js/app/split-timer-controller.js';
import {
    createTimerColorPaceRoute,
    createCompletedPbRunRoute,
    createCompletedNonPbRunWithGoldRoute,
    cloneFixture
} from './fixtures/routes.js';

function createMemoryStorage() {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },

        setItem(key, value) {
            store.set(key, String(value));
        },

        removeItem(key) {
            store.delete(key);
        },

        clear() {
            store.clear();
        }
    };
}

tester.describe('SplitTimerController route file write behavior', () => {
    let splitTimerController;
    let routeData;
    let saveRouteDataMock;

    tester.beforeEach(() => {
        routeData = cloneFixture(createTimerColorPaceRoute());

        saveRouteDataMock = tester.fn(async () => { });

        globalThis.window = { dispatchEvent: tester.fn() };

        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        };

        globalThis.document = {
            querySelector() {
                return null;
            },

            querySelectorAll() {
                return [];
            },

            getElementById() {
                return null;
            }
        };

        splitTimerController = new SplitTimerController({
            storageProvider: createMemoryStorage(),
            routeFileSaver: {
                saveRouteData: saveRouteDataMock
            }
        });

        splitTimerController.routeData = routeData;
        splitTimerController.currentRouteFilename = 'test-timer-color-pace.json';
    });

    tester.it('does not write route files when saving active run state to storage only', () => {
        splitTimerController.saveActiveRunRouteToStorage();

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(0);
    });

    tester.it('writes route data when saveRouteDataToFile is called', async () => {
        await splitTimerController.saveRouteDataToFile({ force: true });

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(saveRouteDataMock).toHaveBeenCalledWith(
            routeData,
            'test-timer-color-pace.json',
            { force: true }
        );
    });

    tester.it('writes route data when saving clean route state', async () => {
        await splitTimerController.saveCleanRouteState({ force: true });

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(saveRouteDataMock).toHaveBeenCalledWith(
            routeData,
            'test-timer-color-pace.json',
            { force: true }
        );
    });

    tester.it('deleteCompletedRunData restores baseline route data and writes once', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());

        const modifiedRoute = cloneFixture(createTimerColorPaceRoute());
        modifiedRoute.personalBest = '00:00:12';
        modifiedRoute.sumOfBest = '00:00:12';
        modifiedRoute.segments[0].time = '00:00:03';
        modifiedRoute.segments[0].pbSplitTime = '00:00:03';
        modifiedRoute.segments[0].duration = '00:00:03';
        modifiedRoute.segments[0].pbSegmentDuration = '00:00:03';

        splitTimerController.routeData = modifiedRoute;
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.currentRouteFilename = 'test-timer-color-pace.json';

        // Avoid DOM rendering concerns in this workflow test.
        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegment = tester.fn(() => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.deleteCompletedRunData();

        tester.expect(splitTimerController.routeData.personalBest).toBe('00:00:15');
        tester.expect(splitTimerController.routeData.sumOfBest).toBe('00:00:15');
        tester.expect(splitTimerController.routeData.segments[0].pbSplitTime).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[0].pbSegmentDuration).toBe('00:00:05');

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(saveRouteDataMock).toHaveBeenCalledWith(
            splitTimerController.routeData,
            'test-timer-color-pace.json',
            { force: true }
        );
    });

    tester.it('deleteCompletedRunData clears active run session state', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());

        splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.runComplete = {
            finalTime: '00:00:18',
            isNewPB: false,
            previousPB: '00:00:15'
        };
        splitTimerController.hasRunStarted = true;
        splitTimerController.sessionGoldSplits.add(2);
        splitTimerController.sessionSetSegments.add(1);
        splitTimerController.sessionSetSegments.add(2);
        splitTimerController.sessionBestBySegment.set(2, '00:00:04');
        splitTimerController.runPaceState = 'behind';
        splitTimerController.lastCompletedSegmentId = 2;

        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegment = tester.fn(() => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.deleteCompletedRunData();

        tester.expect(splitTimerController.runComplete).toBe(null);
        tester.expect(splitTimerController.hasRunStarted).toBe(false);
        tester.expect(splitTimerController.sessionGoldSplits.size).toBe(0);
        tester.expect(splitTimerController.sessionSetSegments.size).toBe(0);
        tester.expect(splitTimerController.sessionBestBySegment.size).toBe(0);
        tester.expect(splitTimerController.runPaceState).toBe('neutral');
        tester.expect(splitTimerController.lastCompletedSegmentId).toBe(null);

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
    });

    tester.it('restartRun restores baseline route data without writing route file', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());

        const modifiedRoute = cloneFixture(createTimerColorPaceRoute());
        modifiedRoute.personalBest = '00:00:12';
        modifiedRoute.sumOfBest = '00:00:12';
        modifiedRoute.segments[0].time = '00:00:03';
        modifiedRoute.segments[0].pbSplitTime = '00:00:03';
        modifiedRoute.segments[0].duration = '00:00:03';
        modifiedRoute.segments[0].pbSegmentDuration = '00:00:03';

        splitTimerController.routeData = modifiedRoute;
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.currentRouteFilename = 'test-timer-color-pace.json';

        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegment = tester.fn(() => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.restartRun();

        tester.expect(splitTimerController.routeData.personalBest).toBe('00:00:15');
        tester.expect(splitTimerController.routeData.sumOfBest).toBe('00:00:15');
        tester.expect(splitTimerController.routeData.segments[0].pbSplitTime).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[0].pbSegmentDuration).toBe('00:00:05');

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(0);
    });

    tester.it('restartRun clears active run session state', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());

        splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.runComplete = {
            finalTime: '00:00:18',
            isNewPB: false,
            previousPB: '00:00:15'
        };
        splitTimerController.hasRunStarted = true;
        splitTimerController.sessionGoldSplits.add(2);
        splitTimerController.sessionSetSegments.add(1);
        splitTimerController.sessionSetSegments.add(2);
        splitTimerController.sessionBestBySegment.set(2, '00:00:04');
        splitTimerController.runPaceState = 'behind';
        splitTimerController.lastCompletedSegmentId = 2;

        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegment = tester.fn(() => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.restartRun();

        tester.expect(splitTimerController.runComplete).toBe(null);
        tester.expect(splitTimerController.hasRunStarted).toBe(false);
        tester.expect(splitTimerController.sessionGoldSplits.size).toBe(0);
        tester.expect(splitTimerController.sessionSetSegments.size).toBe(0);
        tester.expect(splitTimerController.sessionBestBySegment.size).toBe(0);
        tester.expect(splitTimerController.runPaceState).toBe('neutral');
        tester.expect(splitTimerController.lastCompletedSegmentId).toBe(null);

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(0);
    });

    tester.it('saveRunCompleteGold saves a new PB route once', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());
        const completedPbRoute = cloneFixture(createCompletedPbRunRoute());

        completedPbRoute.personalBest = '00:00:14';

        splitTimerController.routeData = completedPbRoute;
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.currentRouteFilename = 'test-timer-color-pace.json';
        splitTimerController.runComplete = {
            finalTime: '00:00:14',
            isNewPB: true,
            previousPB: '00:00:15'
        };

        splitTimerController.sessionSetSegments.add(1);
        splitTimerController.sessionSetSegments.add(2);
        splitTimerController.sessionSetSegments.add(3);

        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegmentAndRender = tester.fn(async () => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.saveRunCompleteGold();

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(saveRouteDataMock).toHaveBeenCalledWith(
            splitTimerController.routeData,
            'test-timer-color-pace.json',
            { force: true }
        );

        tester.expect(splitTimerController.routeData.personalBest).toBe('00:00:14');
        tester.expect(splitTimerController.routeData.sumOfBest).toBe('00:00:13');

        tester.expect(splitTimerController.routeData.segments[0].pbSplitTime).toBe('00:00:03');
        tester.expect(splitTimerController.routeData.segments[0].pbSegmentDuration).toBe('00:00:03');
        tester.expect(splitTimerController.routeData.segments[0].goldSplit).toBe('00:00:03');

        tester.expect(splitTimerController.routeData.segments[1].pbSplitTime).toBe('00:00:09');
        tester.expect(splitTimerController.routeData.segments[1].pbSegmentDuration).toBe('00:00:06');
        tester.expect(splitTimerController.routeData.segments[1].goldSplit).toBe('00:00:05');

        tester.expect(splitTimerController.routeData.segments[2].pbSplitTime).toBe('00:00:14');
        tester.expect(splitTimerController.routeData.segments[2].pbSegmentDuration).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[2].goldSplit).toBe('00:00:05');
    });

    tester.it('saveRunCompleteGold clears session state after saving a new PB', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());
        const completedPbRoute = cloneFixture(createCompletedPbRunRoute());

        completedPbRoute.personalBest = '00:00:14';

        splitTimerController.routeData = completedPbRoute;
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.runComplete = {
            finalTime: '00:00:14',
            isNewPB: true,
            previousPB: '00:00:15'
        };
        splitTimerController.hasRunStarted = true;
        splitTimerController.sessionGoldSplits.add(1);
        splitTimerController.sessionSetSegments.add(1);
        splitTimerController.sessionSetSegments.add(2);
        splitTimerController.sessionSetSegments.add(3);
        splitTimerController.sessionBestBySegment.set(1, '00:00:03');
        splitTimerController.runPaceState = 'ahead';
        splitTimerController.lastCompletedSegmentId = 3;

        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegmentAndRender = tester.fn(async () => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.saveRunCompleteGold();

        tester.expect(splitTimerController.runComplete).toBe(null);
        tester.expect(splitTimerController.hasRunStarted).toBe(false);
        tester.expect(splitTimerController.sessionGoldSplits.size).toBe(0);
        tester.expect(splitTimerController.sessionSetSegments.size).toBe(0);
        tester.expect(splitTimerController.sessionBestBySegment.size).toBe(0);
        tester.expect(splitTimerController.runPaceState).toBe('neutral');
        tester.expect(splitTimerController.lastCompletedSegmentId).toBe(null);

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
    });

    tester.it('saveRunCompleteGold saves improved gold splits for a non-PB run once', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());
        const completedNonPbRoute = cloneFixture(createCompletedNonPbRunWithGoldRoute());

        splitTimerController.routeData = completedNonPbRoute;
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.currentRouteFilename = 'test-timer-color-pace.json';
        splitTimerController.runComplete = {
            finalTime: '00:00:18',
            isNewPB: false,
            previousPB: '00:00:15'
        };

        splitTimerController.sessionSetSegments.add(1);
        splitTimerController.sessionSetSegments.add(2);
        splitTimerController.sessionSetSegments.add(3);

        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegmentAndRender = tester.fn(async () => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.saveRunCompleteGold();

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(saveRouteDataMock).toHaveBeenCalledWith(
            splitTimerController.routeData,
            'test-timer-color-pace.json',
            { force: true }
        );

        // Non-PB run should preserve the original personal best.
        tester.expect(splitTimerController.routeData.personalBest).toBe('00:00:15');

        // PB split data should stay from the baseline route, not the non-PB active run.
        tester.expect(splitTimerController.routeData.segments[0].pbSplitTime).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[1].pbSplitTime).toBe('00:00:10');
        tester.expect(splitTimerController.routeData.segments[2].pbSplitTime).toBe('00:00:15');

        tester.expect(splitTimerController.routeData.segments[0].pbSegmentDuration).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[1].pbSegmentDuration).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[2].pbSegmentDuration).toBe('00:00:05');

        // Only Segment 2 should gold:
        // Segment 1 active duration: 00:00:06, old gold 00:00:05 -> unchanged
        // Segment 2 active duration: 00:00:04, old gold 00:00:05 -> updated
        // Segment 3 active duration: 00:00:08, old gold 00:00:05 -> unchanged
        tester.expect(splitTimerController.routeData.segments[0].goldSplit).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[1].goldSplit).toBe('00:00:04');
        tester.expect(splitTimerController.routeData.segments[2].goldSplit).toBe('00:00:05');

        tester.expect(splitTimerController.routeData.segments[0].bestTime).toBe('00:00:05');
        tester.expect(splitTimerController.routeData.segments[1].bestTime).toBe('00:00:04');
        tester.expect(splitTimerController.routeData.segments[2].bestTime).toBe('00:00:05');

        tester.expect(splitTimerController.routeData.sumOfBest).toBe('00:00:14');
    });

    tester.it('saveRunCompleteGold clears session state after saving non-PB gold splits', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());
        const completedNonPbRoute = cloneFixture(createCompletedNonPbRunWithGoldRoute());

        splitTimerController.routeData = completedNonPbRoute;
        splitTimerController.runDataSnapshot = baselineRoute;
        splitTimerController.runComplete = {
            finalTime: '00:00:18',
            isNewPB: false,
            previousPB: '00:00:15'
        };
        splitTimerController.hasRunStarted = true;
        splitTimerController.sessionGoldSplits.add(2);
        splitTimerController.sessionSetSegments.add(1);
        splitTimerController.sessionSetSegments.add(2);
        splitTimerController.sessionSetSegments.add(3);
        splitTimerController.sessionBestBySegment.set(2, '00:00:04');
        splitTimerController.runPaceState = 'behind';
        splitTimerController.lastCompletedSegmentId = 3;

        splitTimerController.populateRoute = tester.fn();
        splitTimerController.populateSidebar = tester.fn();
        splitTimerController.renderComparisonsPanel = tester.fn();
        splitTimerController.resetRouteProgressToFirstSegmentAndRender = tester.fn(async () => {
            splitTimerController.routeData.currentSegmentId = 1;
            splitTimerController.routeData.currentSegmentName = 'Segment 1';
        });

        await splitTimerController.saveRunCompleteGold();

        tester.expect(splitTimerController.runComplete).toBe(null);
        tester.expect(splitTimerController.hasRunStarted).toBe(false);
        tester.expect(splitTimerController.sessionGoldSplits.size).toBe(0);
        tester.expect(splitTimerController.sessionSetSegments.size).toBe(0);
        tester.expect(splitTimerController.sessionBestBySegment.size).toBe(0);
        tester.expect(splitTimerController.runPaceState).toBe('neutral');
        tester.expect(splitTimerController.lastCompletedSegmentId).toBe(null);

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
    });

    tester.it('falls back to window file saver when no route file saver is injected', async () => {
        const fallbackSaveRouteDataMock = tester.fn(async () => { });

        globalThis.window.fileSaver = {
            saveRouteData: fallbackSaveRouteDataMock
        };

        const fallbackSplitTimerController = new SplitTimerController({
            storageProvider: createMemoryStorage()
        });

        fallbackSplitTimerController.routeData = routeData;
        fallbackSplitTimerController.currentRouteFilename = 'test-timer-color-pace.json';

        await fallbackSplitTimerController.saveRouteDataToFile({ force: true });

        tester.expect(fallbackSaveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(fallbackSaveRouteDataMock).toHaveBeenCalledWith(
            routeData,
            'test-timer-color-pace.json',
            { force: true }
        );
    });
});