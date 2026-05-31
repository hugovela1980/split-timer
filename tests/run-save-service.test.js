import { tester } from './test-runner/tester.js';
import { RunSaveService } from '../public/js/services/run-save-service.js';
import {
    createTimerColorPaceRoute,
    createCompletedPbRunRoute,
    createCompletedNonPbRunWithGoldRoute,
    cloneFixture
} from './fixtures/routes.js';
import {
    deepClone,
    isBetterTime,
    timeToSeconds,
    timeToMilliseconds,
    secondsToTime,
    getSegmentPbSplitTime,
    getSegmentPbSegmentDuration,
    getSegmentGoldSplit,
    setSegmentGoldSplit
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

    tester.it('recalculates sumOfBest from gold splits', () => {
        const routeData = {
            sumOfBest: '00:00:00',
            segments: [
                {
                    goldSplit: '00:00:03'
                },
                {
                    goldSplit: '00:00:04'
                },
                {
                    goldSplit: '00:00:05'
                }
            ]
        };

        runSaveService.recalculateSumOfBest(routeData);

        tester.expect(routeData.sumOfBest).toBe('00:00:12');
        tester.expect(routeData.sumOfBestMs).toBe(12000);
    });

    tester.it('does not recalculate sumOfBest when route data is missing segments', () => {
        const routeData = {
            sumOfBest: '00:01:00'
        };

        runSaveService.recalculateSumOfBest(routeData);

        tester.expect(routeData.sumOfBest).toBe('00:01:00');
    });

    tester.it('updates personalBest from the final segment when it is better', () => {
        const routeData = {
            personalBest: '00:00:20',
            segments: [
                { pbSplitTime: '00:00:05' },
                { pbSplitTime: '00:00:15' }
            ]
        };

        runSaveService.updatePersonalBestFromFinalSegment(routeData);

        tester.expect(routeData.personalBest).toBe('00:00:15');
    });

    tester.it('keeps personalBest when the final segment is not better', () => {
        const routeData = {
            personalBest: '00:00:10',
            segments: [
                { pbSplitTime: '00:00:05' },
                { pbSplitTime: '00:00:15' }
            ]
        };

        runSaveService.updatePersonalBestFromFinalSegment(routeData);

        tester.expect(routeData.personalBest).toBe('00:00:10');
    });

    tester.it('creates a gold split save route from baseline and active run data', () => {
        const activeRunRoute = cloneFixture(createCompletedNonPbRunWithGoldRoute());
        const baselineRouteData = cloneFixture(baselineRoute);
        const sessionSetSegments = new Set([1, 2, 3]);

        const mergedRouteData = runSaveService.createGoldSplitSaveRoute({
            activeRunRouteData: activeRunRoute,
            baselineRouteData,
            sessionSetSegments,
            personalBestAtRunStart: '00:00:15'
        });

        tester.expect(mergedRouteData === null).toBe(false);
        tester.expect(mergedRouteData === baselineRouteData).toBe(false);
        tester.expect(mergedRouteData.personalBest).toBe('00:00:15');

        tester.expect(getSegmentGoldSplit(mergedRouteData.segments[0])).toBe('00:00:05');
        tester.expect(getSegmentGoldSplit(mergedRouteData.segments[1])).toBe('00:00:04');
        tester.expect(getSegmentGoldSplit(mergedRouteData.segments[2])).toBe('00:00:05');

        tester.expect(mergedRouteData.segments[0].goldSegmentMs).toBe(5000);
        tester.expect(mergedRouteData.segments[1].goldSegmentMs).toBe(4000);
        tester.expect(mergedRouteData.segments[2].goldSegmentMs).toBe(5000);
    });

    tester.it('returns null when gold split save route data is invalid', () => {
        const mergedRouteData = runSaveService.createGoldSplitSaveRoute({
            activeRunRouteData: { name: 'Invalid Active Run' },
            baselineRouteData: cloneFixture(baselineRoute),
            sessionSetSegments: new Set([1, 2, 3]),
            personalBestAtRunStart: '00:00:15'
        });

        tester.expect(mergedRouteData).toBe(null);
    });

    tester.it('creates completed-run state for a new PB run', () => {
        const runComplete = runSaveService.createRunCompleteState({
            finalTime: '00:00:08',
            isNewPB: true,
            previousPB: '00:00:09'
        });

        tester.expect(runComplete.finalTime).toBe('00:00:08');
        tester.expect(runComplete.isNewPB).toBe(true);
        tester.expect(runComplete.previousPB).toBe('00:00:09');
    });

    tester.it('creates completed-run state with a fallback previous PB display', () => {
        const runComplete = runSaveService.createRunCompleteState({
            finalTime: '00:00:08',
            isNewPB: false,
            previousPB: ''
        });

        tester.expect(runComplete.finalTime).toBe('00:00:08');
        tester.expect(runComplete.isNewPB).toBe(false);
        tester.expect(runComplete.previousPB).toBe('--:--:--');
    });

    tester.it('syncs canonical PB millisecond fields from saved PB timing fields', () => {
        const routeData = {
            personalBest: '00:00:07',
            personalBestMs: 9000,
            segments: [
                {
                    pbSplitTime: '00:00:01',
                    pbSegmentDuration: '00:00:01',
                    pbSplitMs: 3000,
                    pbSegmentMs: 3000
                },
                {
                    pbSplitTime: '00:00:05',
                    pbSegmentDuration: '00:00:04',
                    pbSplitMs: 6000,
                    pbSegmentMs: 3000
                },
                {
                    pbSplitTime: '00:00:07',
                    pbSegmentDuration: '00:00:02',
                    pbSplitMs: 9000,
                    pbSegmentMs: 3000
                }
            ]
        };

        runSaveService.syncCanonicalPbTimingFields(routeData);

        tester.expect(routeData.personalBestMs).toBe(7000);

        tester.expect(routeData.segments[0].pbSplitMs).toBe(1000);
        tester.expect(routeData.segments[0].pbSegmentMs).toBe(1000);

        tester.expect(routeData.segments[1].pbSplitMs).toBe(5000);
        tester.expect(routeData.segments[1].pbSegmentMs).toBe(4000);

        tester.expect(routeData.segments[2].pbSplitMs).toBe(7000);
        tester.expect(routeData.segments[2].pbSegmentMs).toBe(2000);
    });

    tester.it('does not sync canonical PB timing fields when route data is missing segments', () => {
        const routeData = {
            personalBest: '00:00:07',
            personalBestMs: 9000
        };

        runSaveService.syncCanonicalPbTimingFields(routeData);

        tester.expect(routeData.personalBestMs).toBe(9000);
    });
});