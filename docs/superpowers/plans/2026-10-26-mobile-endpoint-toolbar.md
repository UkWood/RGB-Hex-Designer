# Mobile Endpoint Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep START/END selection usable on smartphones by moving endpoint actions to the persistent editor toolbar and make route playback actions compact icon buttons.

**Architecture:** Preserve all existing control IDs and event listeners. Reparent AUTO/START/END in the V3 UI augmentation layer so behavior remains owned by `editor-ui.js`; move `show-full-route-btn` into the playback row and convert the three playback actions to icon-only presentation with accessible labels/titles.

**Tech Stack:** Vanilla JavaScript, CSS, Node test runner, standalone HTML build.

**Spec:** `docs/superpowers/specs/2026-10-26-mobile-endpoint-toolbar.md`

## Global Constraints

- No routing/state/project-format changes.
- No duplicated control IDs.
- Icon-only playback controls must retain `aria-label` and `title` text.
- Mobile controls must remain touch-friendly.
- PR must remain unmerged for manual verification.

## Review Focus

- Narrow-screen toolbar wrapping must not cover the canvas excessively.
- Reparented endpoint buttons must retain their existing click listeners and active-state classes.
- Parameters drawer must no longer contain AUTO/START/END after V3 augmentation.
- Playback icons must remain understandable to screen readers and hover users.
- `show-full-route-btn` must still set the playback step to the final traversal.

---

### Task 1: Pin the responsive composition contract

**Files:**
- Modify: `tests/v3-ui.test.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: stable button IDs from `editor-ui.js`.
- Produces: regression tests defining toolbar location, playback location, icon labels, and compact styling.

- [ ] **Step 1: Write failing tests** asserting V3 creates an `endpoint-tools` group in `.toolbar`, moves `auto-endpoints-btn`, `pick-start-btn`, `pick-end-btn` into it, and labels them `AUTO`, `START`, `END`.
- [ ] **Step 2: Add failing structure assertions** for `show-full-route-btn` in `.route-controls`, icon text `⏵/⏸/⏭`, accessible labels/titles, and compact playback CSS.
- [ ] **Step 3: Run `npm test` and verify the new tests fail for missing composition/presentation rather than syntax errors.**

### Task 2: Implement endpoint toolbar and compact playback controls

**Files:**
- Modify: `src/app/editor-ui.js`
- Modify: `src/app/v3-ui.js`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: existing IDs/event listeners `auto-endpoints-btn`, `pick-start-btn`, `pick-end-btn`, `route-animate-btn`, `route-pause-btn`, `show-full-route-btn`.
- Produces: persistent endpoint toolbar group and compact accessible route playback actions.

- [ ] **Step 1: Move `show-full-route-btn` markup into `.route-controls`; render playback action glyphs `⏵`, `⏸`, `⏭` and add exact `aria-label`/`title` strings from the spec.**
- [ ] **Step 2: In `V3UI.install`, create `.endpoint-tools`, move the three existing endpoint buttons into it, set visible labels to `AUTO`, `START`, `END`, and set descriptive `aria-label`/`title` attributes.**
- [ ] **Step 3: Add compact CSS for route action buttons and responsive endpoint-tool wrapping/touch targets.**
- [ ] **Step 4: Run `npm test`; expected all tests pass.**
- [ ] **Step 5: Run `npm run build` and `npm run verify`; expected both pass.**

### Task 3: PR verification

**Files:**
- No production changes unless verification finds a defect.

**Interfaces:**
- Consumes: final branch HEAD.
- Produces: draft PR and preview artifact for manual smartphone verification.

- [ ] **Step 1: Create draft PR against `main`.**
- [ ] **Step 2: Verify PR mergeability and CI on the exact HEAD.**
- [ ] **Step 3: Download the preview artifact and provide it plus the PR URL; do not merge.**
