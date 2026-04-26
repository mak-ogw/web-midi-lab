import test from 'node:test';
import assert from 'node:assert/strict';

import { createTransportClock } from './transportClock.js';

function createTestClock(initialNow = 0) {
  let nowMs = initialNow;
  let nextId = 1;
  const callbacks = new Map<number, () => void>();

  return {
    now: () => nowMs,
    setNow: (value: number) => {
      nowMs = value;
    },
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

test('initial state is stopped at beat 0', () => {
  const fakeClock = createTestClock();
  const clock = createTransportClock({
    now: fakeClock.now,
    setIntervalFn: fakeClock.setIntervalFn,
    clearIntervalFn: fakeClock.clearIntervalFn,
  });

  assert.deepEqual(clock.getState(), {
    bpm: 120,
    isRunning: false,
    elapsedMs: 0,
    beatPosition: 0,
  });
});

test('start and stop update running state', () => {
  const fakeClock = createTestClock();
  const clock = createTransportClock({
    now: fakeClock.now,
    setIntervalFn: fakeClock.setIntervalFn,
    clearIntervalFn: fakeClock.clearIntervalFn,
  });

  clock.start();
  assert.equal(clock.getState().isRunning, true);

  fakeClock.advance(250);
  clock.stop();
  assert.equal(clock.getState().isRunning, false);
  assert.equal(clock.getState().elapsedMs, 250);
});

test('reset clears elapsed and beat position', () => {
  const fakeClock = createTestClock();
  const clock = createTransportClock({
    now: fakeClock.now,
    setIntervalFn: fakeClock.setIntervalFn,
    clearIntervalFn: fakeClock.clearIntervalFn,
  });

  clock.start();
  fakeClock.advance(500);
  clock.stop();
  clock.reset();

  assert.equal(clock.getState().elapsedMs, 0);
  assert.equal(clock.getState().beatPosition, 0);
});

test('beat position advances according to BPM', () => {
  const fakeClock = createTestClock();
  const clock = createTransportClock({
    bpm: 120,
    now: fakeClock.now,
    setIntervalFn: fakeClock.setIntervalFn,
    clearIntervalFn: fakeClock.clearIntervalFn,
  });

  clock.start();
  fakeClock.advance(500);

  assert.equal(clock.getState().beatPosition, 1);
});

test('setBpm updates bpm while keeping beat position continuous', () => {
  const fakeClock = createTestClock();
  const clock = createTransportClock({
    bpm: 120,
    now: fakeClock.now,
    setIntervalFn: fakeClock.setIntervalFn,
    clearIntervalFn: fakeClock.clearIntervalFn,
  });

  clock.start();
  fakeClock.advance(500);
  clock.setBpm(60);

  const stateAfterBpmChange = clock.getState();
  assert.equal(stateAfterBpmChange.bpm, 60);
  assert.equal(stateAfterBpmChange.elapsedMs, 500);
  assert.equal(stateAfterBpmChange.beatPosition, 1);

  fakeClock.advance(500);
  const stateAfterAdvance = clock.getState();
  assert.equal(stateAfterAdvance.beatPosition, 1.5);
});

test('subscribe and unsubscribe receive updates', () => {
  const fakeClock = createTestClock();
  const clock = createTransportClock({
    now: fakeClock.now,
    setIntervalFn: fakeClock.setIntervalFn,
    clearIntervalFn: fakeClock.clearIntervalFn,
  });

  const updates: number[] = [];
  const unsubscribe = clock.subscribe((state) => {
    updates.push(state.elapsedMs);
  });

  clock.start();
  fakeClock.advance(200);
  clock.stop();

  const lengthBeforeUnsubscribe = updates.length;
  unsubscribe();
  fakeClock.advance(200);

  assert.ok(lengthBeforeUnsubscribe >= 2);
  assert.equal(updates.length, lengthBeforeUnsubscribe);
});
