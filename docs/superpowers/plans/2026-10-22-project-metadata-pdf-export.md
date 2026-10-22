# Project Metadata and PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend RGB Hex Designer with project metadata, corrected edge length, target dimensions, dynamic numbering, manual closed-loop routing, automatic fit-on-growth, JSON v3 persistence, and PDF-only print export.

**Architecture:** Keep the standalone dependency-free UMD architecture. Add a pure `DisplayNumbering` core module for derived edge/hex numbers and a pure printable-document pipeline that reuses current graph/route/electrical state instead of recalculating formulas independently. `EditorState` remains the single source of project inputs and derived state; `EditorUI` renders workspace controls and only opens the print document.

**Tech Stack:** Vanilla JavaScript, Node 24 `node:test`, inline SVG inside HTML print view, browser `window.print()`, standalone single-file build.

**Spec:** `docs/superpowers/specs/2026-10-22-project-metadata-pdf-export-design.md`

## Global Constraints

- Application remains fully offline and dependency-free; no network requests, external fonts, CDN assets, or server runtime.
- User-facing terminology is `Шестигранник` and `Ребро`; a shared side of two adjacent hexagons is one physical edge.
- Corrected physical edge length is `segmentsPerEdge * 1000 / ledPerM + edgeCorrectionMm` and must stay > 0.
- AUTO continues to choose distinct endpoints; manual mode may use the same valid lower-boundary vertex for START and END.
- Display numbering is derived and never persisted.
- JSON save format becomes canonical version 3 while v1/v2 remain readable.
- User-facing SVG export is removed; PDF export uses a printable document and browser print dialog.
- Page 1 is the scheme; page 2 begins parameters/specification; long edge tables may continue to page 3+.
- Explicit Fit and orientation refit keep at least 20 px workspace margin; add-hex refit happens only when the new rendered scene would be clipped.

## Review Focus

- Negative correction that still yields a positive edge length must be accepted; a correction producing `edgeMm <= 0` must leave the previous valid state unchanged. Covered in Task 1/2 tests.
- Partial required dimensions (`width` only or `height` only) must round-trip through JSON but must not draw a target frame. Covered in Task 2/5 tests.
- Manual START=END must remain manual across unrelated changes, serialize identically, and produce a continuous closed trail. Covered in Task 3 tests.
- Repeated traversal of an edge must reuse its first edge number and show only extra passes (`count - 1`) in the specification. Covered in Task 4/6 tests.
- Blocked print popup must not throw or destroy state; UI must show a retry message. Covered in Task 6/7 tests.

---

### Task 1: Corrected Edge-Length and Electrical Model

**Files:**
- Modify: `src/core/electrical-calculator.js`
- Modify: `tests/electrical-calculator.test.js`
- Modify: `tests/geometry-boundary.test.js`

**Interfaces:**
- Produces: `ElectricalCalculator.edgeLengthsFromSegments(segmentsPerEdge, ledPerM, edgeCorrectionMm=0) -> {baseEdgeMm, edgeMm}`.
- Produces: `ElectricalCalculator.calculate(input)` normalized output containing `segmentsPerEdge`, `baseEdgeMm`, `edgeCorrectionMm`, and corrected `edgeMm`.
- Compatibility: keep `sideMmFromSegments(segments, ledPerM)` as a legacy helper returning the uncorrected base length until all consumers migrate.

- [ ] **Step 1: Write failing tests** for `6 @ 60 LED/m = 100 mm base`, corrections `0`, `+5`, `-5`, rejection when corrected length is `<= 0`, and calculations/bounds using the corrected value rather than the base value.
- [ ] **Step 2: Run** `node --test tests/electrical-calculator.test.js tests/geometry-boundary.test.js` and confirm failures are specifically missing corrected-edge behavior.
- [ ] **Step 3: Implement** `edgeLengthsFromSegments(...)`; update validation/calculation to consume corrected `edgeMm` while preserving existing voltage/reserve validation.
- [ ] **Step 4: Run the same tests** and confirm PASS.
- [ ] **Step 5: Commit** `feat: add corrected physical edge length`.

### Task 2: JSON v3 and Editor Project Inputs

**Files:**
- Modify: `src/core/project-io.js`
- Modify: `src/app/editor-state.js`
- Modify: `tests/project-io.test.js`
- Modify: `tests/editor-state.test.js`

