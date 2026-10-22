# Project Metadata, Dynamic Numbering and PDF Export Design

## Goal

Extend RGB Hex Designer with project metadata, corrected physical edge length, target dimensions, dynamic hexagon/edge numbering, manual closed-loop routing (`START = END`), automatic fit-on-growth, JSON v3 persistence, and a print-quality PDF-only export. User-facing SVG export is removed.

## Scope and terminology

- User-facing term **«Сторона»** is replaced by **«Ребро»** everywhere it refers to a physical strip segment of a hexagon.
- A physical **edge** is a unique graph edge between two geometry vertices. If two neighboring hexagons share a side, that shared side is one physical edge and receives one edge number.
- Hexagon numbers and edge numbers are **derived display numbers**, not persistent identifiers. They may be recalculated after geometry changes, route changes, endpoint changes, or orientation changes.
- Existing internal axial coordinates and graph IDs remain implementation details and are not exposed as user-facing numbering.
- SVG remains allowed internally as vector markup inside the print view if useful, but **there is no SVG export button or SVG file download**.

## Project metadata and new inputs

### Project name

Add a text field at the very top of the application:

- Label: `Наименование проекта`.
- Default: empty string.
- Used in the application, JSON, PDF title/header, and suggested PDF filename.
- If empty, PDF may display `Без названия` rather than inventing a project name.

### Required dimensions

Immediately after the orientation control add two numeric inputs:

- `Требуемая ширина, мм`
- `Требуемая высота, мм`

Rules:

- Each field may be empty or a finite positive number.
- The target frame is shown only when both values are finite and > 0.
- Partial values are preserved in application state and JSON but do not render a target rectangle until both are valid.
- The target rectangle is centered on the exact center of the actual system bounding rectangle.
- Target dimensions do not constrain placement and do not block adding hexagons. They are a visual design reference only.

### Edge length correction

In section `Лента и питание`, replace user-facing side terminology with edge terminology and add:

- `Сегментов на ребро`
- `LED/м`
- `Базовая длина ребра, мм` — read-only
- `Коррекция длины ребра, мм`
- `Итоговая длина ребра, мм` — read-only

Definitions:

`baseEdgeMm = segmentsPerEdge * 1000 / ledPerM`

`edgeMm = baseEdgeMm + edgeCorrectionMm`

Rules:

- `segmentsPerEdge` is a positive integer.
- `ledPerM` is finite and > 0.
- `edgeCorrectionMm` is any finite number, including negative values and zero.
- `edgeMm` must remain > 0. Inputs that would make it <= 0 are rejected without corrupting the current state.
- Default correction is `0`.

The corrected `edgeMm` is the single physical edge length used by:

- all world geometry;
- actual construction width/height;
- route length;
- repeated-route length;
- approximate LED count;
- power/current/PSU calculations;
- START–END physical distance;
- endpoint ranking where physical distance is part of the ranking;
- PDF dimensions and calculations.

## Actual and target dimension overlays

### Actual dimensions

Keep the current thin gray unfilled actual bounding rectangle. It is derived strictly from outermost hexagon vertices using corrected `edgeMm`, excluding labels, markers, route arrows, add buttons and other annotations.

Show the actual width and height at the centers of all four sides:

- width above and below;
- height left and right;
- labels stay horizontal.

### Target dimensions

When both target dimensions are valid, draw a thin red unfilled rectangle:

- center exactly coincides with the center of the actual gray dimension rectangle;
- width = required width in mm;
- height = required height in mm;
- show required width above and below;
- show required height left and right;
- labels stay horizontal;
- target frame is visually distinguishable from the gray actual frame without obscuring the route.

Both actual and target frames participate in fit calculations and are included on PDF page 1.

## Dynamic numbering

### Edge numbering

Edge numbering is recalculated from the current solved route.

Algorithm:

