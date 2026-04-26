import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findOutputById } from '@web-midi-lab/midi-core';
import { createMidiEventScheduler } from '@web-midi-lab/scheduler';
import { createTransportClock } from '@web-midi-lab/transport';
import { useMidiOutputs } from './useMidiOutputs';
import {
  applyHarmonyFromUiValueChange,
  applyPitch,
  applyVoicing,
  calculateGateMs,
  clampGatePercent,
  clampPulses,
  clampSteps,
  createHarmonyState,
  euclidean,
  getActivePitchSet,
  getHarmonyPlaybackPitchSet,
  getStepDurationMs,
  rotatePattern,
  scaleTables,
  type HarmonyState,
  type ScaleName,
} from './euclideanHelpers';

const channel = 1;
const velocity = 100;
const scheduleOffsetMs = 5;
const minMidiNote = 0;
const maxMidiNote = 127;

const divisionOptions = [1, 2, 4, 8, 16];
const cyclePresets = {
  triads: [
    [60, 64, 67],
    [62, 65, 69],
    [59, 62, 67],
  ],
  sevenths: [
    [60, 64, 67, 71],
    [62, 65, 69, 72],
    [59, 62, 65, 69],
  ],
} as const;
type CyclePresetName = keyof typeof cyclePresets;

export default function EuclideanSequencer() {
  const { midiAccess, midiState, selectedOutputId, setSelectedOutputId, loadDevices } = useMidiOutputs();
  const transport = useMemo(() => createTransportClock({ bpm: 120 }), []);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const selectedOutputIdRef = useRef('');

  useEffect(() => {
    midiAccessRef.current = midiAccess;
    selectedOutputIdRef.current = selectedOutputId;
  }, [midiAccess, selectedOutputId]);

  const scheduler = useMemo(
    () =>
      createMidiEventScheduler({
        send: (message, timeMs) => {
          const currentAccess = midiAccessRef.current;
          const currentOutputId = selectedOutputIdRef.current;

          if (!currentAccess || !currentOutputId) {
            return;
          }

          const output = findOutputById(currentAccess, currentOutputId);
          if (!output) {
            return;
          }

          output.send(message, timeMs);
        },
      }),
    [],
  );

  const [isRunning, setIsRunning] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [steps, setSteps] = useState(8);
  const [pulses, setPulses] = useState(3);
  const [division, setDivision] = useState(4);
  const [offset, setOffset] = useState(0);
  const [gatePercent, setGatePercent] = useState(50);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [scaleName, setScaleName] = useState<ScaleName>('chromatic');
  const [pitch, setPitch] = useState(0);
  const [harmony, setHarmony] = useState(0);
  const [voicing, setVoicing] = useState(0);
  const [cyclePresetName, setCyclePresetName] = useState<CyclePresetName>('triads');
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);

  const nextStepRef = useRef(0);
  const nextStepBeatRef = useRef(0);
  const eventCounterRef = useRef(0);

  const pattern = useMemo(() => {
    const base = euclidean(steps, pulses);
    return rotatePattern(base, offset);
  }, [offset, pulses, steps]);

  const cycles = cyclePresets[cyclePresetName];
  const activePitchSet = useMemo(() => getActivePitchSet(cycles, currentCycleIndex), [currentCycleIndex, cycles]);
  const pitchedSet = useMemo(() => applyPitch(activePitchSet, pitch, scaleName), [activePitchSet, pitch, scaleName]);
  const [harmonyState, setHarmonyState] = useState<HarmonyState>(() => createHarmonyState(pitchedSet));
  const voicedSet = useMemo(() => applyVoicing(getHarmonyPlaybackPitchSet(harmonyState), voicing), [harmonyState, voicing]);

  useEffect(() => {
    setHarmonyState(createHarmonyState(pitchedSet));
  }, [pitchedSet]);

  useEffect(() => {
    setCurrentCycleIndex((current) => Math.min(current, cycles.length - 1));
  }, [cycles.length]);

  const sendAllNotesOff = useCallback(() => {
    if (!midiAccess || !selectedOutputId) {
      return;
    }

    const output = findOutputById(midiAccess, selectedOutputId);
    if (!output) {
      return;
    }

    for (let note = minMidiNote; note <= maxMidiNote; note += 1) {
      output.send([0x80 | (channel - 1), note, 0]);
    }
  }, [midiAccess, selectedOutputId]);

  const stopSequencer = useCallback(() => {
    setIsRunning(false);
    transport.stop();
    scheduler.clear();
    sendAllNotesOff();
    setCurrentStep(null);
  }, [scheduler, sendAllNotesOff, transport]);

  useEffect(() => {
    scheduler.start();

    return () => {
      scheduler.stop();
      transport.stop();
    };
  }, [scheduler, transport]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const tickId = window.setInterval(() => {
      const state = transport.getState();

      while (state.beatPosition >= nextStepBeatRef.current) {
        const stepIndex = nextStepRef.current % pattern.length;
        setCurrentStep(stepIndex);

        if (pattern[stepIndex] && midiAccess && selectedOutputId) {
          const stepDurationMs = getStepDurationMs(state.bpm, division);
          const noteOnTime = performance.now() + scheduleOffsetMs;
          const gateMs = calculateGateMs(stepDurationMs, gatePercent);

          for (const note of voicedSet) {
            const eventBaseId = `euclid-${eventCounterRef.current++}-${note}`;
            scheduler.schedule({
              id: `${eventBaseId}-on`,
              timeMs: noteOnTime,
              message: [0x90 | (channel - 1), note, velocity],
            });
            scheduler.schedule({
              id: `${eventBaseId}-off`,
              timeMs: noteOnTime + gateMs,
              message: [0x80 | (channel - 1), note, 0],
            });
          }
        }

        nextStepRef.current = (stepIndex + 1) % pattern.length;
        nextStepBeatRef.current += 1 / division;
      }
    }, 25);

    return () => {
      window.clearInterval(tickId);
    };
  }, [division, gatePercent, isRunning, midiAccess, pattern, scheduler, selectedOutputId, transport, voicedSet]);

  const hasOutput = midiState.devices.outputs.some((output) => output.id === selectedOutputId);

  return (
    <section className="panel">
      <div className="controls-row">
        <label htmlFor="output-select">MIDI output</label>
        <select
          id="output-select"
          value={selectedOutputId}
          onChange={(event) => setSelectedOutputId(event.target.value)}
          disabled={midiState.loading || isRunning}
        >
          {midiState.devices.outputs.length === 0 && <option value="">No outputs found</option>}
          {midiState.devices.outputs.map((output) => (
            <option key={output.id} value={output.id}>
              {output.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => loadDevices()} disabled={isRunning}>
          Refresh
        </button>
      </div>

      {midiState.error && <p className="error-message">{midiState.error}</p>}

      <div className="controls-row">
        <label htmlFor="bpm-input">BPM</label>
        <input
          id="bpm-input"
          type="number"
          min={1}
          value={bpm}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next) || next < 1) {
              return;
            }
            setBpm(next);
            transport.setBpm(next);
          }}
        />

        <button
          type="button"
          disabled={isRunning || !hasOutput}
          onClick={() => {
            nextStepRef.current = 0;
            nextStepBeatRef.current = 0;
            scheduler.clear();
            transport.reset();
            transport.start();
            setCurrentStep(0);
            setIsRunning(true);
          }}
        >
          Start
        </button>
        <button type="button" disabled={!isRunning} onClick={stopSequencer}>
          Stop
        </button>
      </div>

      <div className="controls-grid">
        <label>
          steps
          <input
            type="number"
            min={1}
            max={32}
            value={steps}
            onChange={(event) => {
              const nextSteps = clampSteps(Number(event.target.value));
              setSteps(nextSteps);
              setPulses((current) => clampPulses(current, nextSteps));
            }}
          />
        </label>

        <label>
          pulses
          <input
            type="number"
            min={0}
            max={steps}
            value={pulses}
            onChange={(event) => {
              setPulses(clampPulses(Number(event.target.value), steps));
            }}
          />
        </label>

        <label>
          division
          <select value={division} onChange={(event) => setDivision(Number(event.target.value))}>
            {divisionOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          offset
          <input type="number" value={offset} onChange={(event) => setOffset(Math.round(Number(event.target.value)))} />
        </label>

        <label>
          scale
          <select value={scaleName} onChange={(event) => setScaleName(event.target.value as ScaleName)}>
            {Object.keys(scaleTables).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          pitch
          <input type="number" value={pitch} onChange={(event) => setPitch(Math.round(Number(event.target.value)))} />
        </label>

        <label>
          cycle preset
          <select value={cyclePresetName} onChange={(event) => setCyclePresetName(event.target.value as CyclePresetName)}>
            {Object.keys(cyclePresets).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          cycle
          <select value={currentCycleIndex} onChange={(event) => setCurrentCycleIndex(Number(event.target.value))}>
            {cycles.map((_, index) => (
              <option key={index} value={index}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>

        <label>
          harmony
          <input
            type="number"
            value={harmony}
            onChange={(event) => {
              const nextHarmony = Math.round(Number(event.target.value));
              if (!Number.isFinite(nextHarmony)) {
                return;
              }

              if (nextHarmony === harmony) {
                return;
              }

              setHarmony(nextHarmony);
              setHarmonyState((current) => applyHarmonyFromUiValueChange(current, harmony, nextHarmony, scaleName));
            }}
          />
        </label>

        <label>
          voicing
          <input type="number" value={voicing} onChange={(event) => setVoicing(Math.round(Number(event.target.value)))} />
        </label>

        <label>
          gate %
          <input
            type="number"
            min={1}
            max={100}
            value={gatePercent}
            onChange={(event) => setGatePercent(clampGatePercent(Number(event.target.value)))}
          />
        </label>
      </div>

      <p>Active cycle pitch set: [{activePitchSet.join(', ')}]</p>
      <p>Pitch + Harmony set: [{harmonyState.pitchSet.join(', ')}]</p>
      <p>Output (Pitch → Harmony → Voicing): [{voicedSet.join(', ')}]</p>
      <p>Current step: {currentStep === null ? '-' : currentStep + 1}</p>

      <div className="pattern-grid" role="group" aria-label="Euclidean pattern">
        {pattern.map((isActive, index) => {
          const classes = ['pattern-step'];
          if (isActive) {
            classes.push('is-active');
          }
          if (currentStep === index) {
            classes.push('is-current');
          }

          return (
            <div key={index} className={classes.join(' ')}>
              {index + 1}
            </div>
          );
        })}
      </div>
    </section>
  );
}
