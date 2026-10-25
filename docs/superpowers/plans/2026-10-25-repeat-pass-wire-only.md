# Wire-only Repeat Traversals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make repeated route traversals wire-only so they contribute no LEDs and no LED-strip electrical load anywhere in the application.

**Architecture:** Keep the route optimizer and traversal model unchanged, but separate route geometry from LED-strip accounting in `ElectricalCalculator`. `GyverTwinkExport` skips repeat traversals while preserving route order of the remaining physical-edge LEDs. UI, SVG and PDF consume explicit LED-strip and jumper-wire metrics instead of treating total route length as LED strip.

**Tech Stack:** Dependency-free JavaScript UMD modules, Node `node:test`, standalone build.

**Spec:** `docs/superpowers/specs/2026-10-25-repeat-pass-wire-only.md`

## Global Constraints

- Project JSON format v3 must not change.
- Route optimizer, endpoint selection, numbering and traversal order must not change.
- Repeat traversals remain real route/wire segments but contribute zero LEDs.
- Exact LED count is `uniqueEdgeCount * segmentsPerEdge`.
- Power/current/PSU depend only on actual LED strip, not repeat-wire length.

## Review Focus

- Customer project with 54 unique edges, 63 traversals and 9 repeats exports exactly 324 LEDs.
- Mechanical edge correction changes geometry/jumper span but not LED count or nominal LED-strip power.
- A route with zero repeats keeps the same LED count and electrical results expected from unique edges.
- Repeat route visualization/specification remains present after LED accounting changes.
- Standalone `index.html` contains the corrected code and labels after build.

---

### Task 1: Lock the new accounting rules with failing tests

**Files:**
- Modify: `tests/electrical-calculator.test.js`
- Modify: `tests/gyvertwink-export.test.js`
- Modify as needed: UI/export tests covering metric labels

**Interfaces:**
- Electrical result adds `ledCount`, `ledStripLengthM`, `routeLengthM`; keeps `ledCountApprox` and `totalLengthM` compatibility aliases.
- GyverTwink format stays version 1.

- [ ] Add tests asserting repeat length does not affect LED count, LED-strip length, power, current or PSU.
- [ ] Add a correction test proving `edgeCorrectionMm` does not change LED count/power.
- [ ] Change customer GyverTwink expectation from 378 to 324 and assert repeat traversals add no coordinate groups.
- [ ] Run CI and confirm the new tests fail for the intended old behavior.

### Task 2: Correct the electrical domain model

**Files:**
- Modify: `src/core/electrical-calculator.js`
- Modify: `src/app/editor-state.js` only if an input/interface change is required

**Interfaces:**
- `ElectricalCalculator.calculate(input)` returns explicit strip, jumper and route metrics.

- [ ] Compute exact LEDs from unique physical edges and segments per edge.
- [ ] Compute LED-strip length from LED count/density, repeat wire length separately, and route length as geometry plus jumpers.
- [ ] Derive power/current/PSU only from LED-strip length.
- [ ] Keep compatibility aliases without user-facing ambiguity.
- [ ] Run full test suite and confirm electrical tests pass.

### Task 3: Remove LEDs from repeated GyverTwink passes

**Files:**
- Modify: `src/core/gyvertwink-export.js`
- Modify: `src/app/gyvertwink-ui.js`
- Delete/update: `tests/fixtures/example-gyvertwink-map.json` if the previous byte-golden no longer represents the contract

**Interfaces:**
- `GyverTwinkExport.build(snapshot)` emits LEDs only for non-repeat traversals.

- [ ] Skip `traversal.repeat` before LED interpolation.
- [ ] Remove repeat-offset production behavior and UI option.
- [ ] Preserve START/END, outline, dimensions and deterministic ordering.
- [ ] Replace the obsolete 378-LED golden assertion with deterministic 324-LED customer regression coverage.
- [ ] Run full test suite.

### Task 4: Correct all user-facing statistics and exports

**Files:**
- Modify: `src/app/editor-ui.js`
- Modify: `src/core/svg-exporter.js`
- Modify: `src/core/pdf-exporter.js`
- Modify: `README.txt`
- Modify relevant UI/PDF/SVG tests

**Interfaces:**
- Display `LED-лента`, `Провод повторов`, `Маршрут`, exact `LED`, and corrected electrical load.

- [ ] Remove `Итого ленты` wording for route length.
- [ ] Use exact LED count without approximation marker.
- [ ] Ensure SVG/PDF summaries use the same semantics as editor metrics.
- [ ] Document wire-only repeat behavior.
- [ ] Run `npm test`, standalone build and standalone verification in CI.
- [ ] Open a PR for manual review; do not merge without explicit user approval.