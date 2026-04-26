# Euclidean Harmony Sequencer - SPEC v1

## 1. Overview
This application is a Web MIDI-based sequencer for studying:

- Euclidean rhythm generation
- Scale-constrained pitch manipulation
- Chord transformation (Pitch / Harmony / Voicing)

This is a behavior simulation tool, not a reproduction of any specific hardware product.

---

## 2. Core Concept
Timing:
  Euclidean rhythm (steps, pulses, offset)

Pitch:
  Derived from a Pitch Set

Transformation:
  Pitch → Harmony → Voicing

Constraint:
  All pitch movement is restricted to a selected scale

---

## 3. Terminology
Step: Discrete time unit  
Pulse: Number of trigger events  
Pattern: Boolean array  
Scale: Allowed pitch classes  
Note: MIDI note number  
Pitch Set: Chord notes  
Cycle: Snapshot of Pitch Set  
Sequence: Output over time  

---

## 4. Rhythm Engine (Euclidean)

Parameters:
- steps
- pulses
- division
- offset

Behavior:
pattern = euclidean(steps, pulses)
pattern = rotate(pattern, offset)

Timing:
step_duration = (60 / BPM) / division

---

## 5. Scale System

Scales:
- chromatic
- major
- natural_minor
- pentatonic

All pitch must snap to selected scale.

---

## 6. Pitch Set & Cycle

pitchSet: MIDI note array  
cycles: array of pitchSets  

Active pitchSet = cycles[currentCycleIndex]

Cycle switching:
- Immediate (no boundary sync)

---

## 7. Pitch Parameter

All notes shift together within scale.

---

## 8. Harmony Parameter

One note changes per update:
- Triggered by UI change
- Applied at note generation timing

---

## 9. Voicing Parameter

Reorders octaves only:
- Positive → raise lowest notes
- Negative → lower highest notes

---

## 10. Event Pipeline

Pitch → Harmony → Voicing → Output

---

## 11. MIDI Output

- Note On for all notes in set
- Note Off scheduled via scheduler
- Gate: percentage of step duration
- Channel: fixed (1)
- Velocity: fixed

---

## 12. Key Decisions

- Gate length: percentage
- Note Off: handled by scheduler
- Cycle switch: immediate
- Harmony trigger: UI-driven, applied at note generation

---

## 13. Non-Goals

- UI design
- velocity modulation
- groove
- advanced sequencing features

---

## 14. Constraints

- No step logic in shared scheduler
- No UI logic in core modules
