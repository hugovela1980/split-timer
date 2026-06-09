import { tester } from './test-runner/tester.js';
import { RouteStorageService } from '../public/js/services/route-storage-service.js';

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

        hasItem(key) {
            return store.has(key);
        }
    };
}

function createService(storageProvider = createMemoryStorage()) {
    return new RouteStorageService({
        storageProvider,
        keys: {
            routeData: 'test:routeData',
            baselineRouteData: 'test:baselineRouteData',
            activeRunRouteData: 'test:activeRunRouteData',
            runSession: 'test:runSession'
        }
    });
}

tester.describe('RouteStorageService', () => {
    tester.it('persists and restores route data', () => {
        const service = createService();

        const routeData = {
            name: 'Act 1 100%',
            segments: [
                {
                    id: 1,
                    name: 'Get Silk Spear'
                }
            ]
        };

        service.persistRouteData(routeData);

        tester.expect(service.restoreRouteData()).toEqual(routeData);
    });

    tester.it('saves and restores baseline route data', () => {
        const service = createService();

        const routeData = {
            name: 'Baseline Route',
            segments: [
                {
                    id: 1,
                    completed: false
                }
            ]
        };

        service.saveBaselineRoute(routeData);

        tester.expect(service.restoreBaselineRoute()).toEqual(routeData);
    });

    tester.it('saves and restores active-run route data', () => {
        const service = createService();

        const routeData = {
            name: 'Active Run Route',
            segments: [
                {
                    id: 1,
                    completed: true
                }
            ]
        };

        service.saveActiveRunRoute(routeData);

        tester.expect(service.restoreActiveRunRoute()).toEqual(routeData);
    });

    tester.it('saves and restores run session metadata', () => {
        const service = createService();

        service.saveRunSession({
            hasRunStarted: true,
            currentRouteFilename: 'act-1-100-percent.json',
            sessionSetSegments: new Set([1, 2]),
            sessionGoldSplits: new Set([2]),
            sessionBestBySegment: new Map([
                [1, '00:01:00'],
                [2, '00:02:00']
            ])
        });

        const restoredSession = service.restoreRunSession();

        tester.expect(restoredSession.hasRunStarted).toBe(true);
        tester.expect(restoredSession.currentRouteFilename).toBe('act-1-100-percent.json');
        tester.expect(restoredSession.sessionSetSegments.has(1)).toBe(true);
        tester.expect(restoredSession.sessionSetSegments.has(2)).toBe(true);
        tester.expect(restoredSession.sessionGoldSplits.has(2)).toBe(true);
        tester.expect(restoredSession.sessionBestBySegment.get(1)).toBe('00:01:00');
        tester.expect(restoredSession.sessionBestBySegment.get(2)).toBe('00:02:00');
    });

    tester.it('clears only active run and run session storage', () => {
        const storage = createMemoryStorage();
        const service = createService(storage);

        service.persistRouteData({ name: 'Route Data', segments: [] });
        service.saveBaselineRoute({ name: 'Baseline', segments: [] });
        service.saveActiveRunRoute({ name: 'Active Run', segments: [] });
        service.saveRunSession({
            hasRunStarted: true,
            currentRouteFilename: 'act-1-100-percent.json',
            sessionSetSegments: new Set(),
            sessionGoldSplits: new Set(),
            sessionBestBySegment: new Map()
        });

        service.clearRunStorage();

        tester.expect(storage.hasItem('test:routeData')).toBe(true);
        tester.expect(storage.hasItem('test:baselineRouteData')).toBe(true);
        tester.expect(storage.hasItem('test:activeRunRouteData')).toBe(false);
        tester.expect(storage.hasItem('test:runSession')).toBe(false);
    });

    tester.it('clears all route-related storage', () => {
        const storage = createMemoryStorage();
        const service = createService(storage);

        service.persistRouteData({ name: 'Route Data', segments: [] });
        service.saveBaselineRoute({ name: 'Baseline', segments: [] });
        service.saveActiveRunRoute({ name: 'Active Run', segments: [] });
        service.saveRunSession({
            hasRunStarted: true,
            currentRouteFilename: 'act-1-100-percent.json',
            sessionSetSegments: new Set(),
            sessionGoldSplits: new Set(),
            sessionBestBySegment: new Map()
        });

        service.clearAllRouteStorage();

        tester.expect(storage.hasItem('test:routeData')).toBe(false);
        tester.expect(storage.hasItem('test:baselineRouteData')).toBe(false);
        tester.expect(storage.hasItem('test:activeRunRouteData')).toBe(false);
        tester.expect(storage.hasItem('test:runSession')).toBe(false);
    });
});