1. Iterate route traversals in exact START→END order.
2. Each traversal identifies one unique physical graph edge.
3. The first time an edge is encountered, assign the next sequential display number starting at `1`.
4. Later traversals of the same edge reuse the number assigned on first encounter.
5. Every unique graph edge must therefore receive exactly one number because the route covers every graph edge.

This numbering may change whenever route order changes.

### Hexagon numbering

Hexagon numbering is recalculated from the current START and current solved route. The intent is: the farther a hexagon is from START, the higher its number should generally be.

For each hexagon compute:

1. **Primary key — shortest graph distance from START:** minimum number of physical graph edges from the START vertex to any of the six vertices belonging to that hexagon.
2. **Secondary key — first route encounter:** earliest traversal index at which the route traverses an edge belonging to that hexagon.
3. **Final tie-break — current visual position:** top-to-bottom, then left-to-right using the current orientation/world geometry.

Sort ascending by these keys and assign `1..N`.

Consequences:

- numbering is derived, not stored;
- geometry edits may renumber all hexagons;
- START/END changes may renumber all hexagons;
- route changes may renumber equal-distance hexagons;
- orientation changes may change the final tie-break and may therefore renumber hexagons.

## START and END on the same vertex

Manual endpoint mode must allow START and END to be assigned to the same valid lower-boundary vertex.

Rules:

- AUTO mode continues to choose two distinct lower-boundary vertices.
- Manual mode accepts `startId === endId`.
- A coincident manual pair requests a closed Chinese Postman / Route Inspection circuit starting and ending at that vertex.
- Physical START–END separation is `0`.
- UI and PDF render one combined marker and label: `START / END`.
- JSON preserves the identical START and END vertex descriptors.
- Orientation or geometry changes still invalidate a manual endpoint if that vertex is no longer a valid lower-boundary point; existing fallback-to-AUTO behavior remains.

## Edge specification

The PDF specification contains one row for every unique physical edge, sorted by dynamic edge number.

Columns:

1. `№ ребра`
2. `Дополнительные проходы`

For each edge:

- count the number of route traversals using that edge;
- `additionalPasses = traversalCount - 1`;
- if `additionalPasses === 0`, render an empty cell;
- if the route uses an edge twice, render `1`;
- three times → `2`;
- and so on.

Do not duplicate shared edges for neighboring hexagons. Do not include axial coordinates or per-hexagon side numbers in this specification.

## Main UI changes

### Top block

Order:

1. `Наименование проекта`
2. existing orientation control
3. `Требуемая ширина, мм`
4. `Требуемая высота, мм`
5. remaining existing controls

### Number display controls

Provide independent display toggles for:

- `№ шестигранников`
- `№ рёбер`
- `№ шагов маршрута`

Hexagon and edge numbers are calculated from the current route and are available to both the workspace and PDF renderer. Existing route-step numbering behavior remains centered on each traversal segment.

### Terminology migration

All user-facing labels, legends and print content should say `Ребро` rather than `Сторона` when describing a physical graph edge. Internal function/field names may be migrated incrementally if changing them is useful for clarity, but compatibility must not be sacrificed solely for a rename.

## Fit behavior

Current explicit `Вписать` behavior remains: fit all visible scene content with at least 20 px screen-space margin.

Orientation changes continue to invoke the same full-scene fit.

### Automatic fit when adding a hexagon

After `ADD_HEX` and rerender:

1. Calculate the screen-space bounding box of the complete visible scene using the same inclusion rules as `Вписать`.
2. If the entire scene remains within the workspace with at least the normal visibility margin, preserve the user's current pan/zoom.
3. If any visible element is clipped or outside the workspace, invoke exactly the same fit calculation as `Вписать`.

The complete visible scene includes at least:

- hexagon geometry;
- route and arrows;
- START/END marker(s) and labels;
- hexagon, edge and route-step numbers when enabled;
- actual gray dimension frame and labels;
- target red dimension frame and labels when enabled;
- visible add controls.

