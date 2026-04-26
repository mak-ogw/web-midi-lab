import test from 'node:test';
import assert from 'node:assert/strict';

import { createMidiEventScheduler } from './midiEventScheduler.js';

function createTestTimer(initialNow = 0) {
  let nowMs = initialNow;
  let nextId = 1;
  const callbacks = new Map<number, () => void>();

  return {
    now: () => nowMs,
    advance: (deltaMs: number) => {
      nowMs += deltaMs;
      callbacks.forEach((callback) => callback());
    },
    setIntervalFn: (callback: () => void) => {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id as unknown as ReturnType<typeof setInterval>;
    },
    clearIntervalFn: (id: ReturnType<typeof setInterval>) => {
      callbacks.delete(id as unknown as number);
    },
  };
}

test('scheduling an event increments scheduled count', () => {
  const timer = createTestTimer();
  const scheduler = createMidiEventScheduler({
    send: () => {},
    now: timer.now,
    setIntervalFn: timer.setIntervalFn,
    clearIntervalFn: timer.clearIntervalFn,
  });

  scheduler.schedule({ id: 'e1', timeMs: 500, message: [0x90, 60, 100] });

  assert.equal(scheduler.getState().scheduledCount, 1);
});

test('sending due events when they are within lookahead', () => {
  const timer = createTestTimer();
  const sent: Array<{ message: number[]; timestampMs?: number }> = [];
  const scheduler = createMidiEventScheduler({
    send: (message, timestampMs) => {
      sent.push({ message, timestampMs });
    },
    now: timer.now,
    lookaheadMs: 100,
    setIntervalFn: timer.setIntervalFn,
    clearIntervalFn: timer.clearIntervalFn,
  });

  scheduler.schedule({ id: 'e1', timeMs: 50, message: [0x90, 60, 100] });
  scheduler.start();

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], { message: [0x90, 60, 100], timestampMs: 50 });
});

test('future events are not sent too early', () => {
  const timer = createTestTimer();
  const sent: number[] = [];
  const scheduler = createMidiEventScheduler({
    send: () => {
      sent.push(1);
    },
    now: timer.now,
    lookaheadMs: 100,
    setIntervalFn: timer.setIntervalFn,
    clearIntervalFn: timer.clearIntervalFn,
  });

  scheduler.schedule({ id: 'future', timeMs: 300, message: [0x90, 64, 100] });
  scheduler.start();

  assert.equal(sent.length, 0);
  timer.advance(150);
  assert.equal(sent.length, 0);
  timer.advance(60);
  assert.equal(sent.length, 1);
});

test('cancel removes a scheduled event', () => {
  const timer = createTestTimer();
  const sent: number[] = [];
  const scheduler = createMidiEventScheduler({
    send: () => {
      sent.push(1);
    },
    now: timer.now,
    lookaheadMs: 100,
    setIntervalFn: timer.setIntervalFn,
    clearIntervalFn: timer.clearIntervalFn,
  });

  scheduler.schedule({ id: 'e1', timeMs: 50, message: [0x90, 60, 100] });
  scheduler.cancel('e1');
  scheduler.start();

  assert.equal(sent.length, 0);
  assert.equal(scheduler.getState().scheduledCount, 0);
});

test('clear removes all events', () => {
  const timer = createTestTimer();
  const scheduler = createMidiEventScheduler({
    send: () => {},
    now: timer.now,
    setIntervalFn: timer.setIntervalFn,
    clearIntervalFn: timer.clearIntervalFn,
  });

  scheduler.schedule({ id: 'e1', timeMs: 100, message: [0x90, 60, 100] });
  scheduler.schedule({ id: 'e2', timeMs: 200, message: [0x90, 62, 100] });
  scheduler.clear();

  assert.equal(scheduler.getState().scheduledCount, 0);
});

test('stop prevents processing until started again', () => {
  const timer = createTestTimer();
  const sent: number[] = [];
  const scheduler = createMidiEventScheduler({
    send: () => {
      sent.push(1);
    },
    now: timer.now,
    lookaheadMs: 100,
    setIntervalFn: timer.setIntervalFn,
    clearIntervalFn: timer.clearIntervalFn,
  });

  scheduler.start();
  scheduler.stop();
  scheduler.schedule({ id: 'e1', timeMs: 50, message: [0x90, 60, 100] });
  timer.advance(1000);

  assert.equal(sent.length, 0);

  scheduler.start();
  assert.equal(sent.length, 1);
});

test('events are sent in time order', () => {
  const timer = createTestTimer();
  const sentIds: string[] = [];
  const scheduler = createMidiEventScheduler({
    send: (_message, timestampMs) => {
      sentIds.push(String(timestampMs));
    },
    now: timer.now,
    lookaheadMs: 1000,
    setIntervalFn: timer.setIntervalFn,
    clearIntervalFn: timer.clearIntervalFn,
  });

  scheduler.schedule({ id: 'later', timeMs: 300, message: [0x90, 67, 100] });
  scheduler.schedule({ id: 'first', timeMs: 100, message: [0x90, 60, 100] });
  scheduler.schedule({ id: 'middle', timeMs: 200, message: [0x90, 64, 100] });
  scheduler.start();

  assert.deepEqual(sentIds, ['100', '200', '300']);
});

test('stop clears interval when timer id is 0', () => {
  let clearedWith: ReturnType<typeof setInterval> | null = null;
  const scheduler = createMidiEventScheduler({
    send: () => {},
    now: () => 0,
    setIntervalFn: () => 0 as unknown as ReturnType<typeof setInterval>,
    clearIntervalFn: (id) => {
      clearedWith = id;
    },
  });

  scheduler.start();
  scheduler.stop();

  assert.equal(clearedWith, 0);
});
