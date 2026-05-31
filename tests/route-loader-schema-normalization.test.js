import { tester } from './test-runner/tester.js';
import { RouteLoader } from '../public/js/app/route-loader.js';

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

tester.describe('RouteLoader schema normalization', () => {
  let routeLoader;

  tester.beforeEach(() => {
    routeLoader = new RouteLoader({ storageProvider: null });

    globalThis.fetch = tester.fn(async () => ({
      ok: true,
      json: async () => createLegacyRouteData()
    }));
  });

  tester.it('normalizes route data when loading a route', async () => {
    await routeLoader.loadRouteData('legacy-route.json');

    tester.expect(routeLoader.currentRouteFilename).toBe('legacy-route.json');

    tester.expect(routeLoader.routeData.schemaVersion).toBe(2);
    tester.expect(routeLoader.routeData.routeId).toBe('act-1-100');
    tester.expect(routeLoader.routeData.personalBestMs).toBe(600000);
    tester.expect(routeLoader.routeData.sumOfBestMs).toBe(570000);

    const segment = routeLoader.routeData.segments[0];

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
});