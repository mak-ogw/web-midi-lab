import { useCallback, useEffect, useRef, useState } from 'react';
import { createNoteOffMessage, createNoteOnMessage, findOutputById, notSupportedMessage } from '@web-midi-lab/midi-core';
import { createMidiEventScheduler } from '@web-midi-lab/scheduler';
import TransportPanel from './TransportPanel';
import { useMidiOutputs } from './useMidiOutputs';

type SendStatus = {
  tone: 'success' | 'error';
  message: string;
};

export default function TransportSchedulerDebug() {
  const { midiAccess, midiState, selectedOutputId, setSelectedOutputId, loadDevices } = useMidiOutputs();

  const [sendStatus, setSendStatus] = useState<SendStatus | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const selectedOutputIdRef = useRef('');
  const schedulerRef = useRef(
    createMidiEventScheduler({
      send: (message, timestampMs) => {
        const currentAccess = midiAccessRef.current;
        const currentOutputId = selectedOutputIdRef.current;
        if (!currentAccess || !currentOutputId) {
          return;
        }

        const output = findOutputById(currentAccess, currentOutputId);
        if (!output) {
          return;
        }

        output.send(message, timestampMs);
      },
      lookaheadMs: 120,
      intervalMs: 25,
    }),
  );

  const handleScheduleTestNote = useCallback(() => {
    if (!midiAccess || !selectedOutputId) {
      setSendStatus({
        tone: 'error',
        message: 'Please select a MIDI output device first.',
      });
      return;
    }

    const output = findOutputById(midiAccess, selectedOutputId);
    if (!output) {
      setSendStatus({
        tone: 'error',
        message: 'The selected MIDI output is no longer available. Please refresh devices.',
      });
      return;
    }

    const startTime = performance.now();
    const noteOnTime = startTime + 500;
    const noteOffTime = startTime + 800;
    const eventPrefix = `debug-${Date.now()}`;

    schedulerRef.current.schedule({
      id: `${eventPrefix}-on`,
      timeMs: noteOnTime,
      message: createNoteOnMessage(),
    });

    schedulerRef.current.schedule({
      id: `${eventPrefix}-off`,
      timeMs: noteOffTime,
      message: createNoteOffMessage(),
    });

    setSendStatus({
      tone: 'success',
      message: `Scheduled test note on ${output.name ?? 'selected output'} in ~500ms.`,
    });
  }, [midiAccess, selectedOutputId]);

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
    <>
      <section className="midi-panel">
        <div className="midi-panel-header">
          <h2>Transport / Scheduler Debug</h2>
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
            <label htmlFor="transport-output-select">Output Device</label>
            <select
              id="transport-output-select"
              value={selectedOutputId}
              onChange={(event) => {
                setSelectedOutputId(event.target.value);
                setSendStatus(null);
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
            <button type="button" onClick={handleScheduleTestNote} disabled={midiState.devices.outputs.length === 0}>
              Schedule Test Note
            </button>
          </div>
        )}

        {sendStatus && <p className={sendStatus.tone === 'error' ? 'error-message' : 'success-message'}>{sendStatus.message}</p>}
      </section>

      <TransportPanel />
    </>
  );
}
