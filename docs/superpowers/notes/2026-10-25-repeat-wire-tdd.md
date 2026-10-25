# Repeat-wire TDD notes

Tests were updated before production code.

Expected RED causes on the pre-fix implementation:
- electrical calculator still counts repeat route length as LED strip and power;
- GyverTwink exporter still emits LEDs for repeat traversals;
- editor/PDF/SVG still use `Итого ленты` / `LED ≈` and do not expose separate LED-strip vs repeat-wire metrics;
- GyverTwink UI still passes `repeatOffsetMm`.
