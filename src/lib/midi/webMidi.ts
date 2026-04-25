import type { MidiDeviceSnapshot, MidiPortInfo } from './types';

const notSupportedMessage = 'Web MIDI is not supported in this browser';

function toPortInfo(port: MIDIPort): MidiPortInfo {
  return {
    id: port.id,
    name: port.name ?? 'Unknown device',
    manufacturer: port.manufacturer ?? '',
    state: port.state,
    connection: port.connection,
  };
}

export function isWebMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

export async function requestWebMidiAccess(): Promise<MIDIAccess> {
  if (!isWebMidiSupported()) {
    throw new Error(notSupportedMessage);
  }

  return navigator.requestMIDIAccess();
}

export function getMidiDeviceSnapshot(access: MIDIAccess): MidiDeviceSnapshot {
  const inputs = Array.from(access.inputs.values()).map(toPortInfo);
  const outputs = Array.from(access.outputs.values()).map(toPortInfo);

  return { inputs, outputs };
}

export { notSupportedMessage };