**Interfaces:**
- Canonical v3 fields: `project.name`, `layout.required_width_mm`, `layout.required_height_mm`, `strip.segments_per_edge`, `strip.edge_correction_mm`, and `view.show_hex_numbers/show_edge_numbers/show_route_numbers/show_diagnostics`.
- Editor snapshot fields: `projectName`, `requiredWidthMm`, `requiredHeightMm`; `strip:{segmentsPerEdge,baseEdgeMm,edgeCorrectionMm,edgeMm,...}`; `view:{showHexNumbers,showEdgeNumbers,showRouteNumbers,showDiagnostics}`.
- New actions: `SET_PROJECT_NAME`; `SET_REQUIRED_DIMENSION` with `field:'width'|'height'` and nullable value; extend `SET_STRIP_INPUT` with `segmentsPerEdge` and `edgeCorrectionMm`.

- [ ] **Step 1: Write failing ProjectIO tests** for canonical v3 round-trip, v1/v2 migration to v3 defaults, identical manual START/END descriptors, partial required dimensions, and malformed v3 transactional rejection.
- [ ] **Step 2: Run** `node --test tests/project-io.test.js` and confirm v3 tests fail.
- [ ] **Step 3: Implement ProjectIO v3** serialization, validation, migrations, and legacy `segments_per_side -> segments_per_edge` mapping.
- [ ] **Step 4: Write failing EditorState tests** for project name, target dimensions, edge correction, invalid corrected edge rejection, and v3 load/save state mapping.
- [ ] **Step 5: Implement EditorState fields/actions** and switch all physical calculations/ranking inputs from legacy `sideMm` to corrected `edgeMm`.
- [ ] **Step 6: Run** `node --test tests/project-io.test.js tests/editor-state.test.js` and confirm PASS.
- [ ] **Step 7: Commit** `feat: add JSON v3 project metadata and edge inputs`.

### Task 3: Closed Route with Manual START = END

**Files:**
- Modify: `src/core/route-optimizer.js`
- Modify: `src/core/endpoint-selector.js`
- Modify: `src/core/project-io.js`
- Modify: `src/app/editor-state.js`
- Modify: `tests/route-optimizer.test.js`
- Modify: `tests/endpoint-selector.test.js`
- Modify: `tests/editor-state.test.js`
- Modify: `tests/project-io.test.js`

**Interfaces:**
- `RouteOptimizer.prepare(graph, objective).solve(startId,endId)` accepts equal valid IDs and returns a closed Eulerized circuit with `vertexTrail[0] === vertexTrail.at(-1)`.
- `EndpointSelector.validateManual(...)` accepts identical IDs when that vertex belongs to `lowerCandidateIds`; AUTO pair enumeration remains distinct-only.

- [ ] **Step 1: Write failing optimizer tests** for a closed Chinese Postman circuit, full edge coverage, repeat flags, and zero START-END separation.
- [ ] **Step 2: Run** route/endpoint tests and confirm the existing `START and END must differ` guard is the failure.
- [ ] **Step 3: Implement closed-route parity handling** by removing the unequal-endpoint prohibition; when IDs match, do not toggle endpoint parity. Keep final trail validation against the requested end ID.
- [ ] **Step 4: Write/adjust state and persistence tests** showing manual START and END can be set to the same lower vertex, remain manual, survive JSON v3, and still fall back to AUTO if that vertex becomes invalid after geometry/orientation change.
- [ ] **Step 5: Implement manual endpoint acceptance** in selector/state/ProjectIO resolution.
- [ ] **Step 6: Run** the four affected test files and confirm PASS.
- [ ] **Step 7: Commit** `feat: allow manual closed-loop routing`.

### Task 4: Dynamic Edge and Hexagon Numbering

**Files:**
- Create: `src/core/display-numbering.js`
- Create: `tests/display-numbering.test.js`
- Modify: `src/app/editor-state.js`
- Modify: `tests/editor-state.test.js`

**Interfaces:**
- `DisplayNumbering.derive({graph,solution,startId,orientation,edgeMm}) -> {edgeNumberById,hexNumberByKey,traversalCountByEdgeId,specRows}`.
- `specRows` sorted by edge number, each `{edgeId,number,additionalPasses}` where `additionalPasses = traversalCount - 1`.
- Editor snapshot gains `numbering` with exactly the derived object above; no numbering fields are serialized by ProjectIO.

