export const minSteps = 1;
export const maxSteps = 32;
export const minPulses = 0;
export const minGatePercent = 1;
export const maxGatePercent = 100;

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
