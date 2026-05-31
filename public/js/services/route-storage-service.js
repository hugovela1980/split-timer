import {
    persistRouteDataToStorage,
    restoreRouteDataFromStorage,
    saveBaselineRouteToStorage,
    restoreBaselineRouteFromStorage,
    saveActiveRunRouteToStorage,
    restoreActiveRunRouteFromStorage,
    saveRunSessionToStorage,
    restoreRunSessionFromStorage,
    clearRunStorage
} from '../persistence/storage.js';

export class RouteStorageService {
    constructor({
        storageProvider = typeof globalThis !== 'undefined' && globalThis.localStorage
            ? globalThis.localStorage
            : null,
        keys = {}
    } = {}) {
        this.storageProvider = storageProvider;

        this.keys = {
            routeData: keys.routeData || 'stopwatch:routeData',
            baselineRouteData: keys.baselineRouteData || 'stopwatch:baselineRouteData',
            activeRunRouteData: keys.activeRunRouteData || 'stopwatch:activeRunRouteData',
            runSession: keys.runSession || 'stopwatch:runSession'
        };
    }

    persistRouteData(routeData) {
        persistRouteDataToStorage(
            routeData,
            this.keys.routeData,
            this.storageProvider
        );
    }

    restoreRouteData() {
        return restoreRouteDataFromStorage(
            this.keys.routeData,
            this.storageProvider
        );
    }

    saveBaselineRoute(routeData) {
        saveBaselineRouteToStorage(
            routeData,
            this.keys.baselineRouteData,
            this.storageProvider
        );
    }

    restoreBaselineRoute() {
        return restoreBaselineRouteFromStorage(
            this.keys.baselineRouteData,
            this.storageProvider
        );
    }

    saveActiveRunRoute(routeData) {
        saveActiveRunRouteToStorage(
            routeData,
            this.keys.activeRunRouteData,
            this.storageProvider
        );
    }

    restoreActiveRunRoute() {
        return restoreActiveRunRouteFromStorage(
            this.keys.activeRunRouteData,
            this.storageProvider
        );
    }

    saveRunSession(state) {
        saveRunSessionToStorage(
            state,
            this.keys.runSession,
            this.storageProvider
        );
    }

    restoreRunSession() {
        return restoreRunSessionFromStorage(
            this.keys.runSession,
            this.storageProvider
        );
    }

    clearRunStorage() {
        clearRunStorage(
            [
                this.keys.runSession,
                this.keys.activeRunRouteData
            ],
            this.storageProvider
        );
    }

    clearAllRouteStorage() {
        clearRunStorage(
            [
                this.keys.routeData,
                this.keys.baselineRouteData,
                this.keys.activeRunRouteData,
                this.keys.runSession
            ],
            this.storageProvider
        );
    }
}