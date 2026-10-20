# Hex Router Designer v1 — Design Specification

Date: 2026-10-20
Status: Approved design, pending user review of written specification

## 1. Purpose

Hex Router Designer is a standalone browser application for designing an arbitrary connected construction from hexagonal RGB LED-ring modules, automatically deriving the shared routing corridor, selecting valid lower external start/end connection points, calculating an optimal continuous LED-strip route, and estimating strip length, LED count, power, current, and recommended PSU capacity.

The application must run outside ChatGPT as a self-contained HTML file without a server, installation, or internet connection.

## 2. Primary user workflow

1. Open `Hex_Router_Designer.html` in a modern browser.
2. Add hexagonal modules on a hex grid.
3. Maintain one connected construction only.
4. Let the application derive the merged routing corridor from unique module sides.
5. Use AUTO mode to choose optimal lower external START and END points, or manually override either point.
6. Calculate the optimal continuous route that covers the complete corridor.
7. Inspect repeated segments, if topologically unavoidable.
8. Review LED-strip and electrical calculations.
9. Save the editable project to JSON.
10. Export the current technical scheme to SVG.

## 3. Geometry and editor model

### 3.1 Hex grid

Use a pointy-top axial hex-grid model with integer coordinates `(q, r)`.

Each placed module is stored only by axial coordinates. Pixel positions are derived at render time, so projects remain stable across screen sizes and zoom levels.

### 3.2 Connectivity constraint

The construction must always consist of exactly one connected component.

Rules:
- The first hex may be placed freely.
- Every subsequent hex may only be placed in one of the six neighboring axial cells of the current construction.
- A placed hex may be deleted only if the remaining construction stays connected.
- The last remaining hex may be deleted through the explicit Clear command.
- The UI must reject invalid additions/removals immediately and leave the previous valid state unchanged.

### 3.3 Editor interactions

Required interactions:
- Tap/click an available neighboring cell to add a module.
- Tap/click a placed module to select it.
- Delete the selected module if connectivity remains valid.
- Undo / Redo.
- Clear construction.
- Pan and zoom.
- Fit-to-construction / recenter.
- Optional module numbering toggle.

Touch interaction must remain usable on tablets and phones.

## 4. Corridor graph derivation

The routing graph is rebuilt after every valid geometry change.

Pipeline:

`Hex modules -> geometric hex sides -> unique undirected segments -> graph vertices -> graph edges`

Rules:
- A side shared by two adjacent modules exists once in the graph.
- Outer sides belong to one module.
- Shared sides are marked as shared corridor segments.
- Coincident geometric endpoints are deduplicated into one graph vertex.
- The graph is undirected for route optimization; DATA direction is assigned only after the route is ordered from START to END.

This graph is the single source of truth for routing and calculations.

## 5. External boundary and lower connection zone

### 5.1 External boundary

A corridor edge is part of the external module boundary if it belongs to exactly one hex module.

Candidate connection points must be vertices on this external boundary.

### 5.2 Lower-zone rule

START and END are allowed only on the lower external part of the construction.

The lower zone is defined dynamically from the bounding box of the external boundary:
- Let `y_min` be the topmost external vertex and `y_max` the bottommost external vertex in screen-independent geometry coordinates.
- Let construction height be `H = y_max - y_min`.
- A boundary vertex is a valid lower candidate if `y >= y_max - 0.25 * H`.
- For a single flat row or very small `H`, all lowest boundary vertices within one geometric tolerance of the minimum floor level are valid candidates.

The UI highlights all valid lower candidates.

## 6. START / END selection

### 6.1 AUTO mode

AUTO mode evaluates valid pairs `(START, END)` where START != END.

Ranking priority:
1. Minimize total number of repeated corridor segments.
2. Minimize repeated shared corridor segments.
3. Minimize total route length.
4. If still tied, maximize geometric distance between START and END.

The best-ranked pair becomes active.

### 6.2 Manual override

The user may override START and/or END by clicking highlighted valid lower candidates.

Rules:
- Manual points must still satisfy the lower external boundary constraint.
- START and END must be different.
- Invalid choices are rejected without changing the previous valid selection.
- A Reset to AUTO command restores automatic selection.

Electrical meaning:
- START: `+V`, `GND`, `DATA IN`.
- END: `+V`, `GND` only.

## 7. Route optimization

### 7.1 Goal

Find one continuous open trail from START to END that covers every corridor edge at least once.

If an Euler trail exists, no edge is repeated.

If it does not exist, duplicate the minimum necessary set of graph edges so the augmented multigraph has exactly START and END as odd-degree vertices.

