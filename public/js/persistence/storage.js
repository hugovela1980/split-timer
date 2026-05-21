// Shared storage helpers for stopwatch route state

const resolveStorage = (storage) => {
  if (storage) return storage;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  throw new Error('No storage provider available. Pass a storage object to the helper when running outside a browser.');
};

export function persistRouteDataToStorage(routeData, routeStorageKey, storage) {
  if (!routeData) return;
  const provider = resolveStorage(storage);
  provider.setItem(routeStorageKey, JSON.stringify(routeData));
}

export function saveRunSessionToStorage(state, runSessionStorageKey, storage) {
  const provider = resolveStorage(storage);
  const session = {
    hasRunStarted: state.hasRunStarted,
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
      sessionSetSegments: new Set(Array.isArray(session.setSegments) ? session.setSegments.map(Number) : []),
      sessionGoldSplits: new Set(Array.isArray(session.goldSplits) ? session.goldSplits.map(Number) : []),
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
