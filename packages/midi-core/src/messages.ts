import type { MidiMessageDetails } from './types.js';

const channelMask = 0x0f;
const messageTypeMask = 0xf0;
const channel1StatusNibble = 0x00;

export function createNoteOnMessage(note = 60, velocity = 100): number[] {
  return [0x90 | channel1StatusNibble, note, velocity];
}

export function createNoteOffMessage(note = 60, velocity = 0): number[] {
  return [0x80 | channel1StatusNibble, note, velocity];
}

export function formatMidiBytes(data: Uint8Array): string {
  return Array.from(data)
    .map((value) => value.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

export function decodeMidiMessage(data: Uint8Array): MidiMessageDetails {
  if (data.length === 0) {
    return { type: 'Other', channel: '-' };
  }

  const status = data[0];
  const messageType = status & messageTypeMask;
  const channel = (status & channelMask) + 1;

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