### 7.2 Algorithm

Use an open Route Inspection / Chinese Postman formulation:

1. Determine odd-degree vertices in the original graph.
2. Toggle parity for START and END.
3. Compute shortest paths between parity-defect vertices.
4. Find minimum-weight perfect matching over the parity-defect set.
5. Duplicate the graph edges belonging to matched shortest paths.
6. Build the augmented multigraph.
7. Generate an Euler trail from START to END using Hierholzer's algorithm.

### 7.3 Optimization weights

Two user-facing criteria are supported:

**A. Minimum repeat count**
- Base edge cost = 1.
- Primary objective: minimum number of duplicated segments.

**B. Avoid repeating shared sides**
- Outer edge base cost = 1.
- Shared corridor edge cost = large penalty + 1.
- This prioritizes moving unavoidable repeated passes away from shared sides whenever possible.

AUTO endpoint selection applies the ranking in section 6.1 after solving candidate pairs.

### 7.4 Route outputs

The optimizer returns:
- Ordered graph vertices.
- Ordered edge traversals.
- First-pass vs repeated-pass status per traversal.
- START and END.
- Number of repeated segments.
- Number of repeated shared segments.
- Total geometric route length.

## 8. Route visualization

Layers:
- Corridor base: neutral wide channel.
- Primary route: solid highlighted line.
- Repeated traversal: dashed secondary line.
- START marker: green or semantic start indicator.
- END marker: orange or semantic end indicator.
- DATA direction: arrows following the ordered trail.
- Optional segment-step numbering.
- Optional odd-degree diagnostic markers.

Controls:
- Previous step.
- Next step.
- Route step slider.
- Show full route.
- Animate route.
- Pause / restart animation.

The renderer must never imply a route outside the derived corridor graph.

## 9. Topology diagnostics

A diagnostics mode explains why repeated segments are or are not necessary.

Display:
- Odd-degree vertices in the original graph.
- Count of odd-degree vertices.
- Whether an Euler open trail exists for the selected START/END.
- Theoretical need for added duplicate paths.
- Which segments were duplicated by the optimizer.

This mode is explanatory only and does not alter the route.

## 10. Strip and electrical calculations

User inputs:
- Hex side length measured along the LED-strip centerline, mm.
- LED density, LEDs/m.
- Strip power density, W/m.
- Supply voltage: 5 V, 12 V, or 24 V.
- PSU reserve percentage, default 20%.

Derived values:
- Module count.
- Unique corridor edge count.
- Repeated traversal count.
- Unique corridor length.
- Added repeated length.
- Total installed LED-strip length.
- Approximate LED count.
- Total power.
- Total current at selected voltage.
- Recommended PSU power including reserve.
- Repeat percentage of total routed length.
- Geometric START-to-END separation.

Electrical guidance shown in-app:
- One controller drives DATA from START through the ordered addressable strip.
- `+V` and `GND` are injected at START and END from the same appropriately sized supply system.
- Controller ground must be common with strip ground.
- Separate branch fusing is recommended when appropriate.
- Two unrelated power supplies must not be paralleled onto the same power rail unless designed for current sharing.

The calculator is advisory and must not claim to replace electrical design verification.

## 11. Project persistence

### 11.1 JSON export

Project format version 1:

```json
{
  "version": 1,
  "hexagons": [
    {"q": 0, "r": 0},
    {"q": 1, "r": 0}
  ],
  "routing": {
    "endpoint_mode": "auto",
    "start": null,
    "end": null,
    "objective": "min_repeats"
  },
  "strip": {
    "side_mm": 100,
    "led_per_m": 60,
    "watts_per_m": 18,
    "voltage": 12,
    "psu_reserve_percent": 20
  },
  "view": {
    "show_numbers": true,
    "show_diagnostics": false
  }
}
```

Manual endpoint coordinates, when present, are stored as stable graph-boundary vertex descriptors derived from hex-grid geometry rather than raw screen pixels.

### 11.2 JSON import

On load:
- Validate JSON syntax and version.
- Validate axial coordinates.
- Reject duplicate cells.
- Validate that all modules form one connected component.
- Rebuild the corridor graph.
- Revalidate manual endpoints against the rebuilt lower boundary.
- If saved manual endpoints are no longer valid, fall back to AUTO and show a concise warning.

Malformed projects must never corrupt the current open project.

## 12. SVG export

Export a self-contained technical SVG containing:
- Hex module geometry.
- Corridor graph.
- Full ordered route.
- Repeated segments distinguished visually.
- START / END labels.
- DATA direction arrows.
- Optional module and route numbering according to current visibility settings.
- Compact calculation summary.

