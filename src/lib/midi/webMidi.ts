import { findInputById, toMidiInputInfoList, toMidiOutputInfoList } from './deviceUtils.js';
import { createNoteOffMessage, createNoteOnMessage } from './messages.js';
import type { MidiDeviceSnapshot, MidiMessageListener } from './types.js';

const notSupportedMessage = 'Web MIDI is not supported in this browser';

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
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
  const inputs = toMidiInputInfoList(access.inputs);
  const outputs = toMidiOutputInfoList(access.outputs);

  return { inputs, outputs };
}

export function sendMidiMessage(output: MIDIOutput, data: number[]): void {
  output.send(data);
}

export async function sendTestNote(output: MIDIOutput, durationMilliseconds = 300): Promise<void> {
  sendMidiMessage(output, createNoteOnMessage());
  await wait(durationMilliseconds);
  sendMidiMessage(output, createNoteOffMessage());
}

export function subscribeToInputMessages(
  access: MIDIAccess,
  inputId: string,
  listener: MidiMessageListener,
): () => void {
  const input = findInputById(access, inputId);

  if (!input) {
    return () => {};
  }

  input.addEventListener('midimessage', listener);

  return () => {
    input.removeEventListener('midimessage', listener);
  };
}

export { notSupportedMessage };
