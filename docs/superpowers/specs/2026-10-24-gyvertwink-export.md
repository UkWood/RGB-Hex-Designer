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
- Add `export-gt-btn` to the base file actions and move it into the responsive header project actions with Save/Open/PDF.
- Download compact JSON using the existing browser download helper.
- Extend standalone verification and README.
- Do not change routing, numbering, PDF, electrical calculations, or project persistence.

## Tests

Required behavior is covered with Node tests for empty/invalid state, single-hex and multi-hex projects, pointy/flat orientation, deterministic output, closed START=END routes, offset vs no-offset behavior, LED count/order, finite/nonnegative geometry, outline uniqueness, and standalone/UI integration.

The task file also names a customer fixture `hex-router-project_1.json` with 11 hexagons and a golden output. That JSON file is not present in the current conversation, Library, repository, or retrievable prior project context, so its exact golden-byte regression cannot be created without inventing data. The implementation must remain compatible with adding that fixture later without code changes.