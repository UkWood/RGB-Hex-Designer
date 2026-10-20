# Hex Router Designer v1 Implementation Plan

**Goal:** Build a fully offline single-file `Hex_Router_Designer.html` for constructing one connected arrangement of pointy-top hexagonal LED-ring modules, deriving the merged corridor graph, selecting valid lower START/END points, computing an optimal continuous LED-strip route, calculating strip/electrical values, and saving/loading JSON or exporting SVG.

**Spec:** `docs/superpowers/specs/2026-10-20-hex-router-designer-design.md`

## Architecture

The application is split into dependency-free UMD-style JavaScript modules so the same pure core code can run in Node tests and be concatenated into a standalone browser build. Geometry, routing, persistence, and electrical calculation stay DOM-free. `EditorState` orchestrates state transitions and recalculation; `EditorUI` owns SVG rendering and interaction. `scripts/build.js` inlines all CSS and JavaScript into one `Hex_Router_Designer.html` that runs from `file://` with no network dependencies.

## Global constraints

- Runtime artifact works by double-click from `file://`.
- No external JavaScript, CSS, fonts, network calls, server, installation, or browser storage required.
- Pointy-top axial `(q,r)` coordinates are the project-space source of truth.
- Placed modules must always form exactly one connected component.
- After the first module, one new module is added only through a free face of an existing module.
- START and END are distinct lower external-boundary vertices.
- AUTO ranking: minimum repeat count → minimum repeated shared sides → minimum total route length → maximum START-END separation.
- Route is exact and covers every corridor edge at least once.
- JSON format version is 1 and invalid imports are non-destructive.
- PNG export, disconnected islands, multiple controllers/DATA chains, voltage-drop simulation, and automatic wire/fuse sizing are out of scope.

## Task 1 — Connected hex-grid core

Files: `src/core/connectivity-validator.js`, `src/core/hex-grid.js`, `tests/hex-grid.test.js`.

Implement six axial neighbors, connected-component validation, safe removal, first-module placement, free-face enumeration, and rejection of disconnected additions or articulation-cell deletion. Tests cover one module, duplicate placement, chain/branch removal, leaf removal, unique neighbor positions, six free faces for one module, and ten free faces for two adjacent modules.

## Task 2 — Corridor geometry and lower boundary

Files: `src/core/geometry-builder.js`, `src/core/boundary-analyzer.js`, `tests/geometry-boundary.test.js`.

Use exact integer lattice coordinates for pointy-top hex corners, deduplicate shared vertices and sides, mark shared corridor edges, derive world coordinates from side length, determine external edges/vertices, and calculate lower START/END candidates using the bottom-quarter rule plus flat-row fallback.

## Task 3 — Exact route optimizer

Files: `src/vendor/edmonds-blossom.js`, `src/core/min-weight-perfect-matching.js`, `src/core/route-optimizer.js`, `tests/route-optimizer.test.js`.

Implement open Route Inspection / Chinese Postman routing: shortest paths, parity defects after toggling START/END, exact minimum-weight perfect matching with Edmonds Blossom, duplicate matched shortest paths, and construct the augmented Euler trail with Hierholzer. Support `min_repeats` and `avoid_shared` objectives. Tests cross-check small matching fixtures against exhaustive results and include a larger 28-parity-vertex performance/correctness case.

## Task 4 — Endpoint selection

Files: `src/core/endpoint-selector.js`, `tests/endpoint-selector.test.js`.

Evaluate all valid lower candidate pairs, solve each route, rank according to the approved lexicographic priorities, orient ties deterministically left-to-right, and validate manual lower-boundary overrides.

## Task 5 — Electrical calculations

Files: `src/core/electrical-calculator.js`, `tests/electrical-calculator.test.js`.

Calculate unique length, repeat length, total strip length, approximate LED count, power, current for 5/12/24 V, PSU recommendation including reserve, repeat percentage, and geometric START-END separation. Reject non-finite or invalid numeric values.

## Task 6 — Project persistence

Files: `src/core/project-io.js`, `tests/project-io.test.js`.

Implement deterministic version-1 JSON serialization and validation, preserve axial geometry/settings, store manual endpoints by stable geometric descriptors rather than pixels, reject duplicate or disconnected cells, and fall back to AUTO with a warning if imported manual endpoints are no longer valid.

## Task 7 — SVG export

Files: `src/core/svg-exporter.js`, `tests/svg-exporter.test.js`.

Generate a standalone vector SVG with module geometry, corridor, ordered route, repeated traversals, START/END, DATA arrows, optional module/step numbers, and compact electrical summary. Export must contain no scripts, raster images, or external resources.

## Task 8 — Editor state and history

Files: `src/app/editor-state.js`, `tests/editor-state.test.js`.

Implement state actions for add/select/delete/clear, undo/redo, objective changes, AUTO/manual endpoints, strip parameters, view flags, and project loading. Keep up to 100 geometry history states. Recompute graph, boundary, routing, and electrical summary after every accepted relevant mutation while keeping rejected operations non-destructive.

## Task 9 — Responsive SVG editor UI

Files: `src/app/editor-ui.js`, `src/app/main.js`, `src/styles.css`, `src/template.html`, `tests/ui-structure.test.js`.

Render placed modules, one green `+` control on each free face, merged corridor, lower candidates, selection, START/END, route layers, repeated segments, DATA arrows, diagnostics, and route playback. Support mouse/touch pan, wheel/pinch zoom, Fit, endpoint picking, JSON/SVG file actions, responsive layout down to approximately 320 CSS px, and 44 px primary touch targets. Route arrowheads use the reduced-size markers approved after UI review.

## Task 10 — Standalone packaging and reference example

Files: `scripts/build.js`, `scripts/verify-standalone.js`, `examples/reference-construction.json`, `README.txt`, `tests/reference-construction.test.js`, generated `Hex_Router_Designer.html`.

Build by inlining `src/styles.css` and all source modules in dependency order. Static verification rejects network URLs, external scripts/stylesheets, dynamic imports, fetch/XHR/WebSocket, and unresolved placeholders, and verifies required stable UI controls. The reference eight-module construction must load, produce at least two lower candidates, AUTO-select endpoints, and return one continuous trail that covers every unique corridor edge.

## Final verification

Run from the repository root:

```bash
npm test
npm run build
npm run verify
git status --short
```

Expected: all tests pass; the standalone HTML builds; verifier confirms the artifact is self-contained; after committing the generated artifact the tree is clean.

Acceptance also includes opening `Hex_Router_Designer.html` directly from `file://`, adding modules one-by-one through free faces, rejecting a disconnecting deletion, verifying pan/zoom/Fit, AUTO/manual endpoint selection, route playback, JSON round-trip, independent SVG export, and narrow/mobile layout behavior.
