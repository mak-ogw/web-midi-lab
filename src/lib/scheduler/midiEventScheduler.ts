import type {
  MidiEventScheduler,
  MidiEventSchedulerOptions,
  MidiEventSchedulerState,
  ScheduledMidiEvent,
} from './types';

const defaultLookaheadMs = 100;
const defaultIntervalMs = 25;

function sanitizePositiveNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function insertInTimeOrder(events: ScheduledMidiEvent[], event: ScheduledMidiEvent): void {
  let index = events.findIndex((existing) => existing.timeMs > event.timeMs);

  if (index === -1) {
    index = events.length;
  }

  events.splice(index, 0, event);
}

export function createMidiEventScheduler(options: MidiEventSchedulerOptions): MidiEventScheduler {
  const now = options.now ?? (() => performance.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const lookaheadMs = sanitizePositiveNumber(options.lookaheadMs, defaultLookaheadMs);
  const intervalMs = sanitizePositiveNumber(options.intervalMs, defaultIntervalMs);

  const events: ScheduledMidiEvent[] = [];
  let isRunning = false;
  let timerId: ReturnType<typeof setInterval> | null = null;

  function processDueEvents() {
    const processUntilMs = now() + lookaheadMs;

    while (events.length > 0 && events[0].timeMs <= processUntilMs) {
      const dueEvent = events.shift();
      if (!dueEvent) {
        return;
      }

      options.send(dueEvent.message, dueEvent.timeMs);
    }
  }

  function getState(): MidiEventSchedulerState {
    return {
      isRunning,
      scheduledCount: events.length,
    };
  }

  return {
    schedule(event) {
      const existingIndex = events.findIndex((candidate) => candidate.id === event.id);
      if (existingIndex !== -1) {
        events.splice(existingIndex, 1);
      }

      insertInTimeOrder(events, event);
    },
    cancel(eventId) {
      const index = events.findIndex((event) => event.id === eventId);
      if (index !== -1) {
        events.splice(index, 1);
      }
    },
    clear() {
      events.length = 0;
    },
    start() {
      if (isRunning) {
        return;
      }

      isRunning = true;
      processDueEvents();
      timerId = setIntervalFn(() => {
        processDueEvents();
      }, intervalMs);
    },
    stop() {
      if (!isRunning) {
        return;
      }

      isRunning = false;
      if (timerId !== null) {
        clearIntervalFn(timerId);
        timerId = null;
      }
    },
    getState,
  };
}