Deleting a hexagon does not automatically zoom in; the user can press `Вписать` if desired.

## PDF-only export

### User interaction

Replace/remove the user-facing SVG export control with `Экспорт PDF`.

The application remains standalone and offline. No server is required.

PDF export is implemented as a dedicated printable document opened by the application and sent to the browser print dialog (`window.print()`). On Chrome/Chromium the user chooses `Сохранить как PDF`. This avoids an external PDF dependency, preserves vector quality and Cyrillic fonts, and works offline.

Suggested filename uses the project name when available, sanitized for filesystem use.

### Page format

Use print CSS with A4 landscape pages and consistent printable margins. The document must be useful both when saved to PDF and when sent to a physical printer.

The export is **at least two pages**. Long specifications may create pages 3, 4, etc. Text must not be shrunk to an unreadable size merely to force two pages.

### Page 1 — scheme

Page 1 contains:

- project name as title;
- orientation;
- full vector construction diagram fitted to the printable area;
- hexagon outlines;
- route and repeat styling;
- route direction arrows;
- START / END or combined START / END marker;
- dynamic hexagon numbers when enabled;
- dynamic edge numbers when enabled;
- route-step numbers when enabled;
- actual gray dimension rectangle and four dimension labels;
- target red dimension rectangle and four dimension labels when valid.

The page-1 fit must include all visible annotations and preserve a print margin rather than cropping them.

### Page 2 and following — parameters and specification

Page 2 starts with:

- project name;
- section `Параметры и расчёт` in a compact four-column layout;
- all data formerly intended for the SVG legend, plus the new fields.

At minimum include:

- actual dimensions;
- required dimensions when present;
- orientation;
- number of hexagons;
- number of unique edges;
- segments per edge;
- LED/m;
- base edge length;
- edge length correction;
- corrected edge length;
- W/m;
- voltage;
- PSU reserve;
- repeat traversal count;
- unique strip length;
- repeat strip length;
- total strip length;
- approximate LED count;
- power;
- current;
- recommended PSU power;
- repeat percentage;
- START–END distance;
- electrical connection note (`DATA: START → END; +V и GND подаются с обоих концов`) adapted appropriately when START = END.

Below the legend place section `Спецификация рёбер` with the table described above.

Use a semantic HTML table with `<thead>` so browsers can repeat the column header when the table spans additional printed pages. Rows must not be intentionally split across page boundaries when print CSS can avoid it.

## JSON v3

Increment project format version from `2` to `3`.

Canonical v3 shape extends the existing format with:

```json
{
  "version": 3,
  "project": {
    "name": ""
  },
  "hexagons": [],
  "layout": {
    "orientation": "pointy",
    "required_width_mm": null,
    "required_height_mm": null
  },
  "routing": {
    "endpoint_mode": "auto",
    "start": null,
    "end": null,
    "objective": "min_repeats"
  },
  "strip": {
    "segments_per_edge": 6,
    "led_per_m": 60,
    "edge_correction_mm": 0,
    "watts_per_m": 18,
    "voltage": 12,
    "psu_reserve_percent": 20
  },
  "view": {
    "show_hex_numbers": true,
    "show_edge_numbers": false,
    "show_route_numbers": false,
    "show_diagnostics": false
  }
}
```

Exact field names above are normative for v3.

### Migration

- v1 and v2 files continue to load.
- Existing `segments_per_side` maps to v3 `segments_per_edge`.
- Existing side length derivation is treated as the base edge length.
- Migrated correction defaults to `0`.
- Migrated project name defaults to empty string.
- Migrated required dimensions default to `null`.
- Existing `show_numbers` maps to `show_hex_numbers`.
- `show_edge_numbers` and `show_route_numbers` default to `false` unless a compatible legacy field exists.
- Saving any loaded legacy project emits canonical v3.
- Manual legacy endpoint descriptors remain compatible.

