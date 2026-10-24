# GyverTwink export design

**Source requirement:** user-supplied `designer-export-task.md` dated 2026-10-24.

## Intent

Add a second JSON export for the GyverTwink project. The Designer remains the only place that computes hex geometry, route order, orientation, START/END, and LED positions. GyverTwink receives a ready-to-render ordered map and does not recalculate the route or know about hexagons.

## Export contract

- Add `Экспорт для GyverTwink` next to `Сохранить JSON`.
- Download `gyvertwink-map.json`.
- Do not change `ProjectIO` or project format v3.
- If no routable solution exists, show exactly `Сначала создайте трассируемую схему.` and do not download.
- Format version: `gyvertwink_map: 1`, `unit: "mm"`.
- Fields: `project.name`, `led_count`, `width_mm`, `height_mm`, `start`, `end`, ordered `leds`, unique-edge `outline`.
- X grows right, Y grows down. Orientation is already applied. Vertex bounds are rebased to the top-left and coordinates are rounded to 0.1 mm without `-0`.
- Each traversal contributes exactly `segmentsPerEdge` LEDs at fractions `k / (n + 1)` along the directed edge.
- `strip.edgeMm` is the geometric edge length.
- The export module is pure UMD code depending only on `GeometryBuilder`.

## Repeated traversals

The export API supports `repeatOffsetMm`. The pure builder keeps the task-file default of `0` for deterministic reference output. The actual UI export calls the builder with a fixed **1.0 mm** repeat offset, per the user's additional instruction that repeated traversals must be written with a small separation so their LED points do not lie exactly on top of one another. The p-th repeated traversal is shifted left relative to its travel direction by `p * repeatOffsetMm`; LED count and ordering do not change.

## Integration

- Bundle `src/core/gyvertwink-export.js` after `geometry-builder.js`.
- Install `GyverTwinkUI` after `V3UI`; it inserts `export-gt-btn` immediately after `save-json-btn` in the final responsive project-actions header.
- Download compact JSON through a local Blob/object-URL flow.
- Extend standalone verification and README.
- Do not change routing, numbering, PDF, electrical calculations, or project persistence.

## Customer golden fixture

The supplied 11-hexagon project is stored as `examples/hex-router-project_1.json`. With `repeatOffsetMm: 0` it must match `tests/fixtures/example-gyvertwink-map.json` byte-for-byte and the task reference values:

- 54 unique edges;
- 63 traversals, 9 repeats;
- START id 32, END id 34;
- `edgeMm = 100`;
- 378 LEDs;
- pointy bounds 866 × 800 mm;
- START (519.6, 650), END (692.8, 750);
- first LED [507.2, 642.9], last LED [705.2, 757.1];
- first outline segment [86.6, 600, 173.2, 650];
- flat bounds 800 × 866 mm, START (50, 692.8), END (150, 692.8).

## Tests

Required behavior is covered with Node tests for the exact customer golden fixture, empty/invalid state, single-hex and multi-hex projects, pointy/flat orientation, deterministic output, closed START=END routes, offset vs no-offset behavior, LED count/order, finite/nonnegative geometry, outline uniqueness, and standalone/UI integration.
