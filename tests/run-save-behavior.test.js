import { tester } from './test-runner/tester.js';
import { RouteLoader } from '../public/js/app/route-loader.js';
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

tester.describe('RouteLoader confirmed run save behavior', () => {
  let routeLoader;
  let baselineRoute;

  tester.beforeEach(() => {
    routeLoader = new RouteLoader({
      storageProvider: null
    });

    baselineRoute = cloneFixture(createTimerColorPaceRoute());
  });

  tester.it('updates gold splits from a completed PB run without inventing impossible golds', () => {
    const activeRunRoute = cloneFixture(createCompletedPbRunRoute());
    const targetRoute = cloneFixture(activeRunRoute);

    routeLoader.sessionSetSegments.add(1);
    routeLoader.sessionSetSegments.add(2);
    routeLoader.sessionSetSegments.add(3);

    routeLoader.updateGoldSplitsFromCompletedRun(
      targetRoute,
      activeRunRoute,
      baselineRoute
    );

    tester.expect(getSegmentGoldSplit(targetRoute.segments[0])).toBe('00:00:03');
    tester.expect(getSegmentGoldSplit(targetRoute.segments[1])).toBe('00:00:05');
    tester.expect(getSegmentGoldSplit(targetRoute.segments[2])).toBe('00:00:05');
  });

  tester.it('updates only improved gold splits from a completed non-PB run', () => {
    const activeRunRoute = cloneFixture(createCompletedNonPbRunWithGoldRoute());
    const targetRoute = cloneFixture(baselineRoute);

    routeLoader.sessionSetSegments.add(1);
    routeLoader.sessionSetSegments.add(2);
    routeLoader.sessionSetSegments.add(3);

    routeLoader.updateGoldSplitsFromCompletedRun(
      targetRoute,
      activeRunRoute,
      baselineRoute
    );

    // Segment 1 active duration = 00:00:06, baseline gold = 00:00:05, unchanged.
    tester.expect(getSegmentGoldSplit(targetRoute.segments[0])).toBe('00:00:05');

    // Segment 2 active duration = 00:00:04, baseline gold = 00:00:05, improved.
    tester.expect(getSegmentGoldSplit(targetRoute.segments[1])).toBe('00:00:04');

    // Segment 3 active duration = 00:00:08, baseline gold = 00:00:05, unchanged.
    tester.expect(getSegmentGoldSplit(targetRoute.segments[2])).toBe('00:00:05');
  });

  tester.it('keeps PB split data unchanged for non-PB gold split saves', () => {
    const activeRunRoute = cloneFixture(createCompletedNonPbRunWithGoldRoute());
    const targetRoute = cloneFixture(baselineRoute);

    routeLoader.sessionSetSegments.add(1);
    routeLoader.sessionSetSegments.add(2);
    routeLoader.sessionSetSegments.add(3);

    routeLoader.updateGoldSplitsFromCompletedRun(
      targetRoute,
      activeRunRoute,
      baselineRoute
    );

    tester.expect(getSegmentPbSplitTime(targetRoute.segments[0])).toBe('00:00:05');
    tester.expect(getSegmentPbSplitTime(targetRoute.segments[1])).toBe('00:00:10');
    tester.expect(getSegmentPbSplitTime(targetRoute.segments[2])).toBe('00:00:15');

    tester.expect(getSegmentPbSegmentDuration(targetRoute.segments[0])).toBe('00:00:05');
    tester.expect(getSegmentPbSegmentDuration(targetRoute.segments[1])).toBe('00:00:05');
    tester.expect(getSegmentPbSegmentDuration(targetRoute.segments[2])).toBe('00:00:05');
  });

  tester.it('recalculates sumOfBest from gold splits', () => {
    const route = cloneFixture(baselineRoute);

    route.segments[0].goldSplit = '00:00:03';
    route.segments[0].bestTime = '00:00:03';

    route.segments[1].goldSplit = '00:00:05';
    route.segments[1].bestTime = '00:00:05';

    route.segments[2].goldSplit = '00:00:05';
    route.segments[2].bestTime = '00:00:05';

    routeLoader.routeData = route;
    routeLoader.updateRouteRunStats();

    tester.expect(route.sumOfBest).toBe('00:00:13');
  });
});