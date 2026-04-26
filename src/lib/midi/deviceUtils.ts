import type { MidiPortInfo } from './types.js';

export function toMidiPortInfo(port: MIDIPort): MidiPortInfo {
  return {
    id: port.id,
    name: port.name ?? 'Unknown device',
    manufacturer: port.manufacturer ?? '',
    state: port.state,
    connection: port.connection,
  };
}

export function toMidiInputInfoList(inputs: MIDIInputMap): MidiPortInfo[] {
  return Array.from(inputs.values()).map((input) => toMidiPortInfo(input));
}

export function toMidiOutputInfoList(outputs: MIDIOutputMap): MidiPortInfo[] {
  return Array.from(outputs.values()).map((output) => toMidiPortInfo(output));
}

export function findInputById(access: MIDIAccess, id: string): MIDIInput | null {
  return access.inputs.get(id) ?? null;
}

export function findOutputById(access: MIDIAccess, id: string): MIDIOutput | null {
  return access.outputs.get(id) ?? null;
}
