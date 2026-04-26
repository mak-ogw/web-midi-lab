# Architecture

## Current state (single app)

This project is currently a single Vite + React + TypeScript application.

### Current folders and boundaries

- `src/lib/midi`
  - Reusable Web MIDI primitives and helpers.
  - Includes API access (`requestMIDIAccess` wrapper), device snapshot/listing utilities, message formatting/decoding helpers, and input subscriptions.

- `src/lib/transport`
  - Reusable transport timing state.
  - Includes BPM state, start/stop/reset behavior, elapsed time tracking, beat-position tracking, and periodic listener updates.

- `src/lib/scheduler`
  - Reusable timestamped MIDI event scheduling.
  - Includes lookahead processing, ordered scheduling, cancel by id, and clear/stop behavior.

- `src/components`
  - App-level UI and application-specific logic.
  - 8-step sequencer behavior and step data models remain here intentionally.

## Future state (npm workspace monorepo)

Planned direction (not yet implemented):

- `apps/midi-monitor`
  - Application shell and product-specific UI/flows.

- `packages/midi-core`
  - Web MIDI access.
  - Device listing.
  - Raw MIDI send.
  - MIDI input subscription.
  - MIDI message helpers/decoding.

- `packages/transport`
  - BPM.
  - start/stop/reset.
  - elapsed time.
  - beat position.
  - periodic clock updates.

- `packages/scheduler`
  - timestamped MIDI event scheduling.
  - lookahead processing.
  - cancel/clear scheduled events.
  - no pattern or step logic.

## Boundary rules during preparation phase

Until monorepo conversion starts:

1. Keep shared/reusable logic inside current `src/lib/*` folders only:
   - MIDI → `src/lib/midi`
   - Transport → `src/lib/transport`
   - Scheduler → `src/lib/scheduler`

2. Keep app-specific sequencer logic outside shared libs:
   - `step`
   - `pattern`
   - `piano roll`
   - `Euclidean`
   - generative rules
   - automation lanes

3. Shared scheduling and transport code must stay generic and event/time based.

4. No file moves to `apps/` or `packages/` yet, and no package extraction yet.
