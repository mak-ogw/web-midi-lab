import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyHarmonyFromUiValueChange,
  applyPitch,
  applyVoicing,
  calculateGateMs,
  createHarmonyState,
  degreesToPitchSet,
  euclidean,
  getActivePitchSet,
  getHarmonyPlaybackPitchSet,
  getStepDurationMs,
  mutateHarmonyState,
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

test('harmony +1 targets highest note first, then descends', () => {
  let state = createHarmonyState([60, 64, 67]);
  state = mutateHarmonyState(state, 1, 'major');
  assert.deepEqual(state.pitchSet, [60, 64, 69]);
  state = mutateHarmonyState(state, 1, 'major');
  assert.deepEqual(state.pitchSet, [60, 65, 69]);
  state = mutateHarmonyState(state, 1, 'major');
  assert.deepEqual(state.pitchSet, [62, 65, 69]);
});

test('harmony -1 targets lowest note first, then ascends', () => {
  let state = createHarmonyState([60, 64, 67]);
  state = mutateHarmonyState(state, -1, 'major');
  assert.deepEqual(state.pitchSet, [59, 64, 67]);
  state = mutateHarmonyState(state, -1, 'major');
  assert.deepEqual(state.pitchSet, [59, 62, 67]);
  state = mutateHarmonyState(state, -1, 'major');
  assert.deepEqual(state.pitchSet, [59, 62, 65]);
});

test('harmony mutation changes only one note per step and remains scale-constrained', () => {
  const before = createHarmonyState([60, 64, 67]);
  const after = mutateHarmonyState(before, 1, 'major');

  const changed = after.pitchSet.filter((note, index) => note !== before.pitchSet[index]);
  assert.equal(changed.length, 1);
  const changedNote = changed[0];
  assert.ok(scaleTables.major.some((pitchClass) => pitchClass === (((changedNote % 12) + 12) % 12)));
});

test('harmony mutation rotates target index', () => {
  let state = createHarmonyState([60, 64, 67]);
  state = mutateHarmonyState(state, 1, 'major');
  assert.equal(state.nextTargetIndex, 1);
  state = mutateHarmonyState(state, 1, 'major');
  assert.equal(state.nextTargetIndex, 2);
  state = mutateHarmonyState(state, 1, 'major');
  assert.equal(state.nextTargetIndex, 0);
});

test('harmony is processed after pitch', () => {
  const pitched = applyPitch([60, 64, 67], 1, 'major');
  const harmonized = mutateHarmonyState(createHarmonyState(pitched), 1, 'major');
  assert.deepEqual(harmonized.pitchSet, [62, 65, 71]);
});

test('repeated harmony changes continue from current transformed pitch set', () => {
  let state = createHarmonyState([60, 64, 67]);
  state = mutateHarmonyState(state, 1, 'major');
  state = mutateHarmonyState(state, 1, 'major');
  state = mutateHarmonyState(state, -1, 'major');
  state = mutateHarmonyState(state, 1, 'major');
  assert.deepEqual(state.pitchSet, [60, 65, 69]);
});

test('harmony mutation is driven by UI value changes only', () => {
  const state = createHarmonyState([60, 64, 67]);
  const unchanged = applyHarmonyFromUiValueChange(state, 0, 0, 'major');
  assert.deepEqual(unchanged, state);

  const changed = applyHarmonyFromUiValueChange(state, 0, 1, 'major');
  assert.deepEqual(changed.pitchSet, [60, 64, 69]);
  assert.equal(changed.nextTargetIndex, 1);
});

test('reading playback notes does not advance harmony state', () => {
  const state = createHarmonyState([60, 64, 67]);
  const firstRead = getHarmonyPlaybackPitchSet(state);
  const secondRead = getHarmonyPlaybackPitchSet(state);

  assert.deepEqual(firstRead, [60, 64, 67]);
  assert.deepEqual(secondRead, [60, 64, 67]);
  assert.equal(state.nextTargetIndex, 0);
});

test('positive voicing repeatedly raises the lowest note by octaves', () => {
  assert.deepEqual(applyVoicing([60, 64, 67], 1), [64, 67, 72]);
  assert.deepEqual(applyVoicing([60, 64, 67], 2), [67, 72, 76]);
});

test('negative voicing repeatedly lowers the highest note by octaves', () => {
  assert.deepEqual(applyVoicing([60, 64, 67], -1), [55, 60, 64]);
  assert.deepEqual(applyVoicing([60, 64, 67], -2), [52, 55, 60]);
});

test('voicing preserves pitch classes', () => {
  const source = [60, 64, 67];
  const voiced = applyVoicing(source, 3);

  assert.deepEqual(
    voiced.map((note) => ((note % 12) + 12) % 12).sort((a, b) => a - b),
    source.map((note) => note % 12).sort((a, b) => a - b),
  );
});

test('voicing output is always sorted ascending', () => {
  assert.deepEqual(applyVoicing([67, 60, 64], 1), [64, 67, 72]);
  assert.deepEqual(applyVoicing([67, 60, 64], -2), [52, 55, 60]);
});

test('pipeline order is pitch then harmony then voicing', () => {
  const pitched = applyPitch([60, 64, 67], 1, 'major');
  const harmonized = mutateHarmonyState(createHarmonyState(pitched), 1, 'major');
  const voiced = applyVoicing(harmonized.pitchSet, 1);
  assert.deepEqual(voiced, [65, 71, 74]);
});

test('active cycle switching updates immediately by index', () => {
  const cycles = [
    [60, 64, 67],
    [62, 65, 69],
    [59, 62, 67],
  ];

  assert.deepEqual(getActivePitchSet(cycles, 0), [60, 64, 67]);
  assert.deepEqual(getActivePitchSet(cycles, 2), [59, 62, 67]);
});


test('scale-relative degrees [1,3,5] map by selected scale', () => {
  assert.deepEqual(degreesToPitchSet([1, 3, 5], 'major', 60, 60), [60, 64, 67]);
  assert.deepEqual(degreesToPitchSet([1, 3, 5], 'natural_minor', 60, 60), [60, 63, 67]);
  assert.deepEqual(degreesToPitchSet([1, 3, 5], 'pentatonic', 60, 60), [60, 64, 69]);
});

test('cycle pitch set recalculates when scale changes', () => {
  const degrees = [1, 3, 5];
  assert.notDeepEqual(degreesToPitchSet(degrees, 'major', 60, 60), degreesToPitchSet(degrees, 'natural_minor', 60, 60));
});

test('pipeline keeps pitch, harmony, voicing after resolving cycle degrees', () => {
  const base = degreesToPitchSet([1, 3, 5], 'major', 60, 60);
  const pitched = applyPitch(base, 1, 'major');
  const harmonized = mutateHarmonyState(createHarmonyState(pitched), 1, 'major');
  const voiced = applyVoicing(harmonized.pitchSet, 1);
  assert.deepEqual(voiced, [65, 71, 74]);
});
