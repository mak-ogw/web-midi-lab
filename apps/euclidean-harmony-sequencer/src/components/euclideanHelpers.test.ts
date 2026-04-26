import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateGateMs, euclidean, getStepDurationMs, rotatePattern } from './euclideanHelpers.js';

test('euclidean generates expected pattern for 8 steps, 3 pulses', () => {
  assert.deepEqual(euclidean(8, 3), [true, false, false, true, false, false, true, false]);
});

test('euclidean clamps pulses that exceed steps', () => {
  assert.deepEqual(euclidean(4, 8), [true, true, true, true]);
});

test('rotatePattern applies positive and negative offsets', () => {
  const pattern = [true, false, false, true];
  assert.deepEqual(rotatePattern(pattern, 1), [true, true, false, false]);
  assert.deepEqual(rotatePattern(pattern, -1), [false, false, true, true]);
});

test('calculateGateMs uses gate percentage and step duration helper', () => {
  const stepDurationMs = getStepDurationMs(120, 4);
  assert.equal(stepDurationMs, 125);
  assert.equal(calculateGateMs(stepDurationMs, 50), 62.5);
});