SVG must use vector geometry and remain readable when printed or scaled.

PNG export is explicitly out of scope for v1.

## 13. Application architecture

The standalone file remains one distributable HTML artifact, but code is organized into clearly separated modules/classes/functions:

### `HexGrid`
Owns axial coordinates, neighbors, add/remove validation, and serialization of placed modules.

### `GeometryBuilder`
Converts hex cells into deduplicated geometric vertices and unique corridor edges.

### `ConnectivityValidator`
Tests whether a proposed removal preserves one connected component.

### `BoundaryAnalyzer`
Finds external boundary edges/vertices and valid lower endpoint candidates.

### `EndpointSelector`
Evaluates AUTO pairs and validates manual overrides.

### `RouteOptimizer`
Computes shortest paths, matching, duplicated edges, and Euler trail.

### `ElectricalCalculator`
Computes strip length, LED count, power, current, and PSU recommendation.

### `ProjectIO`
Handles JSON validation, save, and load.

### `SvgExporter`
Builds a standalone technical SVG from current application state.

### `EditorUI`
Owns DOM rendering, mouse/touch interaction, pan/zoom, selection, undo/redo, route controls, and validation messages.

Dependencies flow inward from UI to pure geometry/routing/calculation modules. Core routing logic must not depend on DOM APIs.

## 14. Standalone delivery

Primary deliverable:

`Hex_Router_Designer.html`

Constraints:
- Works from `file://` by double-clicking.
- No server required.
- No installation required.
- No external JavaScript or CSS dependencies.
- No network access required.
- No browser storage is required for correct operation; Save/Load uses explicit files.

Optional distribution ZIP may contain:
- `Hex_Router_Designer.html`
- `README.txt`
- one example JSON project based on the original reference construction.

## 15. Error handling

User-visible validation must be concise and non-destructive.

Cases:
- Invalid module placement: reject and explain that only adjacent cells are allowed.
- Removal would disconnect construction: reject and highlight the selected module.
- No valid lower START/END pair: route calculation disabled with explanation.
- START == END: reject.
- Corrupt JSON: keep current project unchanged.
- Unsupported JSON version: reject with explicit version message.
- Route solver failure: preserve editor state and show diagnostic details without clearing the construction.
- Invalid numerical parameters: clamp or reject with a clear inline message; never display NaN/Infinity.

## 16. Testing

Minimum acceptance test set:

1. Single hex.
2. Two adjacent hexes.
3. Straight chain.
4. Zig-zag chain.
5. Compact cluster.
6. Branched shape.
7. Shape with internal shared sides and multiple junctions.
8. Original reference construction recreated in the editor.
9. Attempt to create a disconnected island.
10. Attempt to remove an articulation hex.
11. Undo and redo across add/remove actions.
12. AUTO endpoint selection.
13. Manual START override.
14. Manual END override.
15. Reset to AUTO.
16. Case where an Euler trail exists without repeats.
17. Case where repeats are unavoidable.
18. Compare minimum-repeat vs avoid-shared-side objectives.
19. Save JSON and reload with exact geometry restoration.
20. Load malformed JSON and confirm current project survives unchanged.
21. SVG export opens independently and matches current geometry/route.
22. Electrical calculations for 5 V, 12 V, and 24 V.
23. Responsive operation at approximately 320 px width.
24. Touch add/select/pan/zoom behavior.

## 17. Acceptance criteria

Version 1 is complete when:
- The user can build any finite connected hex-module arrangement supported by the editor canvas.
- Disconnected islands cannot be created.
- Deleting a module cannot silently break connectivity.
- The corridor graph exactly reflects unique module sides.
- START/END are restricted to valid lower external boundary points.
- AUTO mode selects the best pair using the defined ranking.
- Manual override works without violating constraints.
- The optimizer produces one continuous START-to-END traversal covering every corridor edge.
- Repeated segments are minimized according to the selected objective and displayed distinctly.
- All specified electrical calculations update from user inputs.
- JSON projects round-trip correctly.
- SVG export is self-contained and technically readable.
- The app runs offline as a standalone HTML file.

## 18. Explicit v1 non-goals

Not included in v1:
- Freeform non-grid hex placement.
- Multiple disconnected constructions in one project.
- Multiple controllers.
- Multiple independent DATA chains.
- Automatic wire-gauge sizing.
- Automatic fuse sizing.
- Voltage-drop simulation along individual strip segments.
- 3D mechanical layout.
- PNG export.
- Cloud storage or collaboration.