- [ ] **Step 1: Write failing numbering tests** proving first route encounter assigns edge numbers, repeated traversals reuse the same number, and specification uses blank-equivalent zero via `additionalPasses:0`.
- [ ] **Step 2: Add hex-number tests** using the three sort keys: shortest unweighted graph-edge distance from START to any module vertex, first route encounter, then current visual center top-to-bottom/left-to-right.
- [ ] **Step 3: Run** `node --test tests/display-numbering.test.js` and confirm module missing/failures.
- [ ] **Step 4: Implement `DisplayNumbering.derive(...)`** using BFS from START for graph distance, route traversal scan for first encounter/counts, and `GeometryBuilder.toWorld` for the final visual tie-break.
- [ ] **Step 5: Wire EditorState recompute** to derive numbering after a valid solution; add tests that geometry/orientation/endpoint changes recompute numbering and that JSON does not freeze numbers.
- [ ] **Step 6: Run** numbering + state tests and confirm PASS.
- [ ] **Step 7: Commit** `feat: derive dynamic hex and edge numbering`.

### Task 5: Workspace UI, Target Frame, Terminology, and Auto-Fit

**Files:**
- Modify: `src/app/editor-ui.js`
- Modify: `src/app/dimension-overlay.js`
- Modify: `src/styles.css`
- Modify: `tests/ui-structure.test.js`
- Modify: `tests/dimension-overlay.test.js`

**Interfaces:**
- Stable controls: `project-name`, `required-width-mm`, `required-height-mm`, `segments-per-edge`, `base-edge-mm`, `edge-correction-mm`, `edge-mm`, `show-hex-numbers`, `show-edge-numbers`, `show-route-numbers`, `export-pdf-btn`.
- `DimensionOverlay.dimensionGeometry(snapshot)` returns actual scene/mm bounds and optional centered target scene/mm bounds.
- `EditorUI.sceneFitsViewport(svg, view, width, height, padding=20) -> boolean` is the predicate used after successful `ADD_HEX`; only false triggers `fitRenderedScene()`.

- [ ] **Step 1: Write failing UI structure tests** for project-name placement, orientation-following required dimensions, edge terminology/inputs, independent numbering toggles, PDF button, and absence of the user-facing SVG button.
- [ ] **Step 2: Write failing overlay tests** for target rectangle center equality, red/unfilled styling, four target dimension labels, partial-target suppression, corrected-edge actual dimensions, and orientation rebuild.
- [ ] **Step 3: Write failing auto-fit tests** showing an ADD_HEX that remains visible preserves pan/zoom while a clipped addition invokes the same rendered-scene fit used by `Вписать`.
- [ ] **Step 4: Implement UI/state bindings and workspace numbering**: hex numbers from `hexNumberByKey`, edge numbers centered on the physical edge from `edgeNumberById`, route-step numbers unchanged.
- [ ] **Step 5: Extend dimension overlay** with actual gray + optional required red frame using `RENDER_SIDE / edgeMm` scale conversion for required mm dimensions.
- [ ] **Step 6: Implement add-only conditional refit** after rerender; orientation and explicit Fit remain unconditional full-scene fits.
- [ ] **Step 7: Run** `node --test tests/ui-structure.test.js tests/dimension-overlay.test.js` plus state tests and confirm PASS.
- [ ] **Step 8: Commit** `feat: add project controls target bounds and edge numbering UI`.

### Task 6: Printable Vector Diagram and Multi-page PDF Document

**Files:**
- Create: `src/core/diagram-renderer.js`
- Create: `src/core/print-document.js`
- Create: `tests/diagram-renderer.test.js`
- Create: `tests/print-document.test.js`
- Remove after replacement: `src/core/svg-exporter.js`
- Remove after replacement: `tests/svg-exporter.test.js`

**Interfaces:**
- `DiagramRenderer.render(snapshot) -> string` returns standalone inline SVG markup for page 1 only; it consumes `snapshot.numbering` and does not compute numbering itself.
- `PrintDocument.render(snapshot) -> string` returns a complete offline printable HTML document with page-1 diagram and page-2+ parameters/specification.
- `PrintDocument.safeTitle(projectName) -> string` returns a printable/suggested-file title with fallback `Без названия`.

