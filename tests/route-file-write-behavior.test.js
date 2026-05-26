import { tester } from './test-runner/tester.js';
import { RouteLoader } from '../public/js/app/route-loader.js';
import { createTimerColorPaceRoute, cloneFixture } from './fixtures/routes.js';

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
});