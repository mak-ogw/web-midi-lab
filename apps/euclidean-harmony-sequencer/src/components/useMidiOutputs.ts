import { useCallback, useEffect, useState } from 'react';
import { getMidiDeviceSnapshot, requestWebMidiAccess } from '@web-midi-lab/midi-core';
import type { MidiDeviceSnapshot } from '@web-midi-lab/midi-core';

type MidiState = {
  loading: boolean;
  error: string | null;
  devices: MidiDeviceSnapshot;
};

const emptyDevices: MidiDeviceSnapshot = {
  inputs: [],
  outputs: [],
};

export function useMidiOutputs() {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [selectedOutputId, setSelectedOutputId] = useState('');
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
      setSelectedOutputId((current) => {
        if (devices.outputs.some((output) => output.id === current)) {
          return current;
        }

        return devices.outputs[0]?.id ?? '';
      });
      setMidiState({ loading: false, error: null, devices });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get MIDI access';
      setMidiAccess(null);
      setSelectedOutputId('');
      setMidiState({ loading: false, error: message, devices: emptyDevices });
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  return {
    midiAccess,
    midiState,
    selectedOutputId,
    setSelectedOutputId,
    loadDevices,
  };
}
