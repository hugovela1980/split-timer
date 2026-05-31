import { tester } from './test-runner/tester.js';
import { RouteDataService } from '../public/js/services/route-data-service.js';

function createLegacyRouteData() {
  return {
    name: 'Act 1 100%',
    personalBest: '00:10:00',
    sumOfBest: '00:09:30',
    segments: [
      {
        name: 'Get Silk Spear',
        time: '00:02:00',
        duration: '00:02:00',
        bestTime: '00:01:50',
        subSegments: [
          {
            description: 'Enter room',
            time: '00:01:15',
            allowSetTime: true
          }
        ]
      }
    ]
  };
}

tester.describe('RouteDataService', () => {
  tester.it('loads and normalizes route data', async () => {
    const fetchMock = tester.fn(async () => ({
      ok: true,
      json: async () => createLegacyRouteData()
    }));

    const service = new RouteDataService({ fetchProvider: fetchMock });

    const routeData = await service.loadRouteData('legacy-route.json');

    tester.expect(fetchMock).toHaveBeenCalledWith('./data/routes/legacy-route.json');

    tester.expect(routeData.schemaVersion).toBe(2);
    tester.expect(routeData.routeId).toBe('act-1-100');
    tester.expect(routeData.personalBestMs).toBe(600000);
    tester.expect(routeData.sumOfBestMs).toBe(570000);

    const segment = routeData.segments[0];

    tester.expect(segment.id).toBe('segment-get-silk-spear');
    tester.expect(segment.order).toBe(1);
    tester.expect(segment.pbSplitMs).toBe(120000);
    tester.expect(segment.pbSegmentMs).toBe(120000);
    tester.expect(segment.goldSegmentMs).toBe(110000);

    const subSegment = segment.subSegments[0];

    tester.expect(subSegment.id).toBe('subsegment-enter-room');
    tester.expect(subSegment.order).toBe(1);
    tester.expect(subSegment.setTimeMs).toBe(75000);
  });

  tester.it('supports wrapped route data responses', async () => {
    const fetchMock = tester.fn(async () => ({
      ok: true,
      json: async () => ({
        route: createLegacyRouteData()
      })
    }));

    const service = new RouteDataService({ fetchProvider: fetchMock });

    const routeData = await service.loadRouteData('wrapped-route.json');

    tester.expect(routeData.name).toBe('Act 1 100%');
    tester.expect(routeData.schemaVersion).toBe(2);
    tester.expect(routeData.segments.length).toBe(1);
  });

  tester.it('throws when loaded route data is missing segments', async () => {
    const fetchMock = tester.fn(async () => ({
      ok: true,
      json: async () => ({
        name: 'Invalid Route'
      })
    }));

    const service = new RouteDataService({ fetchProvider: fetchMock });

    let errorMessage = '';

    try {
      await service.loadRouteData('invalid-route.json');
    } catch (error) {
      errorMessage = error.message;
    }

    tester.expect(errorMessage).toBe('Invalid invalid-route.json format: missing route segments');
  });
});