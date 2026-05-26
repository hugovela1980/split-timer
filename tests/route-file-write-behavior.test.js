import { tester } from './test-runner/tester.js';
import { RouteLoader } from '../public/js/app/route-loader.js';
import {
    createTimerColorPaceRoute,
    createCompletedPbRunRoute,
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

tester.describe('RouteLoader route file write behavior', () => {
    let routeLoader;
    let routeData;
    let saveRouteDataMock;

    tester.beforeEach(() => {
        routeData = cloneFixture(createTimerColorPaceRoute());

        saveRouteDataMock = tester.fn(async () => { });

        globalThis.window = {
            fileSaver: {
                saveRouteData: saveRouteDataMock
            },
            dispatchEvent: tester.fn()
        };

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

        routeLoader = new RouteLoader({
            storageProvider: createMemoryStorage()
        });

        routeLoader.routeData = routeData;
        routeLoader.currentRouteFilename = 'test-timer-color-pace.json';
    });

    tester.it('does not write route files when saving active run state to storage only', () => {
        routeLoader.saveActiveRunRouteToStorage();

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(0);
    });

    tester.it('writes route data when saveRouteDataToFile is called', async () => {
        await routeLoader.saveRouteDataToFile({ force: true });

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(saveRouteDataMock).toHaveBeenCalledWith(
            routeData,
            'test-timer-color-pace.json',
            { force: true }
        );
    });

    tester.it('writes route data when saving clean route state', async () => {
        await routeLoader.saveCleanRouteState({ force: true });

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

        routeLoader.routeData = modifiedRoute;
        routeLoader.runDataSnapshot = baselineRoute;
        routeLoader.currentRouteFilename = 'test-timer-color-pace.json';

        // Avoid DOM rendering concerns in this workflow test.
        routeLoader.populateRoute = tester.fn();
        routeLoader.populateSidebar = tester.fn();
        routeLoader.renderComparisonsPanel = tester.fn();
        routeLoader.resetRouteProgressToFirstSegment = tester.fn(() => {
            routeLoader.routeData.currentSegmentId = 1;
            routeLoader.routeData.currentSegmentName = 'Segment 1';
        });

        await routeLoader.deleteCompletedRunData();

        tester.expect(routeLoader.routeData.personalBest).toBe('00:00:15');
        tester.expect(routeLoader.routeData.sumOfBest).toBe('00:00:15');
        tester.expect(routeLoader.routeData.segments[0].pbSplitTime).toBe('00:00:05');
        tester.expect(routeLoader.routeData.segments[0].pbSegmentDuration).toBe('00:00:05');

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(1);
        tester.expect(saveRouteDataMock).toHaveBeenCalledWith(
            routeLoader.routeData,
            'test-timer-color-pace.json',
            { force: true }
        );
    });

    tester.it('deleteCompletedRunData clears active run session state', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());

        routeLoader.routeData = cloneFixture(createTimerColorPaceRoute());
        routeLoader.runDataSnapshot = baselineRoute;
        routeLoader.runComplete = {
            finalTime: '00:00:18',
            isNewPB: false,
            previousPB: '00:00:15'
        };
        routeLoader.hasRunStarted = true;
        routeLoader.sessionGoldSplits.add(2);
        routeLoader.sessionSetSegments.add(1);
        routeLoader.sessionSetSegments.add(2);
        routeLoader.sessionBestBySegment.set(2, '00:00:04');
        routeLoader.runPaceState = 'behind';
        routeLoader.lastCompletedSegmentId = 2;

        routeLoader.populateRoute = tester.fn();
        routeLoader.populateSidebar = tester.fn();
        routeLoader.renderComparisonsPanel = tester.fn();
        routeLoader.resetRouteProgressToFirstSegment = tester.fn(() => {
            routeLoader.routeData.currentSegmentId = 1;
            routeLoader.routeData.currentSegmentName = 'Segment 1';
        });

        await routeLoader.deleteCompletedRunData();

        tester.expect(routeLoader.runComplete).toBe(null);
        tester.expect(routeLoader.hasRunStarted).toBe(false);
        tester.expect(routeLoader.sessionGoldSplits.size).toBe(0);
        tester.expect(routeLoader.sessionSetSegments.size).toBe(0);
        tester.expect(routeLoader.sessionBestBySegment.size).toBe(0);
        tester.expect(routeLoader.runPaceState).toBe('neutral');
        tester.expect(routeLoader.lastCompletedSegmentId).toBe(null);

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

        routeLoader.routeData = modifiedRoute;
        routeLoader.runDataSnapshot = baselineRoute;
        routeLoader.currentRouteFilename = 'test-timer-color-pace.json';

        routeLoader.populateRoute = tester.fn();
        routeLoader.populateSidebar = tester.fn();
        routeLoader.renderComparisonsPanel = tester.fn();
        routeLoader.resetRouteProgressToFirstSegment = tester.fn(() => {
            routeLoader.routeData.currentSegmentId = 1;
            routeLoader.routeData.currentSegmentName = 'Segment 1';
        });

        await routeLoader.restartRun();

        tester.expect(routeLoader.routeData.personalBest).toBe('00:00:15');
        tester.expect(routeLoader.routeData.sumOfBest).toBe('00:00:15');
        tester.expect(routeLoader.routeData.segments[0].pbSplitTime).toBe('00:00:05');
        tester.expect(routeLoader.routeData.segments[0].pbSegmentDuration).toBe('00:00:05');

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(0);
    });

    tester.it('restartRun clears active run session state', async () => {
        const baselineRoute = cloneFixture(createTimerColorPaceRoute());

        routeLoader.routeData = cloneFixture(createTimerColorPaceRoute());
        routeLoader.runDataSnapshot = baselineRoute;
        routeLoader.runComplete = {
            finalTime: '00:00:18',
            isNewPB: false,
            previousPB: '00:00:15'
        };
        routeLoader.hasRunStarted = true;
        routeLoader.sessionGoldSplits.add(2);
        routeLoader.sessionSetSegments.add(1);
        routeLoader.sessionSetSegments.add(2);
        routeLoader.sessionBestBySegment.set(2, '00:00:04');
        routeLoader.runPaceState = 'behind';
        routeLoader.lastCompletedSegmentId = 2;

        routeLoader.populateRoute = tester.fn();
        routeLoader.populateSidebar = tester.fn();
        routeLoader.renderComparisonsPanel = tester.fn();
        routeLoader.resetRouteProgressToFirstSegment = tester.fn(() => {
            routeLoader.routeData.currentSegmentId = 1;
            routeLoader.routeData.currentSegmentName = 'Segment 1';
        });

        await routeLoader.restartRun();

        tester.expect(routeLoader.runComplete).toBe(null);
        tester.expect(routeLoader.hasRunStarted).toBe(false);
        tester.expect(routeLoader.sessionGoldSplits.size).toBe(0);
        tester.expect(routeLoader.sessionSetSegments.size).toBe(0);
        tester.expect(routeLoader.sessionBestBySegment.size).toBe(0);
        tester.expect(routeLoader.runPaceState).toBe('neutral');
        tester.expect(routeLoader.lastCompletedSegmentId).toBe(null);

        tester.expect(saveRouteDataMock).toHaveBeenCalledTimes(0);
    });
});