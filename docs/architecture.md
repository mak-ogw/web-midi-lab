# Architecture

## Current state (npm workspace monorepo)

This project is an npm workspace monorepo with one app and three shared packages.

## Workspace layout

- `apps/midi-monitor`
  - Vite + React + TypeScript application shell and product-specific UI/flows.
  - Contains app-layer logic and the 8-step sequencer behavior/UI.

- `packages/midi-core`
  - Reusable Web MIDI primitives and helpers.
  - Includes API access (`requestMIDIAccess` wrapper), device snapshot/listing utilities, MIDI message formatting/decoding helpers, raw MIDI send, and input subscriptions.

- `packages/transport`
  - Reusable transport timing state.
  - Includes BPM state, start/stop/reset behavior, elapsed time tracking, beat-position tracking, and periodic listener updates.

- `packages/scheduler`
  - Reusable timestamped MIDI event scheduling.
  - Includes lookahead processing, ordered scheduling, cancel by id, and clear/stop behavior.

## Public API entry points

Each shared package exposes a single public entry point through `src/index.ts` and `package.json` exports:

- `@web-midi-lab/midi-core` → `packages/midi-core/src/index.ts`
- `@web-midi-lab/transport` → `packages/transport/src/index.ts`
- `@web-midi-lab/scheduler` → `packages/scheduler/src/index.ts`

## Boundary rules

1. Keep reusable shared logic inside package workspaces only:
   - MIDI → `packages/midi-core`
   - Transport → `packages/transport`
   - Scheduler → `packages/scheduler`

2. Keep app-specific sequencer logic in the app workspace:
   - step/pattern data models
   - 8-step UI behavior
   - any other product-specific sequencing logic

3. Shared scheduler and transport code must stay generic and event/time based.

4. Shared packages must remain React-free.

## Root workflows

Run from repository root:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`
