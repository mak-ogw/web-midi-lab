# Project Context (for AI agents)

## Goal
Build small Web MIDI applications that interact with external MIDI devices.
No built-in audio engine.

## Architecture Direction (future)
This project will be split into multiple libraries:

- midi-core (Web MIDI wrapper)
- sequencer-clock (time management)
- midi-pattern (message generation)
- midi-input (receive layer)
- ui-kit (UI components)

## Current Phase
- Single Vite + React + TypeScript app
- No monorepo yet
- No library split yet

## Constraints (IMPORTANT)
- Do NOT add external dependencies unless explicitly instructed
- Do NOT implement sequencing unless explicitly instructed
- Do NOT restructure the repository
- Keep implementations minimal and simple
- Prefer plain TypeScript over abstraction

## Coding Style
- Small, readable functions
- Avoid premature abstraction
- Keep files small
- Avoid over-engineering

## Workflow
- One feature per PR
- PR must pass `npm run build`

## Sequencer Architecture Policy

Do not assume that all sequencers are step sequencers.

Shared libraries should focus on:
- Web MIDI access
- MIDI message send/receive
- MIDI message formatting/decoding
- transport state
- clock/time management
- scheduling timestamped MIDI events

Application-specific sequencer logic should stay outside shared libraries, such as:
- step patterns
- piano roll data models
- Euclidean pattern generation
- generative rules
- probability logic
- automation lanes
- chord progression logic

The shared scheduler should not know what a "step" is.
It should only handle timestamped musical/MIDI events.
