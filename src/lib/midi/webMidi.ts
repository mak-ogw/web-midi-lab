import type { MidiDeviceSnapshot, MidiPortInfo } from './types';

const notSupportedMessage = 'Web MIDI is not supported in this browser';
const channel1StatusNibble = 0x00;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

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

export function sendMidiMessage(output: MIDIOutput, data: number[]): void {
  output.send(data);
}

export async function sendTestNote(
  output: MIDIOutput,
  durationMilliseconds = 300,
): Promise<void> {
  const noteOnStatus = 0x90 | channel1StatusNibble;
  const noteOffStatus = 0x80 | channel1StatusNibble;

  sendMidiMessage(output, [noteOnStatus, 60, 100]);
  await wait(durationMilliseconds);
  sendMidiMessage(output, [noteOffStatus, 60, 0]);
}

export { notSupportedMessage };
