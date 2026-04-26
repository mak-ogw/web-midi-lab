import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findOutputById } from '@web-midi-lab/midi-core';
import { createMidiEventScheduler } from '@web-midi-lab/scheduler';
import { createTransportClock } from '@web-midi-lab/transport';
import { useMidiOutputs } from './useMidiOutputs';
import {
  calculateGateMs,
  clampGatePercent,
  clampPulses,
  clampSteps,
  euclidean,
  getStepDurationMs,
  rotatePattern,
} from './euclideanHelpers';

const channel = 1;
const velocity = 100;
const pitchSet = [60, 64, 67];
const scheduleOffsetMs = 5;

const divisionOptions = [1, 2, 4, 8, 16];

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

  const nextStepRef = useRef(0);
  const nextStepBeatRef = useRef(0);
  const eventCounterRef = useRef(0);

  const pattern = useMemo(() => {
    const base = euclidean(steps, pulses);
    return rotatePattern(base, offset);
  }, [offset, pulses, steps]);

  const sendFixedPitchSetNoteOff = useCallback(() => {
    if (!midiAccess || !selectedOutputId) {
      return;
    }

    const output = findOutputById(midiAccess, selectedOutputId);
    if (!output) {
      return;
    }

    for (const note of pitchSet) {
      output.send([0x80 | (channel - 1), note, 0]);
    }
  }, [midiAccess, selectedOutputId]);

  const stopSequencer = useCallback(() => {
    setIsRunning(false);
    transport.stop();
    scheduler.clear();
    sendFixedPitchSetNoteOff();
    setCurrentStep(null);
  }, [scheduler, sendFixedPitchSetNoteOff, transport]);

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

          for (const note of pitchSet) {
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
  }, [division, gatePercent, isRunning, midiAccess, pattern, scheduler, selectedOutputId, transport]);

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

      <p>Fixed pitch set: [{pitchSet.join(', ')}]</p>
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
