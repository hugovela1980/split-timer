import { tester } from './test-runner/tester.js';
import { SplitTimerController } from '../public/js/app/split-timer-controller.js';
import {
  createTimerColorPaceRoute,
  createCompletedPbRunRoute,
  createCompletedNonPbRunWithGoldRoute,
  cloneFixture
} from './fixtures/routes.js';
import {
  getSegmentPbSplitTime,
  getSegmentPbSegmentDuration,
  getSegmentGoldSplit,
  setSegmentPbSplitTime
} from '../public/js/utils/utils.js';

function withFakeWindow(testFn) {
  return async () => {
    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;

    globalThis.window = {
      dispatchEvent: tester.fn()
    };

    globalThis.CustomEvent = class FakeCustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    };

    try {
      await testFn();
    } finally {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }

      if (originalCustomEvent === undefined) {
        delete globalThis.CustomEvent;
      } else {
        globalThis.CustomEvent = originalCustomEvent;
      }
    }
  };
}

tester.describe('SplitTimerController confirmed run save behavior', () => {
  let splitTimerController;
  let baselineRoute;

  tester.beforeEach(() => {
    splitTimerController = new SplitTimerController({
      storageProvider: null
    });

    baselineRoute = cloneFixture(createTimerColorPaceRoute());
  });

  tester.it('updates gold splits from a completed PB run without inventing impossible golds', () => {
    const activeRunRoute = cloneFixture(createCompletedPbRunRoute());
    const targetRoute = cloneFixture(activeRunRoute);

    splitTimerController.sessionSetSegments.add(1);
    splitTimerController.sessionSetSegments.add(2);
    splitTimerController.sessionSetSegments.add(3);

    splitTimerController.updateGoldSplitsFromCompletedRun(
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

    splitTimerController.sessionSetSegments.add(1);
    splitTimerController.sessionSetSegments.add(2);
    splitTimerController.sessionSetSegments.add(3);

    splitTimerController.updateGoldSplitsFromCompletedRun(
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

    splitTimerController.sessionSetSegments.add(1);
    splitTimerController.sessionSetSegments.add(2);
    splitTimerController.sessionSetSegments.add(3);

    splitTimerController.updateGoldSplitsFromCompletedRun(
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

    splitTimerController.routeData = route;
    splitTimerController.updateRouteRunStats();

    tester.expect(route.sumOfBest).toBe('00:00:13');
  });

  tester.it('does not clear completed-run state when scroll updates current segment after run completion', async () => {
    splitTimerController.routeData = cloneFixture(createCompletedNonPbRunWithGoldRoute());

    splitTimerController.runComplete = {
      finalTime: '00:00:19',
      isNewPB: false,
      previousPB: '00:00:15'
    };

    splitTimerController.renderComparisonsPanel = tester.fn();
    splitTimerController.handleRouteDataChanged = tester.fn(async () => {
      splitTimerController.runComplete = null;
    });

    await splitTimerController.updateCurrentSegmentProgress('segment-2');

    tester.expect(splitTimerController.runComplete.finalTime).toBe('00:00:19');
    tester.expect(splitTimerController.renderComparisonsPanel).toHaveBeenCalledTimes(1);
    tester.expect(splitTimerController.handleRouteDataChanged).toHaveBeenCalledTimes(0);
  });

  tester.it('captures last completed run review before deleting completed run data', async () => {
    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;

    globalThis.window = {
      dispatchEvent: tester.fn()
    };

    globalThis.CustomEvent = class FakeCustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    };

    try {
      splitTimerController.routeData = cloneFixture(createCompletedNonPbRunWithGoldRoute());

      splitTimerController.runComplete = {
        finalTime: '00:00:19',
        isNewPB: false,
        previousPB: '00:00:15'
      };

      splitTimerController.restoreActiveRunRouteFromStorage = tester.fn(() => (
        cloneFixture(createCompletedNonPbRunWithGoldRoute())
      ));

      splitTimerController.restoreBaselineRouteFromStorage = tester.fn(() => (
        cloneFixture(createTimerColorPaceRoute())
      ));

      splitTimerController.clearRunStorage = tester.fn();
      splitTimerController.saveRunSessionToStorage = tester.fn();
      splitTimerController.saveCleanRouteState = tester.fn(async () => { });
      splitTimerController.populateRoute = tester.fn();
      splitTimerController.resetRouteProgressToFirstSegmentAndRender = tester.fn(async () => { });

      splitTimerController.sessionSetSegments.add(1);
      splitTimerController.sessionSetSegments.add(2);

      await splitTimerController.deleteCompletedRunData();

      tester.expect(splitTimerController.lastCompletedRunReview === null).toBe(false);
      tester.expect(splitTimerController.lastCompletedRunReview.action).toBe('deleted-run-data');
      tester.expect(splitTimerController.lastCompletedRunReview.hasRecordedRunData).toBe(true);
      tester.expect(splitTimerController.lastCompletedRunReview.runComplete.finalTime).toBe('00:00:19');

      tester.expect(splitTimerController.lastCompletedRunReview.routeData.segments.length).toBe(2);
      tester.expect(splitTimerController.lastCompletedRunReview.routeData.segments[0].id).toBe(1);
      tester.expect(splitTimerController.lastCompletedRunReview.routeData.segments[1].id).toBe(2);
    } finally {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }

      if (originalCustomEvent === undefined) {
        delete globalThis.CustomEvent;
      } else {
        globalThis.CustomEvent = originalCustomEvent;
      }
    }
  });

  tester.it('does not show baseline route data in Last Run review when deleting an unset run', async () => {
    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;

    globalThis.window = {
      dispatchEvent: tester.fn()
    };

    globalThis.CustomEvent = class FakeCustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    };

    try {
      splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());

      splitTimerController.runComplete = {
        finalTime: '00:00:04',
        isNewPB: false,
        previousPB: '00:00:15'
      };

      splitTimerController.restoreActiveRunRouteFromStorage = tester.fn(() => (
        cloneFixture(createTimerColorPaceRoute())
      ));

      splitTimerController.restoreBaselineRouteFromStorage = tester.fn(() => (
        cloneFixture(createTimerColorPaceRoute())
      ));

      splitTimerController.clearRunStorage = tester.fn();
      splitTimerController.saveRunSessionToStorage = tester.fn();
      splitTimerController.saveCleanRouteState = tester.fn(async () => { });
      splitTimerController.populateRoute = tester.fn();
      splitTimerController.resetRouteProgressToFirstSegmentAndRender = tester.fn(async () => { });

      await splitTimerController.deleteCompletedRunData();

      tester.expect(splitTimerController.lastCompletedRunReview === null).toBe(false);
      tester.expect(splitTimerController.lastCompletedRunReview.action).toBe('deleted-run-data');
      tester.expect(splitTimerController.lastCompletedRunReview.hasRecordedRunData).toBe(false);
      tester.expect(splitTimerController.lastCompletedRunReview.routeData).toBe(null);
    } finally {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }

      if (originalCustomEvent === undefined) {
        delete globalThis.CustomEvent;
      } else {
        globalThis.CustomEvent = originalCustomEvent;
      }
    }
  });

  tester.it('endRunManually treats a first completed run as a new PB', withFakeWindow(async () => {
    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());

    splitTimerController.routeData.personalBest = '';
    splitTimerController.personalBestAtRunStart = '';
    splitTimerController.liveStopwatchTime = '00:00:12';
    splitTimerController.hasRunStarted = true;

    splitTimerController.renderComparisonsPanel = tester.fn();
    splitTimerController.saveRunSessionToStorage = tester.fn();

    await splitTimerController.endRunManually();

    tester.expect(splitTimerController.runComplete.finalTime).toBe('00:00:12');
    tester.expect(splitTimerController.runComplete.isNewPB).toBe(true);
    tester.expect(splitTimerController.runComplete.previousPB).toBe('--:--:--');
    tester.expect(splitTimerController.hasRunStarted).toBe(false);
  }));

  tester.it('endRunManually treats a faster completed run as a new PB', withFakeWindow(async () => {
    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());

    splitTimerController.routeData.personalBest = '00:00:15';
    splitTimerController.personalBestAtRunStart = '00:00:15';
    splitTimerController.liveStopwatchTime = '00:00:12';
    splitTimerController.hasRunStarted = true;

    splitTimerController.renderComparisonsPanel = tester.fn();
    splitTimerController.saveRunSessionToStorage = tester.fn();

    await splitTimerController.endRunManually();

    tester.expect(splitTimerController.runComplete.finalTime).toBe('00:00:12');
    tester.expect(splitTimerController.runComplete.isNewPB).toBe(true);
    tester.expect(splitTimerController.runComplete.previousPB).toBe('00:00:15');
    tester.expect(splitTimerController.hasRunStarted).toBe(false);
  }));

  tester.it('endRunManually treats a slower completed run as non-PB', withFakeWindow(async () => {
    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());

    splitTimerController.routeData.personalBest = '00:00:15';
    splitTimerController.personalBestAtRunStart = '00:00:15';
    splitTimerController.liveStopwatchTime = '00:00:19';
    splitTimerController.hasRunStarted = true;

    splitTimerController.renderComparisonsPanel = tester.fn();
    splitTimerController.saveRunSessionToStorage = tester.fn();

    await splitTimerController.endRunManually();

    tester.expect(splitTimerController.runComplete.finalTime).toBe('00:00:19');
    tester.expect(splitTimerController.runComplete.isNewPB).toBe(false);
    tester.expect(splitTimerController.runComplete.previousPB).toBe('00:00:15');
    tester.expect(splitTimerController.hasRunStarted).toBe(false);
  }));

  tester.it('advanceToNextSegment treats final segment on first run as a new PB', withFakeWindow(async () => {
    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());

    splitTimerController.routeData.personalBest = '';
    splitTimerController.personalBestAtRunStart = '';
    splitTimerController.hasRunStarted = true;

    const lastSegment = splitTimerController.routeData.segments[
      splitTimerController.routeData.segments.length - 1
    ];

    setSegmentPbSplitTime(lastSegment, '00:00:12');

    splitTimerController.renderComparisonsPanel = tester.fn();

    await splitTimerController.advanceToNextSegment(lastSegment.id);

    tester.expect(splitTimerController.runComplete.finalTime).toBe('00:00:12');
    tester.expect(splitTimerController.runComplete.isNewPB).toBe(true);
    tester.expect(splitTimerController.runComplete.previousPB).toBe('--:--:--');
    tester.expect(splitTimerController.hasRunStarted).toBe(false);
  }));

  tester.it('advanceToNextSegment treats final segment on first run as a new PB using live stopwatch time', withFakeWindow(async () => {
    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());

    splitTimerController.routeData.personalBest = '';
    splitTimerController.personalBestAtRunStart = '';
    splitTimerController.liveStopwatchTime = '00:00:12';
    splitTimerController.hasRunStarted = true;

    const lastSegment = splitTimerController.routeData.segments[
      splitTimerController.routeData.segments.length - 1
    ];

    setSegmentPbSplitTime(lastSegment, '');

    splitTimerController.renderComparisonsPanel = tester.fn();
    splitTimerController.saveRunSessionToStorage = tester.fn();

    await splitTimerController.advanceToNextSegment(lastSegment.id);

    tester.expect(splitTimerController.runComplete.finalTime).toBe('00:00:12');
    tester.expect(splitTimerController.runComplete.isNewPB).toBe(true);
    tester.expect(splitTimerController.runComplete.previousPB).toBe('--:--:--');
    tester.expect(splitTimerController.hasRunStarted).toBe(false);
  }));

  tester.it('advanceToNextSegment treats first run as PB even if active route data now has a personalBest', withFakeWindow(async () => {
    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());

    splitTimerController.personalBestAtRunStart = '';
    splitTimerController.routeData.personalBest = '00:00:03';
    splitTimerController.liveStopwatchTime = '00:00:03';
    splitTimerController.hasRunStarted = true;
    splitTimerController.runDataSnapshot = cloneFixture(createTimerColorPaceRoute());

    const lastSegment = splitTimerController.routeData.segments[
      splitTimerController.routeData.segments.length - 1
    ];

    setSegmentPbSplitTime(lastSegment, '00:00:03');

    splitTimerController.renderComparisonsPanel = tester.fn();
    splitTimerController.saveRunSessionToStorage = tester.fn();

    await splitTimerController.advanceToNextSegment(lastSegment.id);

    tester.expect(splitTimerController.runComplete.finalTime).toBe('00:00:03');
    tester.expect(splitTimerController.runComplete.isNewPB).toBe(true);
    tester.expect(splitTimerController.runComplete.previousPB).toBe('--:--:--');
    tester.expect(splitTimerController.hasRunStarted).toBe(false);
  }));

  tester.it('setSegmentTimeFromCurrentStopwatch sets the current segment split and advances', async () => {
    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());
    splitTimerController.routeData.currentSegmentId = 1;
    splitTimerController.routeData.currentSegmentName = 'Segment 1';

    splitTimerController.getCurrentStopwatchTime = tester.fn(() => '00:00:04');
    splitTimerController.captureSessionBestSnapshot = tester.fn();
    splitTimerController.ensureRunSnapshotCaptured = tester.fn();
    splitTimerController.updateRunPaceStateFromCompletedSegment = tester.fn();
    splitTimerController.saveRunSessionToStorage = tester.fn();
    splitTimerController.handleRouteDataChanged = tester.fn(async () => { });
    splitTimerController.updateSessionGoldSplitState = tester.fn();
    splitTimerController.populateSidebar = tester.fn();
    splitTimerController.renderComparisonsPanel = tester.fn();
    splitTimerController.updateMainTimerColor = tester.fn();
    splitTimerController.advanceToNextSegment = tester.fn(async () => { });

    await splitTimerController.setSegmentTimeFromCurrentStopwatch(1);

    const segment = splitTimerController.getSegmentById(1);

    tester.expect(getSegmentPbSplitTime(segment)).toBe('00:00:04');
    tester.expect(splitTimerController.sessionSetSegments.has(1)).toBe(true);
    tester.expect(splitTimerController.advanceToNextSegment).toHaveBeenCalledWith(1);
  });

  tester.it('bindComparisonPanelActions wires Set Segment Time button to current segment', async () => {
    const clickListeners = {};

    const setSegmentTimeButton = {
      addEventListener(type, listener) {
        clickListeners[type] = listener;
      }
    };

    splitTimerController.routeData = cloneFixture(createTimerColorPaceRoute());
    splitTimerController.routeData.currentSegmentId = 1;

    splitTimerController.comparisonsContainer = {
      querySelector(selector) {
        if (selector === '.comparisons__set-segment-time-btn') {
          return setSegmentTimeButton;
        }

        return null;
      }
    };

    splitTimerController.setSegmentTimeFromCurrentStopwatch = tester.fn(async () => { });

    splitTimerController.bindComparisonPanelActions();

    await clickListeners.click();

    tester.expect(splitTimerController.setSegmentTimeFromCurrentStopwatch).toHaveBeenCalledWith(1);
  });
});