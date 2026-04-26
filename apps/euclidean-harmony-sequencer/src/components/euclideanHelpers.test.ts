import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyPitch,
  calculateGateMs,
  euclidean,
  getStepDurationMs,
  nextNoteInScaleDown,
  nextNoteInScaleUp,
  rotatePattern,
  scaleTables,
  shiftNoteInScale,
} from './euclideanHelpers.js';

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

test('scale tables match the spec', () => {
  assert.deepEqual(scaleTables.chromatic, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(scaleTables.major, [0, 2, 4, 5, 7, 9, 11]);
  assert.deepEqual(scaleTables.natural_minor, [0, 2, 3, 5, 7, 8, 10]);
  assert.deepEqual(scaleTables.pentatonic, [0, 2, 4, 7, 9]);
});

test('next note in scale upward returns next allowed note', () => {
  assert.equal(nextNoteInScaleUp(60, scaleTables.major), 62);
});

test('next note in scale downward returns previous allowed note', () => {
  assert.equal(nextNoteInScaleDown(60, scaleTables.major), 59);
});

test('pitch shift supports multiple scale steps in both directions', () => {
  assert.equal(shiftNoteInScale(60, 4, scaleTables.major), 67);
  assert.equal(shiftNoteInScale(67, -3, scaleTables.major), 62);
});

test('pitch shift wraps octaves within the selected scale', () => {
  assert.equal(shiftNoteInScale(71, 1, scaleTables.major), 72);
  assert.equal(shiftNoteInScale(72, -1, scaleTables.major), 71);
});

test('applyPitch shifts the full pitch set together', () => {
  assert.deepEqual(applyPitch([60, 64, 67], 2, 'major'), [64, 67, 71]);
  assert.deepEqual(applyPitch([60, 64, 67], -1, 'major'), [59, 62, 65]);
});
