export type MidiPortInfo = {
  id: string;
  name: string;
  manufacturer: string;
  state: MIDIPortDeviceState;
  connection: MIDIPortConnectionState;
};

export type MidiDeviceSnapshot = {
  inputs: MidiPortInfo[];
  outputs: MidiPortInfo[];
};

export type MidiMessageDetails = {
  type: string;
  channel: string;
};

export type MidiLogEntry = {
  id: number;
  timestamp: string;
  type: string;
  channel: string;
  bytes: string;
};

export type MidiMessageListener = (event: MIDIMessageEvent) => void;
