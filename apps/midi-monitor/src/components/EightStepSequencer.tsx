import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findOutputById } from '@web-midi-lab/midi-core';
import type { MidiEventScheduler } from '@web-midi-lab/scheduler';
import { createTransportClock } from '@web-midi-lab/transport';
import type { MidiPortInfo } from '@web-midi-lab/midi-core';
import {
  calculateGateMs,
  clampStepParameter,
  createDefaultSteps,
  createStepNoteEvents,
  getStepDurationMs,
  stepCount,
  stepLengthBeats,
  type SequencerStep,
  type StepParameter,
} from './eightStepSequencerHelpers';

const schedulerOffsetMs = 5;

type Props = {
  midiAccess: MIDIAccess | null;
  outputs: MidiPortInfo[];
  selectedOutputId: string;
  scheduler: MidiEventScheduler;
};

function parseStepParameter(parameter: StepParameter, inputValue: string): number | null {
  if (inputValue.trim() === '') {
    return null;
  }

  const parsed = Number(inputValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampStepParameter(parameter, parsed);
}

export default function EightStepSequencer({ midiAccess, outputs, selectedOutputId, scheduler }: Props) {
  const clock = useMemo(() => createTransportClock({ bpm: 120 }), []);
  const [isRunning, setIsRunning] = useState(false);
  const [bpmInput, setBpmInput] = useState('120');
  const [steps, setSteps] = useState<SequencerStep[]>(() => createDefaultSteps());
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  const nextStepIndexRef = useRef(0);
  const nextStepBeatRef = useRef(0);
  const eventCounterRef = useRef(0);
  const scheduledEventIdsRef = useRef<Set<string>>(new Set());

  const clearSequencerEvents = useCallback(() => {
    scheduledEventIdsRef.current.forEach((eventId) => {
      scheduler.cancel(eventId);
    });
    scheduledEventIdsRef.current.clear();
  }, [scheduler]);

  useEffect(() => {
    return () => {
      clearSequencerEvents();
      clock.stop();
    };
  }, [clearSequencerEvents, clock]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const tick = window.setInterval(() => {
      const state = clock.getState();

      while (state.beatPosition >= nextStepBeatRef.current) {
        const stepIndex = nextStepIndexRef.current;
        const step = steps[stepIndex];

        setCurrentStep(stepIndex);

        if (step.enabled && midiAccess && selectedOutputId) {
          const output = findOutputById(midiAccess, selectedOutputId);
          if (output) {
            const stepDurationMs = getStepDurationMs(state.bpm);
            const gateMs = calculateGateMs(stepDurationMs, step.gate);
            const noteOnTime = performance.now() + schedulerOffsetMs;
            const eventIdBase = `seq-${eventCounterRef.current++}`;
            const noteOnId = `${eventIdBase}-on`;
            const noteOffId = `${eventIdBase}-off`;
            const { noteOn, noteOff } = createStepNoteEvents(step);

            scheduler.schedule({
              id: noteOnId,
              timeMs: noteOnTime,
              message: noteOn,
            });
            scheduledEventIdsRef.current.add(noteOnId);

            scheduler.schedule({
              id: noteOffId,
              timeMs: noteOnTime + gateMs,
              message: noteOff,
            });
            scheduledEventIdsRef.current.add(noteOffId);
          }
        }

        nextStepIndexRef.current = (stepIndex + 1) % stepCount;
        nextStepBeatRef.current += stepLengthBeats;
      }
    }, 25);

    return () => {
      window.clearInterval(tick);
    };
  }, [clock, isRunning, midiAccess, selectedOutputId, scheduler, steps]);

  const hasSelectedOutput = outputs.some((output) => output.id === selectedOutputId);

  return (
    <section className="midi-panel">
      <h3>8-Step Sequencer</h3>
      <div className="midi-log-controls-row">
        <label htmlFor="sequencer-bpm-input">BPM</label>
        <input
          id="sequencer-bpm-input"
          type="number"
          min={1}
          value={bpmInput}
          onChange={(event) => {
            const nextValue = event.target.value;
            setBpmInput(nextValue);

            const parsed = Number(nextValue);
            if (Number.isFinite(parsed) && parsed > 0) {
              clock.setBpm(parsed);
            }
          }}
          onBlur={() => {
            const parsed = Number(bpmInput);
            if (Number.isFinite(parsed) && parsed > 0) {
              const normalized = Math.max(1, parsed);
              setBpmInput(String(normalized));
              clock.setBpm(normalized);
              return;
            }

            const fallback = clock.getState().bpm;
            setBpmInput(String(fallback));
          }}
        />
      </div>

      <div className="midi-log-controls-row">
        <button
          type="button"
          onClick={() => {
            clearSequencerEvents();
            clock.reset();
            nextStepBeatRef.current = 0;
            nextStepIndexRef.current = 0;
            setCurrentStep(0);
            setIsRunning(true);
            clock.start();
          }}
          disabled={isRunning || !hasSelectedOutput}
        >
          Start
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            clock.stop();
            clearSequencerEvents();
          }}
          disabled={!isRunning}
        >
          Stop
        </button>
        <p>Current Step: {currentStep === null ? '-' : currentStep + 1}</p>
      </div>

      {!hasSelectedOutput && <p className="error-message">Select a MIDI output device to run the sequencer.</p>}

      <div className="sequencer-step-grid" role="group" aria-label="8-step sequencer pattern">
        {steps.map((step, index) => {
          const isCurrent = currentStep === index;

          const updateStep = (updater: (current: SequencerStep) => SequencerStep) => {
            setSteps((current) => current.map((value, valueIndex) => (valueIndex === index ? updater(value) : value)));
          };

          return (
            <fieldset key={index} className={`sequencer-step-card ${isCurrent ? 'is-current' : ''}`}>
              <legend>Step {index + 1}</legend>

              <label className="sequencer-step-field sequencer-step-toggle">
                <input
                  type="checkbox"
                  checked={step.enabled}
                  onChange={(event) => {
                    updateStep((current) => ({ ...current, enabled: event.target.checked }));
                  }}
                />
                enabled
              </label>

              <label className="sequencer-step-field">
                pitch
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={step.pitch}
                  onChange={(event) => {
                    const nextValue = parseStepParameter('pitch', event.target.value);
                    if (nextValue === null) {
                      return;
                    }

                    updateStep((current) => ({ ...current, pitch: nextValue }));
                  }}
                />
              </label>

              <label className="sequencer-step-field">
                velocity
                <input
                  type="number"
                  min={1}
                  max={127}
                  value={step.velocity}
                  onChange={(event) => {
                    const nextValue = parseStepParameter('velocity', event.target.value);
                    if (nextValue === null) {
                      return;
                    }

                    updateStep((current) => ({ ...current, velocity: nextValue }));
                  }}
                />
              </label>

              <label className="sequencer-step-field">
                gate %
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={step.gate}
                  onChange={(event) => {
                    const nextValue = parseStepParameter('gate', event.target.value);
                    if (nextValue === null) {
                      return;
                    }

                    updateStep((current) => ({ ...current, gate: nextValue }));
                  }}
                />
              </label>

              <label className="sequencer-step-field">
                channel
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={step.channel}
                  onChange={(event) => {
                    const nextValue = parseStepParameter('channel', event.target.value);
                    if (nextValue === null) {
                      return;
                    }

                    updateStep((current) => ({ ...current, channel: nextValue }));
                  }}
                />
              </label>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
