# Wire-only repeat traversals

## Intent

A repeated route traversal is not a second LED-strip pass. It is only a wire jumper used to preserve one continuous DATA route through all physical edges.

## Domain rules

- Routing and route optimization stay unchanged. `solution.traversals` still contains every traversal and `traversal.repeat === true` still marks later visits of an already visited physical edge.
- Every physical graph edge carries LED strip exactly once.
- A first/non-repeat traversal contributes `segmentsPerEdge` LEDs. A repeat traversal contributes **0 LEDs**.
- Exact construction LED count is `uniqueEdgeCount * segmentsPerEdge`.
- Repeat traversals remain visible in route diagrams, animation, repeat statistics and edge specifications because they describe real jumper wiring.

## Electrical model

Keep geometry, LED strip and jumper wire as separate quantities:

- `uniqueLengthM = uniqueEdgeCount * edgeMm / 1000` — geometric length of all unique physical edges.
- `repeatLengthM = repeatCount * edgeMm / 1000` — jumper-wire length caused by repeated traversals.
- `routeLengthM = uniqueLengthM + repeatLengthM` — total DATA route length including jumpers.
- `ledCount = uniqueEdgeCount * segmentsPerEdge` — exact number of LEDs.
- `ledStripLengthM = ledCount / ledPerM` — actual nominal LED-strip length; equivalently `uniqueEdgeCount * baseEdgeMm / 1000` when strip inputs are consistent.
- `powerW = ledStripLengthM * wattsPerM`; current and recommended PSU are derived from this power.
- Keep `ledCountApprox` as a compatibility alias of exact `ledCount`.
- Keep legacy `totalLengthM` as an alias of `routeLengthM`, but do not label it as LED-strip length in user-facing output.

The mechanical `edgeCorrectionMm` changes geometry/jumper span, but it does not create or remove LED segments and therefore does not change `ledCount` or nominal LED-strip power.

## GyverTwink export

- Preserve format version `gyvertwink_map: 1` and all existing fields.
- Emit LED coordinates only for the first/non-repeat traversal of each physical edge, in route order.
- Skip repeat traversals completely when building the `leds` array.
- `led_count === leds.length === graph.edges.length * strip.segmentsPerEdge`.
- `outline`, START/END, orientation and dimensions stay unchanged.
- The previous repeat-pass LED offset is removed; there are no repeated-pass LEDs to offset.
- For `examples/hex-router-project_1.json`: 54 unique edges × 6 LEDs = **324 LEDs**; the 9 repeat traversals contribute zero.

## User-facing statistics and exports

Editor metrics, SVG and PDF must distinguish LED strip from jumper wiring:

- show exact `LED` count (no `≈`),
- show `LED-лента` using `ledStripLengthM`,
- show repeat jumper length as `Провод повторов`,
- optionally show total `Маршрут` using `routeLengthM`,
- power/current/PSU must reflect LED strip only.

## Non-goals

Do not change project JSON format v3, geometry, endpoint selection, route optimization, edge numbering, route numbering, or the visual indication of repeat traversals.