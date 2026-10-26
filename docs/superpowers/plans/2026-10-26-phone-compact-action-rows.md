# Phone Compact Action Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the four primary editor actions and four project actions on single compact rows on portrait smartphones.

**Architecture:** Reuse and reparent the existing DOM controls so handlers and IDs remain unchanged. Add phone-only layout rules at the existing `max-width:760px` breakpoint, and shorten visible project-action copy without changing behavior.

**Tech Stack:** Vanilla JavaScript, CSS, Node test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-26-phone-compact-action-rows.md`

## Global Constraints
- No new dependencies.
- Keep existing IDs and handlers.
- Preserve minimum 44px touch height.
- No changes to routing, JSON, PDF, GyverTwink export, or animation logic.

## Review Focus
- 360–380px portrait widths: both four-button rows must remain one row without forced wrapping.
- 760px boundary: compact phone layout applies; wider tablet layout remains unchanged.
- GyverTwink button is inserted after initial UI composition but still joins `.project-actions`.
- File-label `Открыть` remains clickable and keeps its hidden file input.
- Active START/END state remains visible after reparenting.

---

### Task 1: Add regression tests for compact phone rows

**Files:**
- Modify: `tests/v3-ui.test.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: existing source structure in `src/app/main.js`, `src/app/v3-ui.js`, `src/app/gyvertwink-ui.js`, `src/styles.css`.
- Produces: source-level regression checks for the two four-action rows and short labels.

- [ ] Add failing tests asserting a `phone-primary-tools` group contains `fit-btn`, `auto-endpoints-btn`, `pick-start-btn`, `pick-end-btn`.
- [ ] Add failing tests asserting phone CSS uses four equal columns for `.phone-primary-tools` and `.project-actions` at `max-width:760px`.
- [ ] Add failing tests asserting visible labels `Сохранить`, `Открыть`, `GyverTwink`, `PDF`.
- [ ] Run `npm test` and verify the new tests fail for the missing compact layout/copy.
- [ ] Commit the RED tests.

### Task 2: Implement compact smartphone action rows

**Files:**
- Modify: `src/app/main.js`
- Modify: `src/app/v3-ui.js`
- Modify: `src/app/gyvertwink-ui.js`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: stable control IDs and existing click/input handlers.
- Produces: `.phone-primary-tools` and four-column `.project-actions` phone layouts.

- [ ] Reparent `fit-btn` plus existing endpoint controls into `.phone-primary-tools` without cloning nodes.
- [ ] Set project-action visible labels to `Сохранить`, `Открыть`, `GyverTwink`, `PDF` while preserving IDs and file input.
- [ ] Add `max-width:760px` CSS making both groups four equal columns with compact typography/padding and no wrap.
- [ ] Run `npm test` and verify all tests pass.
- [ ] Run `npm run build` and `npm run verify`.
- [ ] Commit implementation.

### Task 3: PR verification

**Files:**
- No production file changes expected.

**Interfaces:**
- Consumes: branch HEAD from Task 2.
- Produces: Draft PR and standalone preview artifact for manual smartphone testing.

- [ ] Open a Draft PR to `main`.
- [ ] Verify GitHub Actions passes on the exact PR HEAD.
- [ ] Download the standalone preview artifact and provide it for manual smartphone testing.
- [ ] Leave PR unmerged until explicit user approval.
