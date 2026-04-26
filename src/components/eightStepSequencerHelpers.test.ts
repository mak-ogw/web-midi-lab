import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateGateMs,
  clampStepParameter,
  createDefaultSteps,
  createStepNoteEvents,
  stepCount,
} from './eightStepSequencerHelpers.js';

test('createDefaultSteps returns 8 steps with alternating enabled state', () => {
  const steps = createDefaultSteps();

  assert.equal(steps.length, stepCount);
  assert.equal(steps[0].enabled, true);
  assert.equal(steps[1].enabled, false);
  assert.equal(steps[0].pitch, 60);
  assert.equal(steps[0].velocity, 100);
  assert.equal(steps[0].gate, 50);
  assert.equal(steps[0].channel, 1);
});

test('clampStepParameter keeps step values in allowed ranges', () => {
  assert.equal(clampStepParameter('pitch', 300), 127);
  assert.equal(clampStepParameter('pitch', -4), 0);
  assert.equal(clampStepParameter('velocity', 0), 1);
  assert.equal(clampStepParameter('gate', 150), 100);
  assert.equal(clampStepParameter('channel', 40), 16);
});

test('calculateGateMs uses gate percentage with clamping', () => {
  assert.equal(calculateGateMs(100, 50), 50);
  assert.equal(calculateGateMs(100, 250), 100);
  assert.equal(calculateGateMs(100, -10), 1);
});

test('createStepNoteEvents creates channel-aware note on/off messages', () => {
  const events = createStepNoteEvents({
    enabled: true,
    pitch: 64,
    velocity: 110,
    gate: 50,
    channel: 3,
  });

  assert.deepEqual(events.noteOn, [0x92, 64, 110]);
  assert.deepEqual(events.noteOff, [0x82, 64, 0]);
});
