import { useCallback, useEffect, useState } from 'react';
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

const emptyDevices: MidiDeviceSnapshot = {
  inputs: [],
  outputs: [],
};

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
      setMidiState({ loading: false, error: null, devices });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get MIDI access';
      setMidiState({ loading: false, error: message, devices: emptyDevices });
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

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
        </>
      )}
    </section>
  );
}