- [ ] **Step 1: Port SVG regression expectations into failing diagram tests**: modules, route/repeats/arrows, dynamic hex/edge/step numbers, actual gray frame, target red frame, combined `START / END`, no external URLs/scripts/raster images, and all visible annotation bounds included in the page-1 viewBox.
- [ ] **Step 2: Implement `DiagramRenderer.render(snapshot)`** by extracting reusable drawing logic from the old exporter; remove all legend/specification content from the diagram itself.
- [ ] **Step 3: Write failing print-document tests** for A4 landscape print CSS, forced page break after page 1, project title, compact 4-column parameter grid, corrected-edge inputs/calculations, `<table><thead>`, rows sorted by edge number, empty extra-pass cell for zero, and continuation-friendly CSS (`thead` repeat / row break avoidance).
- [ ] **Step 4: Implement `PrintDocument.render(snapshot)`** from snapshot-derived values only. Use normal DATA note for distinct endpoints and closed-loop wording when START=END.
- [ ] **Step 5: Run** `node --test tests/diagram-renderer.test.js tests/print-document.test.js` and confirm PASS.
- [ ] **Step 6: Delete old SVG exporter/test** only after replacement tests cover its still-relevant diagram behavior.
- [ ] **Step 7: Commit** `feat: add multi-page printable PDF document`.

### Task 7: PDF Export Interaction and Standalone Build Wiring

**Files:**
- Modify: `src/app/editor-ui.js`
- Modify: `src/app/main.js` if export wiring benefits from a small helper
- Modify: `scripts/build.js`
- Modify: `scripts/verify-standalone.js`
- Modify: `tests/ui-structure.test.js`
- Modify: `README.txt`

**Interfaces:**
- `EditorUI.openPrintDocument(snapshot, windowObject=window) -> {ok:boolean,reason?:string}` opens a new same-origin blank window, writes `PrintDocument.render(snapshot)`, closes the document, and invokes `print()` after document readiness.
- UI surfaces `popup_blocked` as a Russian retry message and leaves current state untouched.

- [ ] **Step 1: Write failing tests/static assertions** for `export-pdf-btn`, removal of `export-svg-btn`, `PrintDocument`/`DiagramRenderer` dependency wiring, popup-blocked handling, and disabled/clear-message behavior when no routeable construction exists.
- [ ] **Step 2: Implement print-window interaction** without external dependencies; keep print content independent from the editor DOM.
- [ ] **Step 3: Update `scripts/build.js`** source order: include `display-numbering.js`, `diagram-renderer.js`, `print-document.js`; remove `svg-exporter.js`.
- [ ] **Step 4: Update standalone verifier** required IDs and ensure no network/static-external checks are weakened.
- [ ] **Step 5: Update README** for edge terminology, corrected length, JSON v3, START=END, target dimensions, PDF workflow, and removal of SVG export.
- [ ] **Step 6: Run** `npm test && npm run build && npm run verify` and confirm all commands exit 0.
- [ ] **Step 7: Commit** `feat: wire PDF-only export into standalone app`.

### Task 8: Integration Regression, Preview, and PR Readiness

**Files:**
- Modify as needed: `tests/reference-construction.test.js`
- Modify as needed: `examples/reference-construction.json` only if a new v3 example is useful; keep at least one legacy fixture for migration coverage
- Generated on CI/main only: `index.html`

**Interfaces:**
- No new production interface; this task proves the branch meets the spec as an integrated standalone application.

- [ ] **Step 1: Add/adjust integration tests** covering legacy v1 reference load -> canonical v3 save, corrected edge dimensions, dynamic numbering completeness, and route continuity.
- [ ] **Step 2: Run fresh full verification**: `npm test`, `npm run build`, `npm run verify`; record exact pass count and build result.
- [ ] **Step 3: Create/update draft PR** from `feature/project-metadata-pdf-export` to `main` with the approved design/plan linked in the description.
- [ ] **Step 4: Verify PR CI on the actual final HEAD** and download the `rgb-hex-designer-preview` artifact.
- [ ] **Step 5: Manual acceptance checklist in preview**: project name; target frame; positive/negative correction; orientation; dynamic hex/edge numbers; repeated-edge specification; distinct START/END; START=END; conditional auto-fit; JSON v3 round-trip; legacy v1/v2 load; PDF print preview page 1 and page 2; long-table continuation behavior.
- [ ] **Step 6: Do not merge** until the user explicitly approves the preview. After approval, follow the existing squash-merge + main CI + Pages verification procedure.

## Final Verification Commands

```bash
npm test
npm run build
npm run verify
```

Expected: zero test failures; `index.html` builds as one self-contained offline file; verifier reports all required controls and no external/network dependencies.