Validation must reject malformed v3 without partially mutating the current project.

## Architecture

Keep the application dependency-free and standalone. Add focused units rather than expanding one exporter into a mixed responsibility module.

Recommended responsibilities:

- **EditorState** — owns project name, required dimensions, edge correction, view flags, routing state and recomputation.
- **ElectricalCalculator** — derives base/corrected edge length inputs and all physical/electrical calculations from corrected edge length.
- **DisplayNumbering** (new core module) — derives edge numbering, hexagon numbering and per-edge traversal counts from graph + route + START + orientation.
- **Dimension overlay** — renders actual and target rectangles in the workspace.
- **PrintExporter / PrintView** (new app/core unit) — produces the printable HTML document, including an inline vector page-1 diagram and page-2+ legend/table. It does not own route or numbering algorithms; it consumes derived data.
- **ProjectIO** — owns v1/v2→v3 migration, v3 validation and serialization.

The old `SvgExporter` is no longer a public export path. Its reusable diagram-drawing code may be extracted into a neutral vector renderer; otherwise remove it from the standalone build once no tests or UI paths depend on it.

## Data flow

1. User changes project/geometry/routing/electrical inputs.
2. `EditorState` validates the action.
3. `edgeMm` is recomputed from segments, density and correction.
4. Geometry and boundary analysis rebuild using the corrected physical scale.
5. Route solution rebuilds as needed.
6. Electrical calculations use the same corrected edge length.
7. Display numbering derives from the current solution.
8. UI renders the workspace and dimension overlays.
9. PDF export snapshots the same state + derived numbering/calculations and builds a print document. It must not independently recalculate with divergent formulas.
10. JSON serialization stores only canonical project inputs/settings/descriptors, not derived display numbers.

## Error handling

- Invalid numeric edits are rejected and leave the last valid state intact.
- A correction that makes corrected edge length <= 0 is rejected.
- Invalid target dimensions are not rendered as a red frame; partial values remain editable/storable only when representable as valid nullable fields.
- Invalid manual endpoints after geometry/orientation changes retain current fallback-to-AUTO warning behavior.
- A blocked popup/print window should surface a clear message telling the user to allow the print window and retry `Экспорт PDF`.
- PDF export is disabled or reports a clear message when no routeable construction exists.
- JSON load remains transactional: parse/validate first, mutate state only after success.

## Testing strategy

Use TDD and preserve all existing regression tests.

Add tests for:

1. corrected edge formula including positive/zero/negative corrections and rejection of nonpositive corrected length;
2. corrected geometry bounds and electrical calculations;
3. target frame centering and orientation-aware rendering;
4. dynamic edge numbering by first route encounter and stable number reuse on repeated traversals;
5. dynamic hexagon numbering by START distance, route encounter and visual tie-break;
6. numbering recomputation after geometry, orientation and endpoint changes;
7. manual `START = END` acceptance, closed route continuity, zero separation and combined marker;
8. AUTO still selecting distinct endpoints;
9. edge specification rows and blank additional-pass cells for single traversal;
10. automatic fit only when add operation pushes visible content outside the viewport;
11. PDF print document page-1 content, four-column calculations, specification table and continuation-friendly markup;
12. absence of user-facing SVG export control;
13. JSON v3 round trip for project name, target dimensions, correction and new view flags;
14. v1/v2 migrations to v3 defaults;
15. standalone build/verification still passing with all required controls and no network dependency.

Browser print/PDF byte rendering is environment-dependent; automated tests should verify the deterministic printable HTML/SVG structure and print CSS. Final manual acceptance should save the document as PDF in Chrome and inspect pagination, Cyrillic text, vector quality and table continuation.

## Non-goals

- Target dimensions do not automatically generate or optimize a hexagon layout.
- No server-side PDF generation.
- No external cloud service.
- No persistence of display numbers in JSON.
- No return of user-facing SVG export.
- No automatic zoom-in after deletion.
