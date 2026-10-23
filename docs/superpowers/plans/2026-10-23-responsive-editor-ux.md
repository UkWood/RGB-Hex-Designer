# Responsive Editor UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved responsive engineering-editor UX while preserving routing, state, project compatibility, PDF behavior, and standalone operation.

**Architecture:** Keep `editor-ui.js` as the stable functional shell and implement the redesign primarily as V3 progressive composition: reuse/move stable controls, add presentation-only controls, and style the resulting DOM responsively. Keep new behavior small and testable; do not change routing/core algorithms.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js built-in test runner, standalone build scripts.

**Spec:** `docs/superpowers/specs/2026-10-23-responsive-editor-ux-design.md`

## Global Constraints

- Work only on `codex/ui-ux-responsive-redesign`; do not merge to `main`.
- No framework or network dependency.
- Preserve stable IDs/state bindings and JSON v1/v2/v3 behavior.
- Persistent sidebar only above 1080 px.
- Primary touch controls >=44 CSS px; add-face SVG hit area 48–52 px.
- Mobile remains usable at ~320 CSS px.

## Review Focus

- Tablet widths around 768–1080 px must not leave a narrow persistent sidebar beside the canvas.
- Drawer open/close and Escape handling must not mutate project state or interfere with canvas pan/zoom.
- Existing legacy/V3 control IDs must remain unique after DOM regrouping.
- Appearance selection must fall back cleanly to system preference and not break dark-mode variables.
- Touch hit-area enlargement must not block START/END endpoint picking or render a larger visible green circle.

---

### Task 1: Lock the new UI structure with failing tests

**Files:**
- Modify: `tests/ui-structure.test.js`
- Modify: `tests/v3-ui.test.js`

**Interfaces:**
- Consumes: existing stable IDs and V3 augmentation.
- Produces: test contract for header actions, grouped sidebar sections, drawer controls, mode banner, output rows, segmented optimization, appearance control, 1080 px breakpoint, and enlarged add-face hit area.

- [ ] Add structure/style assertions for the new UX contract.
- [ ] Run `npm test` and verify the new assertions fail because the redesign is not implemented yet.
- [ ] Commit the failing tests.

### Task 2: Recompose header, toolbar, and parameter groups

**Files:**
- Modify: `src/app/v3-ui.js`
- Modify: `src/styles.css`
- Test: `tests/v3-ui.test.js`, `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: existing DOM IDs from `editor-ui.js`.
- Produces: `.editor-header`, `.project-actions`, `.ux-section--geometry`, `.ux-section--display`, calculated `.output-row` elements, and toolbar containing action controls only.

- [ ] Implement the new header/project-name composition and move existing save/open/PDF actions into it without duplicating IDs.
- [ ] Move required dimensions and edge controls into Geometry; move display toggles into Display.
- [ ] Render base/final edge values as calculated outputs synchronized from state while keeping hidden compatibility inputs if required by existing bindings/tests.
- [ ] Run focused tests, then full `npm test`.
- [ ] Commit.

### Task 3: Implement responsive drawer/mobile editor shell

**Files:**
- Modify: `src/app/v3-ui.js`
- Modify: `src/styles.css`
- Test: `tests/v3-ui.test.js`, `tests/ui-structure.test.js`

**Interfaces:**
- Produces: `#parameters-toggle`, `#parameters-drawer`, `#parameters-close`, drawer backdrop, Escape close behavior, and responsive CSS switching at 1080/760/380 px.

- [ ] Add failing tests for drawer controls and breakpoint contract.
- [ ] Verify RED with `npm test`.
- [ ] Implement overlay drawer and compact narrow-screen controls.
- [ ] Verify drawer state is presentation-only and full suite is green.
- [ ] Commit.

### Task 4: Improve mode clarity, touch behavior, and optimization control

**Files:**
- Modify: `src/app/editor-ui.js`
- Modify: `src/app/v3-ui.js`
- Modify: `src/styles.css`
- Test: `tests/ui-structure.test.js`, `tests/v3-ui.test.js`

**Interfaces:**
- Produces: invisible `.add-face-touch` SVG hit circle, `#editor-mode-banner`, mode cancellation behavior, and segmented optimization buttons mirroring `#objective-select`.

- [ ] Add failing assertions for invisible hit target, visible mode banner hook, and segmented control.
- [ ] Verify RED.
- [ ] Add 48–52 px touch hit area while preserving visible `r=16` add control and keyboard semantics.
- [ ] Add mode banner for Delete/START/END, including Escape cancellation.
- [ ] Add segmented optimization UI synchronized bidirectionally with the existing select/state flow.
- [ ] Run full tests and commit.

### Task 5: Add explicit appearance preference and polish visual hierarchy

**Files:**
- Modify: `src/app/v3-ui.js`
- Modify: `src/styles.css`
- Test: `tests/v3-ui.test.js`, `tests/ui-structure.test.js`

**Interfaces:**
- Produces: `#appearance-select`, `data-theme="light|dark"` override on document root, `system` fallback, and refined panel/separator styling.

- [ ] Add failing tests for appearance control and CSS theme override hooks.
- [ ] Verify RED.
- [ ] Implement System/Light/Dark preference with localStorage guarded for unavailable storage.
- [ ] Reduce unnecessary borders/card weight while keeping focus/contrast clear.
- [ ] Run full tests and commit.

### Task 6: Standalone build and final verification

**Files:**
- Modify if needed: `scripts/verify-standalone.js`
- Generated/verify: `index.html`
- Update: `README.txt` only if interaction instructions changed materially.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: standalone build containing the redesign and verification coverage for required controls.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Inspect generated `index.html` for the new responsive/UI hooks.
- [ ] If build/verify contract needs updates, add failing verification first, then minimal fix.
- [ ] Commit generated/build verification changes.
- [ ] Compare branch against `main`; ensure no core routing/model changes slipped in.
- [ ] Leave branch unmerged for manual user review.