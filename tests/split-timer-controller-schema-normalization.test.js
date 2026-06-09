import { tester } from './test-runner/tester.js';
import { SplitTimerController } from '../public/js/app/split-timer-controller.js';
import { RouteDataService } from '../public/js/services/route-data-service.js';

function createLegacyRouteData() {
  return {
    name: 'Act 1 100%',
    personalBest: '00:10:00',
    sumOfBest: '00:09:30',
    currentSegmentId: 1,
    currentSegmentName: 'Get Silk Spear',
    segments: [
      {
        name: 'Get Silk Spear',
        time: '00:02:00',
        duration: '00:02:00',
        bestTime: '00:01:50',
        completed: true,
        subSegments: [
          {
            description: 'Enter room',
            time: '00:01:15',
            allowSetTime: true,
            completed: true
          }
        ]
      }
    ]
  };
}

tester.describe('SplitTimerController schema normalization', () => {
  let splitTimerController;

  tester.beforeEach(() => {
    const fetchMock = tester.fn(async () => ({
      ok: true,
      json: async () => createLegacyRouteData()
    }));

    const routeDataService = new RouteDataService({
      fetchProvider: fetchMock
    });

    splitTimerController = new SplitTimerController({
      storageProvider: null,
      routeDataService
    });
  });

  tester.it('normalizes route data when loading a route', async () => {
    await splitTimerController.loadRouteData('legacy-route.json');

    tester.expect(splitTimerController.currentRouteFilename).toBe('legacy-route.json');

    tester.expect(splitTimerController.routeData.schemaVersion).toBe(2);
    tester.expect(splitTimerController.routeData.routeId).toBe('act-1-100');
    tester.expect(splitTimerController.routeData.personalBestMs).toBe(600000);
    tester.expect(splitTimerController.routeData.sumOfBestMs).toBe(570000);

    const segment = splitTimerController.routeData.segments[0];

    tester.expect(segment.id).toBe('segment-get-silk-spear');
    tester.expect(segment.order).toBe(1);
    tester.expect(segment.pbSplitTime).toBe('00:02:00');
    tester.expect(segment.pbSegmentDuration).toBe('00:02:00');
    tester.expect(segment.goldSplit).toBe('00:01:50');
    tester.expect(segment.pbSplitMs).toBe(120000);
    tester.expect(segment.pbSegmentMs).toBe(120000);
    tester.expect(segment.goldSegmentMs).toBe(110000);

    const subSegment = segment.subSegments[0];

    tester.expect(subSegment.id).toBe('subsegment-enter-room');
    tester.expect(subSegment.order).toBe(1);
    tester.expect(subSegment.setTimeMs).toBe(75000);
  });

  tester.it('preserves existing canonical schema fields when loading a route', async () => {
    const fetchMock = tester.fn(async () => ({
      ok: true,
      json: async () => ({
        schemaVersion: 3,
        routeId: 'custom-route-id',
        name: 'Act 1 100%',
        personalBest: '00:10:00',
        sumOfBest: '00:09:30',
        personalBestMs: 123,
        sumOfBestMs: 456,
        segments: [
          {
            id: 'custom-segment-id',
            name: 'Get Silk Spear',
            order: 10,
            pbSplitTime: '00:02:00',
            pbSegmentDuration: '00:02:00',
            goldSplit: '00:01:50',
            pbSplitMs: 111,
            pbSegmentMs: 222,
            goldSegmentMs: 333,
            subSegments: [
              {
                id: 'custom-subsegment-id',
                description: 'Enter room',
                order: 20,
                time: '00:01:15',
                setTimeMs: 444
              }
            ]
          }
        ]
      })
    }));

    splitTimerController.routeDataService = new RouteDataService({
      fetchProvider: fetchMock
    });

    await splitTimerController.loadRouteData('canonical-route.json');

    tester.expect(splitTimerController.routeData.schemaVersion).toBe(3);
    tester.expect(splitTimerController.routeData.routeId).toBe('custom-route-id');
    tester.expect(splitTimerController.routeData.personalBestMs).toBe(123);
    tester.expect(splitTimerController.routeData.sumOfBestMs).toBe(456);

    const segment = splitTimerController.routeData.segments[0];

    tester.expect(segment.id).toBe('custom-segment-id');
    tester.expect(segment.order).toBe(10);
    tester.expect(segment.pbSplitMs).toBe(111);
    tester.expect(segment.pbSegmentMs).toBe(222);
    tester.expect(segment.goldSegmentMs).toBe(333);

    const subSegment = segment.subSegments[0];

    tester.expect(subSegment.id).toBe('custom-subsegment-id');
    tester.expect(subSegment.order).toBe(20);
    tester.expect(subSegment.setTimeMs).toBe(444);
  });
});