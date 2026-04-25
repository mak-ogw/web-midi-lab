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
