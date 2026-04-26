import type {
  TransportClock,
  TransportClockListener,
  TransportClockOptions,
  TransportClockState,
} from './types';

const defaultBpm = 120;
const defaultUpdateIntervalMs = 25;

function clampBpm(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultBpm;
  }

  return Math.max(1, value);
}

function toBeatDelta(elapsedMs: number, bpm: number): number {
  return (elapsedMs / 60000) * bpm;
}

export function createTransportClock(options: TransportClockOptions = {}): TransportClock {
  const now = options.now ?? (() => performance.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  let bpm = clampBpm(options.bpm ?? defaultBpm);
  let isRunning = false;
  let elapsedBeforeStartMs = 0;
  let startedAtMs = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let beatOffset = 0;
  let beatAnchorElapsedMs = 0;

  const listeners = new Set<TransportClockListener>();

  function getElapsedMs(currentNow = now()): number {
    if (!isRunning) {
      return elapsedBeforeStartMs;
    }

    return elapsedBeforeStartMs + (currentNow - startedAtMs);
  }

  function getBeatPosition(elapsedMs: number): number {
    const elapsedSinceAnchor = Math.max(0, elapsedMs - beatAnchorElapsedMs);
    return beatOffset + toBeatDelta(elapsedSinceAnchor, bpm);
  }

  function buildState(currentNow = now()): TransportClockState {
    const elapsedMs = Math.max(0, getElapsedMs(currentNow));

    return {
      bpm,
      isRunning,
      elapsedMs,
      beatPosition: getBeatPosition(elapsedMs),
    };
  }

  function notifyListeners() {
    const state = buildState();
    listeners.forEach((listener) => listener(state));
  }

  function ensureTickerRunning() {
    if (timerId) {
      return;
    }

    timerId = setIntervalFn(() => {
      notifyListeners();
    }, options.updateIntervalMs ?? defaultUpdateIntervalMs);
  }

  function stopTicker() {
    if (!timerId) {
      return;
    }

    clearIntervalFn(timerId);
    timerId = null;
  }

  return {
    start() {
      if (isRunning) {
        return;
      }

      startedAtMs = now();
      isRunning = true;
      ensureTickerRunning();
      notifyListeners();
    },
    stop() {
      if (!isRunning) {
        return;
      }

      elapsedBeforeStartMs = getElapsedMs();
      isRunning = false;
      stopTicker();
      notifyListeners();
    },
    reset() {
      elapsedBeforeStartMs = 0;
      beatOffset = 0;
      beatAnchorElapsedMs = 0;
      if (isRunning) {
        startedAtMs = now();
      }
      notifyListeners();
    },
    setBpm(nextBpm: number) {
      const elapsedMs = getElapsedMs();
      beatOffset = getBeatPosition(elapsedMs);
      beatAnchorElapsedMs = elapsedMs;
      bpm = clampBpm(nextBpm);
      notifyListeners();
    },
    getState() {
      return buildState();
    },
    subscribe(listener: TransportClockListener) {
      listeners.add(listener);
      listener(buildState());

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
