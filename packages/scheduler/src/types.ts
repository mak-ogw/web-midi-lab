export type MidiEventMessage = number[];

export type ScheduledMidiEvent = {
  id: string;
  timeMs: number;
  message: MidiEventMessage;
};

export type MidiEventSender = (message: MidiEventMessage, timestampMs?: number) => void;

export type MidiEventSchedulerState = {
  isRunning: boolean;
  scheduledCount: number;
};

export type MidiEventSchedulerOptions = {
  send: MidiEventSender;
  now?: () => number;
  lookaheadMs?: number;
  intervalMs?: number;
  setIntervalFn?: (callback: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (id: ReturnType<typeof setInterval>) => void;
};

export type MidiEventScheduler = {
  schedule: (event: ScheduledMidiEvent) => void;
  cancel: (eventId: string) => void;
  clear: () => void;
  start: () => void;
  stop: () => void;
  getState: () => MidiEventSchedulerState;
};
