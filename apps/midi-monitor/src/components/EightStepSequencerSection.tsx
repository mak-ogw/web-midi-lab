import { useEffect, useRef } from 'react';
import { notSupportedMessage } from '@web-midi-lab/midi-core';
import { createMidiEventScheduler } from '@web-midi-lab/scheduler';
import EightStepSequencer from './EightStepSequencer';
import { useMidiOutputs } from './useMidiOutputs';

export default function EightStepSequencerSection() {
  const { midiAccess, midiState, selectedOutputId, setSelectedOutputId, loadDevices } = useMidiOutputs();

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const selectedOutputIdRef = useRef('');
  const schedulerRef = useRef(
    createMidiEventScheduler({
      send: (message, timestampMs) => {
        const access = midiAccessRef.current;
        const outputId = selectedOutputIdRef.current;
        if (!access || !outputId) {
          return;
        }

        const output = Array.from(access.outputs.values()).find((value) => value.id === outputId);
        if (!output) {
          return;
        }

        output.send(message, timestampMs);
      },
      lookaheadMs: 120,
      intervalMs: 25,
    }),
  );

  useEffect(() => {
    midiAccessRef.current = midiAccess;
  }, [midiAccess]);

  useEffect(() => {
    selectedOutputIdRef.current = selectedOutputId;
  }, [selectedOutputId]);

  useEffect(() => {
    const scheduler = schedulerRef.current;
    scheduler.start();

    return () => {
      scheduler.stop();
      scheduler.clear();
    };
  }, []);

  return (
    <section className="midi-panel">
      <div className="midi-panel-header">
        <h2>8-Step Sequencer</h2>
        <button type="button" onClick={loadDevices} disabled={midiState.loading}>
          Refresh
        </button>
      </div>

      {midiState.loading && <p>Loading MIDI devices...</p>}

      {midiState.error && (
        <p className="error-message">
          {midiState.error === notSupportedMessage
            ? notSupportedMessage
            : `Failed to load MIDI devices: ${midiState.error}`}
        </p>
      )}

      {!midiState.loading && !midiState.error && (
        <div className="midi-log-controls-row">
          <label htmlFor="sequencer-output-select">Output Device</label>
          <select
            id="sequencer-output-select"
            value={selectedOutputId}
            onChange={(event) => {
              setSelectedOutputId(event.target.value);
            }}
            disabled={midiState.devices.outputs.length === 0}
          >
            {midiState.devices.outputs.length === 0 ? (
              <option value="">No outputs available</option>
            ) : (
              midiState.devices.outputs.map((output) => (
                <option key={output.id} value={output.id}>
                  {output.name}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      <EightStepSequencer
        midiAccess={midiAccess}
        outputs={midiState.devices.outputs}
        selectedOutputId={selectedOutputId}
        scheduler={schedulerRef.current}
      />
    </section>
  );
}
