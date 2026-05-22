// Shared storage helpers for stopwatch route state

const resolveStorage = (storage) => {
  if (storage) return storage;

  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }

  throw new Error(
    'No storage provider available. Pass a storage object to the helper when running outside a browser.'
  );
};

const safeJsonParse = (rawValue, fallback = null) => {
  try {
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    console.warn('⚠️ Failed to parse stored JSON:', error);
    return fallback;
  }
};

/**
 * Generic route-data storage.
 * This keeps your old helper working for route-loader.js.
 */
export function persistRouteDataToStorage(routeData, routeStorageKey, storage) {
  if (!routeData) return;

  const provider = resolveStorage(storage);
  provider.setItem(routeStorageKey, JSON.stringify(routeData));
}

export function restoreRouteDataFromStorage(routeStorageKey, storage) {
  const provider = resolveStorage(storage);
  return safeJsonParse(provider.getItem(routeStorageKey), null);
}

/**
 * Baseline route storage.
 * This should represent the pre-run route state.
 * Use this to revert file/localStorage after deleting run info.
 */
export function saveBaselineRouteToStorage(routeData, baselineRouteStorageKey, storage) {
  if (!routeData) return;

  const provider = resolveStorage(storage);
  provider.setItem(baselineRouteStorageKey, JSON.stringify(routeData));
}

export function restoreBaselineRouteFromStorage(baselineRouteStorageKey, storage) {
  const provider = resolveStorage(storage);
  return safeJsonParse(provider.getItem(baselineRouteStorageKey), null);
}

/**
 * Active run route storage.
 * This should represent the same route data currently being autosaved to file
 * during an active run.
 */
export function saveActiveRunRouteToStorage(routeData, activeRunRouteStorageKey, storage) {
  if (!routeData) return;

  const provider = resolveStorage(storage);
  provider.setItem(activeRunRouteStorageKey, JSON.stringify(routeData));
}

export function restoreActiveRunRouteFromStorage(activeRunRouteStorageKey, storage) {
  const provider = resolveStorage(storage);
  return safeJsonParse(provider.getItem(activeRunRouteStorageKey), null);
}

/**
 * Run session metadata storage.
 * This does not store the whole route.
 * It stores metadata needed to understand the active run.
 */
export function saveRunSessionToStorage(state, runSessionStorageKey, storage) {
  const provider = resolveStorage(storage);

  const session = {
    hasRunStarted: state.hasRunStarted,
    currentRouteFilename: state.currentRouteFilename || '',
    setSegments: [...state.sessionSetSegments],
    goldSplits: [...state.sessionGoldSplits],
    bestBySegment: [...state.sessionBestBySegment]
  };

  provider.setItem(runSessionStorageKey, JSON.stringify(session));
}

export function restoreRunSessionFromStorage(runSessionStorageKey, storage) {
  try {
    const provider = resolveStorage(storage);
    const raw = provider.getItem(runSessionStorageKey);
    if (!raw) return null;

    const session = JSON.parse(raw);

    return {
      hasRunStarted: session.hasRunStarted === true,
      currentRouteFilename: typeof session.currentRouteFilename === 'string'
        ? session.currentRouteFilename
        : '',
      sessionSetSegments: new Set(
        Array.isArray(session.setSegments)
          ? session.setSegments.map(Number)
          : []
      ),
      sessionGoldSplits: new Set(
        Array.isArray(session.goldSplits)
          ? session.goldSplits.map(Number)
          : []
      ),
      sessionBestBySegment: new Map(
        Array.isArray(session.bestBySegment)
          ? session.bestBySegment.map(([id, best]) => [Number(id), best])
          : []
      )
    };
  } catch (error) {
    console.warn('⚠️ Failed to restore run session from storage:', error);
    return null;
  }
}

/**
 * Clear only this app's run-related storage keys.
 * Do not use localStorage.clear(), because that wipes everything for this origin.
 */
export function clearRunStorage(storageKeys, storage) {
  const provider = resolveStorage(storage);

  storageKeys.forEach((key) => {
    if (key) provider.removeItem(key);
  });
}