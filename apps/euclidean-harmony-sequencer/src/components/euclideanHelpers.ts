export const minSteps = 1;
export const maxSteps = 32;
export const minPulses = 0;
export const minGatePercent = 1;
export const maxGatePercent = 100;

export const scaleTables = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
} as const;

export type ScaleName = keyof typeof scaleTables;
export type HarmonyDirection = -1 | 1;

export type HarmonyState = {
  pitchSet: number[];
  nextTargetIndex: number;
};

const minMidiNote = 0;
const maxMidiNote = 127;

export function clampSteps(value: number): number {
  const rounded = Math.round(value);
  return Math.min(maxSteps, Math.max(minSteps, rounded));
}

export function clampPulses(value: number, steps: number): number {
  const rounded = Math.round(value);
  return Math.min(clampSteps(steps), Math.max(minPulses, rounded));
}

export function clampGatePercent(value: number): number {
  const rounded = Math.round(value);
  return Math.min(maxGatePercent, Math.max(minGatePercent, rounded));
}

export function getStepDurationMs(bpm: number, division: number): number {
  return 60000 / Math.max(1, bpm) / Math.max(1, division);
}

export function calculateGateMs(stepDurationMs: number, gatePercent: number): number {
  return stepDurationMs * (clampGatePercent(gatePercent) / 100);
}

export function euclidean(stepsInput: number, pulsesInput: number): boolean[] {
  const steps = clampSteps(stepsInput);
  const pulses = clampPulses(pulsesInput, steps);
  const pattern = new Array<boolean>(steps).fill(false);

  if (pulses === 0) {
    return pattern;
  }

  for (let i = 0; i < steps; i += 1) {
    pattern[i] = Math.floor((i * pulses) / steps) !== Math.floor(((i - 1) * pulses) / steps);
  }

  return pattern;
}

export function rotatePattern(pattern: boolean[], offsetInput: number): boolean[] {
  if (pattern.length === 0) {
    return [];
  }

  const length = pattern.length;
  const offset = ((Math.round(offsetInput) % length) + length) % length;

  if (offset === 0) {
    return [...pattern];
  }

  return [...pattern.slice(-offset), ...pattern.slice(0, -offset)];
}

function hasScalePitchClass(note: number, scale: readonly number[]): boolean {
  const pitchClass = ((note % 12) + 12) % 12;
  return scale.includes(pitchClass);
}

function clampMidiNote(note: number): number {
  return Math.max(minMidiNote, Math.min(maxMidiNote, note));
}

export function nextNoteInScaleUp(note: number, scale: readonly number[]): number {
  for (let candidate = note + 1; candidate <= maxMidiNote; candidate += 1) {
    if (hasScalePitchClass(candidate, scale)) {
      return candidate;
    }
  }

  return maxMidiNote;
}

export function nextNoteInScaleDown(note: number, scale: readonly number[]): number {
  for (let candidate = note - 1; candidate >= minMidiNote; candidate -= 1) {
    if (hasScalePitchClass(candidate, scale)) {
      return candidate;
    }
  }

  return minMidiNote;
}

export function shiftNoteInScale(note: number, pitchSteps: number, scale: readonly number[]): number {
  let shifted = clampMidiNote(Math.round(note));
  const totalSteps = Math.round(pitchSteps);

  if (totalSteps === 0) {
    return shifted;
  }

  const move = totalSteps > 0 ? nextNoteInScaleUp : nextNoteInScaleDown;

  for (let step = 0; step < Math.abs(totalSteps); step += 1) {
    shifted = move(shifted, scale);
  }

  return shifted;
}

export function applyPitch(pitchSet: readonly number[], pitchSteps: number, scaleName: ScaleName): number[] {
  const scale = scaleTables[scaleName];
  return pitchSet.map((note) => shiftNoteInScale(note, pitchSteps, scale));
}

export function createHarmonyState(pitchSet: readonly number[]): HarmonyState {
  return {
    pitchSet: [...pitchSet],
    nextTargetIndex: 0,
  };
}

export function mutateHarmonyState(state: HarmonyState, direction: HarmonyDirection, scaleName: ScaleName): HarmonyState {
  if (state.pitchSet.length === 0) {
    return state;
  }

  const index = state.nextTargetIndex % state.pitchSet.length;
  const notes = [...state.pitchSet];
  notes[index] = shiftNoteInScale(notes[index], direction, scaleTables[scaleName]);

  return {
    pitchSet: notes,
    nextTargetIndex: (index + 1) % notes.length,
  };
}

export function applyHarmonyFromUiValueChange(
  state: HarmonyState,
  previousValue: number,
  nextValue: number,
  scaleName: ScaleName,
): HarmonyState {
  if (!Number.isFinite(nextValue) || Math.round(nextValue) === Math.round(previousValue)) {
    return state;
  }

  const direction: HarmonyDirection = nextValue > previousValue ? 1 : -1;
  return mutateHarmonyState(state, direction, scaleName);
}

export function getHarmonyPlaybackPitchSet(state: HarmonyState): number[] {
  return [...state.pitchSet];
}
