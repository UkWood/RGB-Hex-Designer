# PDF assembly worksheet for continuous RGB strip runs

## Purpose
Add a dedicated worksheet page to the existing downloadable PDF so the user can preassemble continuous segments of RGB LED strip along the solution's DATA route.

## Source of truth
- Read the *ordered* `snapshot.solution.traversals`, not the unordered physical-edge list or summary counts.
- A traversal with `repeat !== true` is LED strip (first physical pass).
- A traversal with `repeat === true` is a DATA jumper wire. It ends the current continuous strip run; any later non-repeat traversal starts a new run.
- Consecutive wire traversals do not produce empty strip runs.
- A route without wire traversals yields exactly one run (provided it has LED edges).
- Each run counts physical edge/LED-strip sections, not individual LEDs. Counts sum to the number of unique physical edges.
- Edge numbers on the schematic are assigned by first encounter in route order. Display each run's edge-number range so a builder can correlate the table with the schematic.

## Worksheet
- Append a new, separate A4 landscape page **after** the schematic and existing parameter/specification pages.
- Heading: «Ведомость составных участков RGB-ленты».
- Columns: run order number, number of RGB strip sections (physical edges), schematic edge-number range.
- Summary: number of runs and total RGB strip sections.
- If there are many runs, create as many additional worksheet-only pages as needed, with repeated headers and page counters.
- Keep the current PDF download path, file name, first schematic page, parameter sheet, and repeat-wire specification unchanged.

## Verification
- Synthetic route tests for no wires, middle wires, multiple consecutive wires, leading/trailing wires, empty route.
- Actual editor-state route: total strip-run sections equals physical-edge count.
- Render test: a dedicated worksheet page is present, table data and counts are drawn, and long tables paginate.
- Existing npm test/build/verify and downloadable standalone HTML must continue to pass.

## Scope
No changes to routing, LED count, GyverTwink export, project JSON, screen controls, or electrical calculations.
