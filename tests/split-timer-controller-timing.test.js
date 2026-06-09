import { tester } from './test-runner/tester.js';
import { SplitTimerController } from '../public/js/app/split-timer-controller.js';
import { createTimerColorPaceRoute, cloneFixture } from './fixtures/routes.js';
import {
  getSegmentPbSegmentDuration,
  getSegmentGoldSplit,
  setSegmentPbSplitTime
} from '../public/js/utils/utils.js';

tester.describe('SplitTimerController timing recalculation', () => {
  let splitTimerController;
  let routeData;

  tester.beforeEach(() => {
    splitTimerController = new SplitTimerController({
      storageProvider: null
    });

    routeData = cloneFixture(createTimerColorPaceRoute());
    splitTimerController.routeData = routeData;
  });

  tester.it('updates segment durations without mutating gold splits', () => {
    const segment2 = routeData.segments[1];

    // Baseline:
    // Segment 1 split = 00:00:05
    // Segment 2 split = 00:00:10
    // Segment 2 duration = 00:00:05
    // Segment 2 goldSplit = 00:00:05
    //
    // Change Segment 2 split to 00:00:09.
    // New Segment 2 duration should become 00:00:04.
    // But goldSplit should NOT change here.
    // Gold splits should only update during confirmed save actions.
    setSegmentPbSplitTime(segment2, '00:00:09');

    splitTimerController.updateSegmentDurations();

    tester.expect(getSegmentPbSegmentDuration(segment2)).toBe('00:00:04');
    tester.expect(getSegmentGoldSplit(segment2)).toBe('00:00:05');
    tester.expect(routeData.sumOfBest).toBe('00:00:15');
  });

  tester.it('keeps old and new duration fields synced after recalculation', () => {
    const segment2 = routeData.segments[1];

    setSegmentPbSplitTime(segment2, '00:00:09');

    splitTimerController.updateSegmentDurations();

    tester.expect(segment2.pbSegmentDuration).toBe('00:00:04');
    tester.expect(segment2.duration).toBe('00:00:04');
  });
});