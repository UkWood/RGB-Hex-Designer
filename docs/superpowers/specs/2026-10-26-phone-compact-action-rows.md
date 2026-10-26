# Phone compact action rows

## Intent
Improve the portrait-smartphone layout so the most-used editor and project actions stay on single compact rows instead of wrapping.

## Goals
- At phone widths (`max-width: 760px`), keep `Вписать`, `AUTO`, `START`, `END` in one row.
- At phone widths, keep project actions in one row with visible labels `Сохранить`, `Открыть`, `GyverTwink`, `PDF`.
- Preserve all existing button IDs, handlers, accessibility labels/titles, and behavior.
- Preserve current tablet/desktop layout and wording where practical; the compact wording is specifically for the phone composition.

## Non-goals
- No routing, endpoint, JSON, PDF, GyverTwink export, or animation behavior changes.
- No new icon library or dependency.
- No redesign of the Parameters drawer.

## Constraints
- Touch targets should remain usable on a narrow portrait phone.
- Existing controls must be moved/relabelled rather than duplicated.
- The four project actions must be present in `.project-actions` after GyverTwink UI installation.

## Approaches considered
1. **Mobile CSS + existing DOM controls (chosen).** Add a dedicated phone action group for `Вписать/AUTO/START/END`, keep existing nodes and handlers, and use a four-column mobile grid for project actions. Minimal risk and preserves behavior.
2. Duplicate mobile-only controls and hide desktop controls. Rejected because it duplicates IDs/handlers and risks mode state divergence.
3. Rebuild the whole header/toolbar for mobile. Rejected as unnecessary scope and higher regression risk.

## Accepted design
- Reparent `fit-btn` together with the existing endpoint controls into a `.phone-primary-tools` group that remains inline at phone widths.
- On `max-width:760px`, render that group as four equal compact cells with reduced horizontal padding/font size while retaining the global 44px minimum height.
- Normalize project action labels to `Сохранить`, `Открыть`, `GyverTwink`, `PDF` and keep their existing IDs/input.
- On `max-width:760px`, render `.project-actions` as a four-column grid occupying the available header width.
- Keep all action behavior unchanged.
