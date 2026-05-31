import { tester } from './test-runner/tester.js';
import { RunSaveService } from '../public/js/services/run-save-service.js';
import {
    createTimerColorPaceRoute,
    createCompletedPbRunRoute,
    createCompletedNonPbRunWithGoldRoute,
    cloneFixture
} from './fixtures/routes.js';
import {
    getSegmentPbSplitTime,
    getSegmentPbSegmentDuration,
    getSegmentGoldSplit
} from '../public/js/utils/utils.js';

tester.describe('RunSaveService', () => {
    let runSaveService;
    let baselineRoute;

    tester.beforeEach(() => {
        runSaveService = new RunSaveService();
        baselineRoute = cloneFixture(createTimerColorPaceRoute());
    });

    tester.it('updates gold splits from a completed PB run without inventing impossible golds', () => {
        const activeRunRoute = cloneFixture(createCompletedPbRunRoute());
        const targetRoute = cloneFixture(activeRunRoute);
        const sessionSetSegments = new Set([1, 2, 3]);

        runSaveService.updateGoldSplitsFromCompletedRun({
            targetRouteData: targetRoute,
            activeRunRouteData: activeRunRoute,
            baselineRouteData: baselineRoute,
            sessionSetSegments
        });

        tester.expect(getSegmentGoldSplit(targetRoute.segments[0])).toBe('00:00:03');
        tester.expect(getSegmentGoldSplit(targetRoute.segments[1])).toBe('00:00:05');
        tester.expect(getSegmentGoldSplit(targetRoute.segments[2])).toBe('00:00:05');
    });

    tester.it('updates only improved gold splits from a completed non-PB run', () => {
        const activeRunRoute = cloneFixture(createCompletedNonPbRunWithGoldRoute());
        const targetRoute = cloneFixture(baselineRoute);
        const sessionSetSegments = new Set([1, 2, 3]);

        runSaveService.updateGoldSplitsFromCompletedRun({
            targetRouteData: targetRoute,
            activeRunRouteData: activeRunRoute,
            baselineRouteData: baselineRoute,
            sessionSetSegments
        });

        tester.expect(getSegmentGoldSplit(targetRoute.segments[0])).toBe('00:00:05');
        tester.expect(getSegmentGoldSplit(targetRoute.segments[1])).toBe('00:00:04');
        tester.expect(getSegmentGoldSplit(targetRoute.segments[2])).toBe('00:00:05');
    });

    tester.it('keeps PB split data unchanged for non-PB gold split saves', () => {
        const activeRunRoute = cloneFixture(createCompletedNonPbRunWithGoldRoute());
        const targetRoute = cloneFixture(baselineRoute);
        const sessionSetSegments = new Set([1, 2, 3]);

        runSaveService.updateGoldSplitsFromCompletedRun({
            targetRouteData: targetRoute,
            activeRunRouteData: activeRunRoute,
            baselineRouteData: baselineRoute,
            sessionSetSegments
        });

        tester.expect(getSegmentPbSplitTime(targetRoute.segments[0])).toBe('00:00:05');
        tester.expect(getSegmentPbSplitTime(targetRoute.segments[1])).toBe('00:00:10');
        tester.expect(getSegmentPbSplitTime(targetRoute.segments[2])).toBe('00:00:15');

        tester.expect(getSegmentPbSegmentDuration(targetRoute.segments[0])).toBe('00:00:05');
        tester.expect(getSegmentPbSegmentDuration(targetRoute.segments[1])).toBe('00:00:05');
        tester.expect(getSegmentPbSegmentDuration(targetRoute.segments[2])).toBe('00:00:05');
    });
});