import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getMidiDeviceSnapshot,
  notSupportedMessage,
  requestWebMidiAccess,
} from '../lib/midi/webMidi';
import type { MidiDeviceSnapshot, MidiPortInfo } from '../lib/midi/types';

type MidiState = {
  loading: boolean;
  error: string | null;
  devices: MidiDeviceSnapshot;
};

type MidiLogItem = {
  id: number;
  timestamp: string;
  type: string;
  channel: string;
  bytes: string;
};

const emptyDevices: MidiDeviceSnapshot = {
  inputs: [],
  outputs: [],
};

const maxLogMessages = 100;

function formatTimestamp(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function toHexByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0');
}

function decodeMidiMessage(data: Uint8Array): { type: string; channel: string } {
  if (data.length === 0) {
    return { type: 'Other', channel: '-' };
  }

  const status = data[0];
  const messageType = status & 0xf0;
  const channel = (status & 0x0f) + 1;

  if (messageType === 0x90) {
    if (data.length > 2 && data[2] === 0) {
      return { type: 'Note Off', channel: String(channel) };
    }

    return { type: 'Note On', channel: String(channel) };
  }

  if (messageType === 0x80) {
    return { type: 'Note Off', channel: String(channel) };
  }

  if (messageType === 0xb0) {
    return { type: 'Control Change', channel: String(channel) };
  }

  if (messageType === 0xc0) {
    return { type: 'Program Change', channel: String(channel) };
  }

  if (messageType === 0xe0) {
    return { type: 'Pitch Bend', channel: String(channel) };
  }

  return { type: 'Other', channel: String(channel) };
}

function DeviceList({ devices }: { devices: MidiPortInfo[] }) {
  if (devices.length === 0) {
    return <p>No devices found</p>;
  }

  return (
    <ul className="midi-device-list">
      {devices.map((device) => (
        <li key={device.id}>
          <p>
            <strong>{device.name}</strong>
          </p>
          <p>Manufacturer: {device.manufacturer || 'Unknown'}</p>
          <p>State: {device.state}</p>
          <p>Connection: {device.connection}</p>
        </li>
      ))}
    </ul>
  );
}

export default function MidiDeviceList() {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [logMessages, setLogMessages] = useState<MidiLogItem[]>([]);
  const nextLogId = useRef(1);
  const [midiState, setMidiState] = useState<MidiState>({
    loading: true,
    error: null,
    devices: emptyDevices,
  });

  const loadDevices = useCallback(async () => {
    setMidiState((current) => ({ ...current, loading: true, error: null }));

    try {
      const access = await requestWebMidiAccess();
      const devices = getMidiDeviceSnapshot(access);

      setMidiAccess(access);
      setSelectedInputId((current) => {
        if (devices.inputs.some((input) => input.id === current)) {
          return current;
        }

        return devices.inputs[0]?.id ?? '';
      });
      setMidiState({ loading: false, error: null, devices });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get MIDI access';
      setMidiAccess(null);
      setSelectedInputId('');
      setMidiState({ loading: false, error: message, devices: emptyDevices });
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (!midiAccess || !selectedInputId) {
      return;
    }

    const input = midiAccess.inputs.get(selectedInputId);
    if (!input) {
      return;
    }

    const onMidiMessage = (event: MIDIMessageEvent) => {
      const data = event.data;
      if (!data) {
        return;
      }

      const { type, channel } = decodeMidiMessage(data);
      const bytes = Array.from(data).map(toHexByte).join(' ');

      setLogMessages((current) => {
        const next: MidiLogItem = {
          id: nextLogId.current++,
          timestamp: formatTimestamp(new Date()),
          type,
          channel,
          bytes,
        };

        return [next, ...current].slice(0, maxLogMessages);
      });
    };

    input.addEventListener('midimessage', onMidiMessage);

    return () => {
      input.removeEventListener('midimessage', onMidiMessage);
    };
  }, [midiAccess, selectedInputId]);

  return (
    <section className="midi-panel">
      <div className="midi-panel-header">
        <h2>Available Devices</h2>
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
        <>
          <h3>MIDI Inputs</h3>
          {midiState.devices.inputs.length === 0 ? (
            <p>No MIDI inputs found</p>
          ) : (
            <DeviceList devices={midiState.devices.inputs} />
          )}

          <h3>MIDI Outputs</h3>
          {midiState.devices.outputs.length === 0 ? (
            <p>No MIDI outputs found</p>
          ) : (
            <DeviceList devices={midiState.devices.outputs} />
          )}

          <div className="midi-log-controls">
            <h3>MIDI Input Log</h3>
            <div className="midi-log-controls-row">
              <label htmlFor="midi-input-select">Input Device</label>
              <select
                id="midi-input-select"
                value={selectedInputId}
                onChange={(event) => {
                  setSelectedInputId(event.target.value);
                }}
                disabled={midiState.devices.inputs.length === 0}
              >
                {midiState.devices.inputs.length === 0 ? (
                  <option value="">No inputs available</option>
                ) : (
                  midiState.devices.inputs.map((input) => (
                    <option key={input.id} value={input.id}>
                      {input.name}
                    </option>
                  ))
                )}
              </select>
              <button type="button" onClick={() => setLogMessages([])}>
                Clear Log
              </button>
            </div>
          </div>

          <div className="midi-log-area" role="log" aria-live="polite">
            {logMessages.length === 0 ? (
              <p>No MIDI messages yet</p>
            ) : (
              <ul className="midi-log-list">
                {logMessages.map((message) => (
                  <li key={message.id}>
                    {message.timestamp} | {message.type} | ch {message.channel} | {message.bytes}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
