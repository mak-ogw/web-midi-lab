export const stepCount = 8;
export const stepLengthBeats = 0.25;

const minPitch = 0;
const maxPitch = 127;
const minVelocity = 1;
const maxVelocity = 127;
const minGate = 1;
const maxGate = 100;
const minChannel = 1;
const maxChannel = 16;

export type StepParameter = 'pitch' | 'velocity' | 'gate' | 'channel';

export type SequencerStep = {
  enabled: boolean;
  pitch: number;
  velocity: number;
  gate: number;
  channel: number;
};

export function clampStepParameter(parameter: StepParameter, value: number): number {
  const integerValue = Math.round(value);

  if (parameter === 'pitch') {
    return Math.min(maxPitch, Math.max(minPitch, integerValue));
  }

  if (parameter === 'velocity') {
    return Math.min(maxVelocity, Math.max(minVelocity, integerValue));
  }

  if (parameter === 'gate') {
    return Math.min(maxGate, Math.max(minGate, integerValue));
  }

  return Math.min(maxChannel, Math.max(minChannel, integerValue));
}

export function createDefaultSteps(): SequencerStep[] {
  return Array.from({ length: stepCount }, (_, index) => ({
    enabled: index % 2 === 0,
    pitch: 60,
    velocity: 100,
    gate: 50,
    channel: 1,
  }));
}

export function getStepDurationMs(bpm: number): number {
  return (60000 / bpm) / 4;
}

export function calculateGateMs(stepDurationMs: number, gate: number): number {
  return stepDurationMs * (clampStepParameter('gate', gate) / 100);
}

export function createStepNoteEvents(step: SequencerStep): { noteOn: number[]; noteOff: number[] } {
  const channelNibble = clampStepParameter('channel', step.channel) - 1;
  const pitch = clampStepParameter('pitch', step.pitch);
  const velocity = clampStepParameter('velocity', step.velocity);

  return {
    noteOn: [0x90 | channelNibble, pitch, velocity],
    noteOff: [0x80 | channelNibble, pitch, 0],
  };
}
