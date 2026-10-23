# Default Edge Numbers and Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make edge numbers visible by default for new projects and make dark the initial theme when no appearance preference is stored.

**Architecture:** Keep the change localized to existing default-selection points. Editor state owns the new-project view default; V3 UI owns appearance preference resolution. Existing persisted project/theme values remain authoritative.

**Tech Stack:** Vanilla JavaScript, Node.js built-in test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-23-default-edge-numbers-dark-theme-design.md`

## Global Constraints

- Do not change saved-project view semantics.
- Do not override an explicit stored theme preference.
- No routing, geometry, electrical, or responsive-layout changes.

## Review Focus

- A brand-new editor state exposes `showEdgeNumbers: true`.
- A stored `system` preference remains `system` rather than being replaced by dark.
- A stored `light` preference remains `light`.
- Missing storage value resolves to `dark`.
- Storage read failure safely resolves to `dark`.

---

### Task 1: Pin new defaults with failing tests

**Files:**
- Modify: `tests/editor-state.test.js`
- Modify: `tests/v3-ui.test.js`

**Interfaces:**
- Consumes: `EditorState.create()`, V3 UI appearance resolver.
- Produces: regression coverage for both requested defaults.

- [ ] **Step 1:** Add a test asserting a fresh `EditorState.create().snapshot().view.showEdgeNumbers === true`.
- [ ] **Step 2:** Add behavior tests asserting the theme resolver returns `dark` for no stored preference/read failure and preserves stored `system`/`light`/`dark`.
- [ ] **Step 3:** Run CI and verify the new tests fail for the expected old defaults/missing resolver.

### Task 2: Implement minimal production changes

**Files:**
- Modify: `src/app/editor-state.js`
- Modify: `src/app/v3-ui.js`

**Interfaces:**
- Produces: fresh editor state with edge numbering enabled; `resolveInitialTheme(storage)` used by runtime theme loading.

- [ ] **Step 1:** Change only the new-state edge-number default from `false` to `true`.
- [ ] **Step 2:** Add `resolveInitialTheme(storage)` that returns a stored value when present, otherwise `dark`, and also falls back to `dark` on storage errors; use it from `loadTheme()`.
- [ ] **Step 3:** Export the resolver alongside the existing V3 UI helpers so the behavior can be tested directly.
- [ ] **Step 4:** Run the complete test/build/standalone verification suite and confirm green.

### Task 3: PR verification and merge

**Files:** none beyond generated standalone `index.html` after merge workflow.

- [ ] **Step 1:** Review branch diff against `main` and confirm only intended files changed.
- [ ] **Step 2:** Create PR and verify GitHub Actions is green on the exact PR head.
- [ ] **Step 3:** Merge with expected-head protection.
- [ ] **Step 4:** Verify `main`, post-merge CI, regenerated standalone Pages index, and Pages deployment.
