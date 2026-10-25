# GyverTwink export design

**Source requirement:** user-supplied `designer-export-task.md` dated 2026-10-24.

> **Superseded rule:** On 2026-10-25 the user clarified that repeated route traversals are wire-only jumpers and contain no LEDs. The current authoritative behavior is defined in `docs/superpowers/specs/2026-10-25-repeat-pass-wire-only.md`. The original repeat-LED offset/golden behavior described in the initial task is intentionally replaced by that clarification.

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
- Each **non-repeat** traversal contributes exactly `segmentsPerEdge` LEDs at fractions `k / (n + 1)` along the directed edge.
- Repeat traversals contribute zero LEDs and remain part of the DATA route only as wire jumpers.
- `strip.edgeMm` is the geometric edge length.
- The export module is pure UMD code depending only on `GeometryBuilder`.

## Repeated traversals

A repeated traversal is not another LED-strip pass. It is only a conductor used to preserve continuity of the DATA route. No LED coordinates are emitted for `traversal.repeat === true`, and no repeat offset is required.

## Integration

- Bundle `src/core/gyvertwink-export.js` after `geometry-builder.js`.
- Install `GyverTwinkUI` after `V3UI`; it inserts `export-gt-btn` immediately after `save-json-btn` in the final responsive project-actions header.
- Download compact JSON through a local Blob/object-URL flow.
- Extend standalone verification and README.
- Do not change routing, numbering or project persistence.

## Customer regression fixture

The supplied 11-hexagon project is stored as `examples/hex-router-project_1.json`. Current reference values are:

- 54 unique edges;
- 63 traversals, 9 repeats;
- START id 32, END id 34;
- `edgeMm = 100`;
- **324 LEDs = 54 unique edges × 6 LEDs**;
- pointy bounds 866 × 800 mm;
- START (519.6, 650), END (692.8, 750);
- first LED [507.2, 642.9];
- first outline segment [86.6, 600, 173.2, 650];
- flat bounds 800 × 866 mm, START (50, 692.8), END (150, 692.8).

The obsolete 378-LED golden file was removed because it encoded LEDs on nine repeat-wire traversals, which is now explicitly incorrect.

## Tests

Required behavior is covered with Node tests for the customer project, empty/invalid state, single-hex and multi-hex projects, pointy/flat orientation, deterministic output, closed START=END routes, exact physical-edge LED count/order, finite/nonnegative geometry, outline uniqueness, and standalone/UI integration.
