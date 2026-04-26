export type TransportClockState = {
  bpm: number;
  isRunning: boolean;
  elapsedMs: number;
  beatPosition: number;
};

export type TransportClockListener = (state: TransportClockState) => void;

export type TransportClock = {
  start: () => void;
  stop: () => void;
  reset: () => void;
  setBpm: (bpm: number) => void;
  getState: () => TransportClockState;
  subscribe: (listener: TransportClockListener) => () => void;
};

export type TransportClockOptions = {
  bpm?: number;
  updateIntervalMs?: number;
  now?: () => number;
  setIntervalFn?: (callback: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (id: ReturnType<typeof setInterval>) => void;
};
