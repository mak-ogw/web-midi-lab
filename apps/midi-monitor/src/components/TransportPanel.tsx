import { useEffect, useMemo, useState } from 'react';
import { createTransportClock } from '@web-midi-lab/transport';
import type { TransportClockState } from '@web-midi-lab/transport';

const initialState: TransportClockState = {
  bpm: 120,
  isRunning: false,
  elapsedMs: 0,
  beatPosition: 0,
};

function formatMs(ms: number): string {
  return `${ms.toFixed(0)} ms`;
}

function formatBeatPosition(beatPosition: number): string {
  return beatPosition.toFixed(3);
}

export default function TransportPanel() {
  const clock = useMemo(() => createTransportClock({ bpm: initialState.bpm }), []);
  const [state, setState] = useState<TransportClockState>(clock.getState());
  const [bpmInput, setBpmInput] = useState(() => String(initialState.bpm));

  useEffect(() => {
    const unsubscribe = clock.subscribe((nextState) => {
      setState(nextState);
    });

    return () => {
      unsubscribe();
      clock.stop();
    };
  }, [clock]);

  return (
    <section className="midi-panel">
      <h2>Transport Clock</h2>
      <p>Status: {state.isRunning ? 'Running' : 'Stopped'}</p>
      <p>BPM: {state.bpm.toFixed(2)}</p>
      <p>Elapsed: {formatMs(state.elapsedMs)}</p>
      <p>Beat Position: {formatBeatPosition(state.beatPosition)}</p>

      <div className="midi-log-controls-row">
        <label htmlFor="transport-bpm-input">BPM</label>
        <input
          id="transport-bpm-input"
          type="number"
          min={1}
          value={bpmInput}
          onChange={(event) => {
            const nextInput = event.target.value;
            setBpmInput(nextInput);

            const parsed = Number(nextInput);
            if (Number.isFinite(parsed) && parsed > 0) {
              clock.setBpm(parsed);
            }
          }}
          onBlur={() => {
            const parsed = Number(bpmInput);
            if (Number.isFinite(parsed) && parsed > 0) {
              const normalized = Math.max(1, parsed);
              clock.setBpm(normalized);
              setBpmInput(String(normalized));
              return;
            }

            setBpmInput(String(state.bpm));
          }}
        />
      </div>

      <div className="midi-log-controls-row">
        <button type="button" onClick={() => clock.start()} disabled={state.isRunning}>
          Start
        </button>
        <button type="button" onClick={() => clock.stop()} disabled={!state.isRunning}>
          Stop
        </button>
        <button
          type="button"
          onClick={() => {
            clock.reset();
          }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
