# GyverTwink Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic GyverTwink map export that serializes the current routed design into ordered LED coordinates and unique outline segments, with a 1.0 mm visual separation for repeated traversals in the UI download.

**Architecture:** A new pure UMD core module `GyverTwinkExport` converts `EditorState.snapshot()` into format version 1 using `GeometryBuilder`. `editor-ui.js` owns the button/download behavior; `v3-ui.js` moves the new button into the responsive header with the other project actions. The project v3 serializer and all route/PDF algorithms remain untouched.

**Tech Stack:** dependency-free CommonJS/UMD JavaScript, Node built-in `node:test`, standalone HTML build.

**Spec:** `docs/superpowers/specs/2026-10-24-gyvertwink-export.md`

## Global Constraints

- Output filename: `gyvertwink-map.json`.
- Format: `gyvertwink_map: 1`, `unit: "mm"`, ordered LED coordinates rounded to 0.1 mm.
- `led_count === leds.length === traversals * segmentsPerEdge`.
- Project format v3, routing, numbering and PDF behavior must not change.
- UI export uses `repeatOffsetMm: 1.0`; pure builder default remains `0`.
- Empty/non-routable state shows `Сначала создайте трассируемую схему.` and produces no download.
- No new runtime/network dependencies.

## Review Focus

- Repeated edge traversals in opposite directions: left-of-travel offset must follow traversal direction while preserving route order.
- Flat orientation: export dimensions and START/END coordinates must rotate with the on-screen geometry.
- Closed manual START=END route: both exported endpoints must coincide without invalidating export.
- Export validation: malformed strip values or missing traversals must fail cleanly and never emit NaN/Infinity.
- Responsive header integration: the new button must remain next to project file actions after V3 UI rearrangement.

---

### Task 1: Export core contract

**Files:**
- Create: `tests/gyvertwink-export.test.js`
- Create: `src/core/gyvertwink-export.js`

**Interfaces:**
- Consumes: `GeometryBuilder.toWorld()`, `GeometryBuilder.worldBounds()`, `EditorState.snapshot()` shape.
- Produces: `GyverTwinkExport.build(snapshot, options?) -> {ok:true,data}|{ok:false,error}` and `FORMAT_VERSION`.

- [ ] Write failing tests for empty state, one-hex export, deterministic output, flat orientation, closed route, and `repeatOffsetMm` behavior.
- [ ] Run the new test file and verify RED because `gyvertwink-export.js` does not exist.
- [ ] Implement the pure exporter using the task-file reference algorithm.
- [ ] Run the new test file and the full `npm test` suite; verify GREEN.

### Task 2: Browser UI integration

**Files:**
- Modify: `src/app/editor-ui.js`
- Modify: `src/app/v3-ui.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `GyverTwinkExport.build(snapshot,{repeatOffsetMm:1})`.
- Produces: `export-gt-btn` and download of compact `gyvertwink-map.json`.

- [ ] Add failing source-structure tests for the button, GyverTwink dependency, 1.0 mm UI offset, filename, and V3 header project-action placement.
- [ ] Run UI tests and verify RED.
- [ ] Add the button and click handler; on failure notify exact task message and do not download.
- [ ] Move the new button with Save/Open/PDF in V3 UI.
- [ ] Run UI tests and full `npm test`; verify GREEN.

### Task 3: Standalone build and verification

**Files:**
- Modify: `scripts/build.js`
- Modify: `scripts/verify-standalone.js`
- Modify: tests as needed for build ordering/anchors.

**Interfaces:**
- Consumes: `src/core/gyvertwink-export.js`, `export-gt-btn`.
- Produces: standalone `index.html` containing the module and button.

- [ ] Add failing standalone/build assertions for `GyverTwinkExport` and `export-gt-btn`.
- [ ] Verify RED before changing build/verify scripts.
- [ ] Insert the exporter immediately after `geometry-builder.js` and extend verification anchors.
- [ ] Run `npm test`, `npm run build`, `npm run verify`; verify GREEN.

### Task 4: Documentation and regression review

**Files:**
- Modify: `README.txt`

**Interfaces:**
- Consumes: final export format.
- Produces: user-facing format documentation and repeat-offset note.

- [ ] Document fields, coordinate system, LED ordering, outline, and 1.0 mm repeat separation used by the UI export.
- [ ] Run `npm test`, `npm run build`, `npm run verify` again.
- [ ] Review branch diff to ensure no change to `project-io.js`, route optimizer, numbering, or PDF exporter.
- [ ] Open a separate PR against `main` and leave it unmerged for review.