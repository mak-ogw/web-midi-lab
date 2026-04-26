import test from 'node:test';
import assert from 'node:assert/strict';

import {
  requestWebMidiAccess,
  getMidiDeviceSnapshot,
  notSupportedMessage,
  sendTestNote,
} from './.tmp-test/lib/midi/webMidi.js';

function setNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true,
  });
}

test('successful access returns inputs and outputs snapshot', async () => {
  const inputPort = {
    id: 'in-1',
    name: 'Keyboard',
    manufacturer: 'ACME',
    state: 'connected',
    connection: 'open',
  };
  const outputPort = {
    id: 'out-1',
    name: 'Synth',
    manufacturer: 'ACME',
    state: 'connected',
    connection: 'closed',
  };

  const fakeAccess = {
    inputs: new Map([[inputPort.id, inputPort]]),
    outputs: new Map([[outputPort.id, outputPort]]),
  };

  setNavigator({
    requestMIDIAccess: async () => fakeAccess,
  });

  const access = await requestWebMidiAccess();
  const snapshot = getMidiDeviceSnapshot(access);

  assert.equal(snapshot.inputs.length, 1);
  assert.equal(snapshot.outputs.length, 1);
  assert.deepEqual(snapshot.inputs[0], inputPort);
  assert.deepEqual(snapshot.outputs[0], outputPort);
});

test('unsupported browser rejects with not supported message', async () => {
  setNavigator({});

  await assert.rejects(async () => {
    await requestWebMidiAccess();
  }, new Error(notSupportedMessage));
});

test('permission denied errors are propagated', async () => {
  const permissionError = new Error('Permission denied');

  setNavigator({
    requestMIDIAccess: async () => {
      throw permissionError;
    },
  });

  await assert.rejects(async () => {
    await requestWebMidiAccess();
  }, permissionError);
});

test('sendTestNote sends note on then note off for channel 1', async () => {
  const sentMessages = [];
  const fakeOutput = {
    send: (message) => {
      sentMessages.push(message);
    },
  };

  await sendTestNote(fakeOutput, 1);

  assert.deepEqual(sentMessages, [
    [0x90, 60, 100],
    [0x80, 60, 0],
  ]);
});
