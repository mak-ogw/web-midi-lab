# web-midi-lab

Small Web MIDI experiments organized as an npm workspace monorepo.

## Workspaces

- `apps/midi-monitor`: Vite + React app for device monitoring, transport debug UI, scheduler debug trigger, and the app-specific 8-step sequencer UI.
- `packages/midi-core`: shared Web MIDI access, device helpers, message formatting/decoding, and input subscriptions.
- `packages/transport`: shared transport timing state (BPM/start/stop/reset/elapsed/beat updates).
- `packages/scheduler`: shared timestamped MIDI event scheduling with lookahead and cancellation.

## Requirements

- Node.js 20+
- npm 10+

## Install

```bash
npm install
```

## Root workspace commands

Run these from repository root:

- `npm run dev`
  - Starts the `@web-midi-lab/midi-monitor` app in Vite dev mode.
- `npm run build`
  - Type-checks/builds all shared packages, then builds the app.
- `npm test`
  - Runs test suites for shared packages and app helper tests.

## Package-level commands

Examples:

```bash
npm run build -w @web-midi-lab/midi-core
npm run test -w @web-midi-lab/transport
npm run dev -w @web-midi-lab/midi-monitor
```

## Architecture notes

- Shared packages are React-free.
- Shared scheduler and transport stay generic (time/event oriented only).
- App-specific sequencer behavior remains in `apps/midi-monitor`.

For detailed boundaries, see `docs/architecture.md`.
