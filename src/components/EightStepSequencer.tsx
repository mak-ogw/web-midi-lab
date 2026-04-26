import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findOutputById } from '../lib/midi/deviceUtils';
import { createNoteOffMessage, createNoteOnMessage } from '../lib/midi/messages';
import type { MidiEventScheduler } from '../lib/scheduler/types';
import { createTransportClock } from '../lib/transport/transportClock';
import type { MidiPortInfo } from '../lib/midi/types';

const stepCount = 8;
const noteNumber = 60;
const noteVelocity = 100;
const stepLengthBeats = 0.25;
const gateRatio = 0.5;
const schedulerOffsetMs = 5;

type Props = {
  midiAccess: MIDIAccess | null;
  outputs: MidiPortInfo[];
  selectedOutputId: string;
  scheduler: MidiEventScheduler;
};

function createInitialSteps(): boolean[] {
  return Array.from({ length: stepCount }, (_, index) => index % 2 === 0);
}

function getStepDurationMs(bpm: number): number {
  return (60000 / bpm) / 4;
}

export default function EightStepSequencer({ midiAccess, outputs, selectedOutputId, scheduler }: Props) {
  const clock = useMemo(() => createTransportClock({ bpm: 120 }), []);
  const [isRunning, setIsRunning] = useState(false);
  const [bpmInput, setBpmInput] = useState('120');
  const [steps, setSteps] = useState<boolean[]>(() => createInitialSteps());
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
        const isStepEnabled = steps[stepIndex];

        setCurrentStep(stepIndex);

        if (isStepEnabled && midiAccess && selectedOutputId) {
          const output = findOutputById(midiAccess, selectedOutputId);
          if (output) {
            const stepDurationMs = getStepDurationMs(state.bpm);
            const gateMs = stepDurationMs * gateRatio;
            const noteOnTime = performance.now() + schedulerOffsetMs;
            const eventIdBase = `seq-${eventCounterRef.current++}`;
            const noteOnId = `${eventIdBase}-on`;
            const noteOffId = `${eventIdBase}-off`;

            scheduler.schedule({
              id: noteOnId,
              timeMs: noteOnTime,
              message: createNoteOnMessage(noteNumber, noteVelocity),
            });
            scheduledEventIdsRef.current.add(noteOnId);

            scheduler.schedule({
              id: noteOffId,
              timeMs: noteOnTime + gateMs,
              message: createNoteOffMessage(noteNumber, 0),
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

      <div className="sequencer-steps" role="group" aria-label="8-step sequencer pattern">
        {steps.map((enabled, index) => (
          <button
            key={index}
            type="button"
            className={`sequencer-step ${enabled ? 'is-enabled' : ''} ${currentStep === index ? 'is-current' : ''}`}
            onClick={() => {
              setSteps((current) =>
                current.map((value, valueIndex) => (valueIndex === index ? !value : value)),
              );
            }}
            aria-pressed={enabled}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
