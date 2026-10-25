# Repeat-wire implementation rulings

- Ruling: keep route optimization unchanged. Repeat traversals remain route segments because they still represent physical jumper wiring and remain relevant to minimizing/visualizing the DATA route.
- Ruling: keep `totalLengthM` as a compatibility alias of full route length, add explicit `routeLengthM` and `ledStripLengthM`, and stop presenting `totalLengthM` as LED-strip length.
- Ruling: power uses nominal LED-strip length derived from exact segment count (`ledCount / ledPerM`), so mechanical edge correction cannot create electrical load.
- Ruling: retire the old 378-LED byte-golden fixture because it encodes behavior now explicitly declared incorrect; replace it with deterministic customer-project invariants for 324 LEDs and route-order preservation.
